import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, VideoOff } from 'lucide-react';
import type {
  FaceDetection as MpFaceDetectionClass,
  Results as MpResults,
  Detection as MpDetection,
} from '@mediapipe/face_detection';
import { Button } from '@/shared/components/ui/Button';
import { OneEuroBoxFilter } from '../utils/oneEuroFilter';

type RecognitionLabel = 'match' | 'review' | 'unknown' | 'spoof';

type FaceResult = {
  bbox: { x1: number; y1: number; x2: number; y2: number };
  confidence: number;
  track_id?: number | null;
  label: RecognitionLabel;
  user_id?: string | null;
  user_name?: string | null;
  similarity?: number | null;
  liveness_score?: number | null;
  unknown_face_id?: string | null;
};

type StreamMessage = {
  mode?: string;
  faces: FaceResult[];
  image_width: number;
  image_height: number;
  inference_ms: number;
  frame_seq: number;
  camera_id?: string | null;
  error?: string;
  detail?: string;
};

type ServerFaceLabel = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: RecognitionLabel;
  user_name?: string | null | undefined;
  user_id?: string | null | undefined;
  similarity?: number | null | undefined;
  track_id?: number | null | undefined;
};

type TrackedBox = {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  firstSeenAt: number;
  lastSeen: number;
  lastLabel: ServerFaceLabel | null;
  lastLabelTime: number;
  hadServerMatch: boolean;
  lastSentAt: number;
};

type BBox = { x1: number; y1: number; x2: number; y2: number };

const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_BASE_URL || '/ai-api').replace(/\/$/, '');
const CAPTURE_MAX_WIDTH = Number(import.meta.env.VITE_FACE_DETECT_IMAGE_MAX_WIDTH || 960);
const CAMERA_ID = import.meta.env.VITE_FACE_RECOGNITION_CAMERA_ID || 'frontend-camera';
const WS_MODE = import.meta.env.VITE_FACE_RECOGNITION_WS_MODE === 'crop' ? 'crop' : 'stream';
const USE_CLIENT_CROP_MODE = WS_MODE === 'crop';

/** Stream mode: draw boxes from MediaPipe every frame; labels from server (IoU). Set VITE_STREAM_LOCAL_BOX_OVERLAY=false for server bboxes only (previous behaviour). */
const STREAM_USE_LOCAL_BOX_OVERLAY =
  !USE_CLIENT_CROP_MODE && import.meta.env.VITE_STREAM_LOCAL_BOX_OVERLAY !== 'false';

/** Min ms between full-frame WS sends in stream mode (server still dedupes to latest frame). Crop mode uses VITE_FACE_DETECT_INTERVAL_MS. */
const STREAM_SEND_INTERVAL_MS = Number(import.meta.env.VITE_STREAM_SEND_INTERVAL_MS ?? 50);

/** JPEG quality for recognition crops. Higher = better ArcFace similarity, more bandwidth. */
const JPEG_QUALITY = 0.92;
const MIN_SEND_GAP_MS = Number(import.meta.env.VITE_FACE_DETECT_INTERVAL_MS || 150);
const WS_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
/** IoU threshold when mapping server-side recognition response back to a client track. */
const IOU_MATCH_THRESHOLD = 0.15;
const LABEL_STALE_MS = 6000;
const TRACK_PERSIST_MS = 1200;
const TRACK_PERSIST_MS_UNLABELED = 450;
const TRACK_IOU_MATCH = 0.18;
/** Identity TTL — once a track is labeled (not unknown) we don't re-send until this expires. */
const TRACK_LABEL_TTL_MS = 5000;
/** Unknown verdict TTL — retry sooner because the user may step closer / improve lighting. */
const TRACK_UNKNOWN_RETRY_MS = 1200;
/** Crop request width (px) sent to server. 384 keeps enough detail for ArcFace at distance. */
const CROP_TARGET_WIDTH = 384;
/** Extra padding around face bbox before cropping (fraction of bbox side). */
const CROP_MARGIN_RATIO = 0.35;
/** Skip sending if face is smaller than this fraction of shorter video side. */
const MIN_FACE_SIDE_TO_SEND_FRAC = 0.05;
/** BlazeFace-full: balanced so we still pick up faces ~2-3 m away. */
const MP_MIN_DETECTION_CONFIDENCE = 0.5;

const FILTER_MIN_CUTOFF = 1.2;
const FILTER_BETA = 0.018;
const FILTER_DCUTOFF = 1.0;
/** Reject tiny / strip-like boxes (fraction of shorter video side). Lower => detects farther. */
const MP_MIN_FACE_SIDE_FRAC = 0.035;
/** Typical upright face width/height ratio. */
const MP_ASPECT_MIN = 0.55;
const MP_ASPECT_MAX = 1.75;


const IN_FLIGHT_TIMEOUT_MS = 3500;

const DETECTOR_IDLE_TIMEOUT_MS = 5000;
/** Don't draw the "Detecting…" label for brand-new tracks; wait for the first recognition. */
const NEW_TRACK_LABEL_GRACE_MS = 600;

const MEDIAPIPE_JS_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229';

function buildWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  const params = new URLSearchParams({ mode: WS_MODE });
  if (CAMERA_ID) params.set('camera_id', CAMERA_ID);
  return `${protocol}//${window.location.host}${AI_API_BASE_URL}/api/v1/ws/stream?${params.toString()}`;
}

function computeIoU(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
): number {
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  const union = areaA + areaB - inter;
  return union > 0 ? inter / union : 0;
}

function getStyle(label?: RecognitionLabel) {
  if (label === 'match') return { stroke: 'rgba(34, 197, 94, 0.95)', fill: 'rgba(22, 163, 74, 0.92)' };
  if (label === 'review') return { stroke: 'rgba(245, 158, 11, 0.95)', fill: 'rgba(217, 119, 6, 0.92)' };
  if (label === 'spoof') return { stroke: 'rgba(239, 68, 68, 0.95)', fill: 'rgba(220, 38, 38, 0.92)' };
  if (label === 'unknown') return { stroke: 'rgba(148, 163, 184, 0.95)', fill: 'rgba(51, 65, 85, 0.92)' };
  return { stroke: 'rgba(96, 165, 250, 0.88)', fill: 'rgba(37, 99, 235, 0.82)' };
}

function isPlausibleFaceBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  frameW: number,
  frameH: number,
): boolean {
  const bw = x2 - x1;
  const bh = y2 - y1;
  if (bw <= 0 || bh <= 0) return false;
  const shortSide = Math.min(frameW, frameH);
  if (Math.min(bw, bh) < shortSide * MP_MIN_FACE_SIDE_FRAC) return false;
  const ar = bw / bh;
  if (ar < MP_ASPECT_MIN || ar > MP_ASPECT_MAX) return false;
  return true;
}

function loadFaceDetectionGlobal(): Promise<typeof MpFaceDetectionClass> {
  const win = window as unknown as { FaceDetection?: typeof MpFaceDetectionClass };
  if (win.FaceDetection) return Promise.resolve(win.FaceDetection);

  return new Promise<typeof MpFaceDetectionClass>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-mp-face-detection]',
    );
    if (existing) {
      existing.addEventListener('load', () => {
        if (win.FaceDetection) resolve(win.FaceDetection);
        else reject(new Error('FaceDetection global missing after script load'));
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load face_detection.js')));
      return;
    }

    const script = document.createElement('script');
    script.src = `${MEDIAPIPE_JS_CDN}/face_detection.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.mpFaceDetection = 'true';
    script.onload = () => {
      if (win.FaceDetection) resolve(win.FaceDetection);
      else reject(new Error('FaceDetection global missing after script load'));
    };
    script.onerror = () => reject(new Error(`Failed to load ${script.src}`));
    document.head.appendChild(script);
  });
}

function getOverlayLabelText(
  matched: ServerFaceLabel | null,
  index: number,
  suppressDetecting: boolean,
): string | null {
  if (!matched) {
    if (suppressDetecting) return null;
    return `${index + 1}. Detecting…`;
  }
  const name =
    matched.user_name ||
    matched.user_id ||
    (matched.label === 'unknown' ? 'Unknown' : matched.label.toUpperCase());
  const sim =
    typeof matched.similarity === 'number'
      ? `${(matched.similarity * 100).toFixed(1)}%`
      : null;
  const trackId = matched.track_id ?? index + 1;
  return sim ? `${trackId}. ${name} ${sim}` : `${trackId}. ${name}`;
}

export const CameraStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<MpFaceDetectionClass | null>(null);
  const detectorInflightRef = useRef(false);
  const latestDetectionsRef = useRef<MpDetection[]>([]);
  const lastDetectionAtRef = useRef(0);
  const reinitInFlightRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastServerSeqRef = useRef(0);
  const lastSendTimeRef = useRef(0);
  const pendingResponseRef = useRef(false);
  const inFlightTrackIdRef = useRef<number | null>(null);

  const inFlightBboxRef = useRef<BBox | null>(null);
  const inFlightSentAtRef = useRef(0);
  const serverLabelsRef = useRef<ServerFaceLabel[]>([]);
  const serverLabelsTimeRef = useRef(0);
  const trackedBoxesRef = useRef<TrackedBox[]>([]);
  const trackFiltersRef = useRef<Map<number, OneEuroBoxFilter>>(new Map());
  const nextTrackIdRef = useRef(1);
  const isActiveRef = useRef(false);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disposeDetector = async (): Promise<void> => {
    const det = detectorRef.current;
    detectorRef.current = null;
    detectorInflightRef.current = false;
    latestDetectionsRef.current = [];
    if (!det) return;
    try {
      await det.close();
    } catch {
    }
  };

  const initMediaPipe = async (): Promise<void> => {
    try {
      const Ctor = await loadFaceDetectionGlobal();
      const detector = new Ctor({
        locateFile: (file: string) => `${MEDIAPIPE_JS_CDN}/${file}`,
      });
      detector.setOptions({
        model: 'full',
        minDetectionConfidence: MP_MIN_DETECTION_CONFIDENCE,
      });
      detector.onResults((results: MpResults) => {
        latestDetectionsRef.current = results.detections ?? [];
        detectorInflightRef.current = false;
        lastDetectionAtRef.current = performance.now();
      });
      await detector.initialize();
      detectorRef.current = detector;
      lastDetectionAtRef.current = performance.now();
    } catch (err) {
      console.warn('MediaPipe FaceDetection init failed — overlay falls back to server boxes only', err);
      detectorRef.current = null;
    }
  };

  const reinitDetector = async (): Promise<void> => {
    if (reinitInFlightRef.current) return;
    reinitInFlightRef.current = true;
    try {
      console.warn('Recreating MediaPipe FaceDetection after idle timeout');
      await disposeDetector();
      if (!isActiveRef.current) return;
      await initMediaPipe();
    } finally {
      reinitInFlightRef.current = false;
    }
  };

  const getOrCreateFilter = (id: number): OneEuroBoxFilter => {
    let f = trackFiltersRef.current.get(id);
    if (!f) {
      f = new OneEuroBoxFilter({
        minCutoff: FILTER_MIN_CUTOFF,
        beta: FILTER_BETA,
        dCutoff: FILTER_DCUTOFF,
      });
      trackFiltersRef.current.set(id, f);
    }
    return f;
  };

  const updateTrackedBoxes = (rawBoxes: BBox[], now: number): void => {
    const existing = trackedBoxesRef.current;
    const usedIds = new Set<number>();
    const next: TrackedBox[] = [];

    for (const raw of rawBoxes) {
      let bestIdx = -1;
      let bestIoU = TRACK_IOU_MATCH;
      for (let i = 0; i < existing.length; i += 1) {
        const ex = existing[i];
        if (ex === undefined || usedIds.has(ex.id)) continue;
        const iou = computeIoU(raw, ex);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        const prev = existing[bestIdx]!;
        usedIds.add(prev.id);
        const smoothed = getOrCreateFilter(prev.id).filter(raw, now);
        next.push({
          id: prev.id,
          x1: smoothed.x1,
          y1: smoothed.y1,
          x2: smoothed.x2,
          y2: smoothed.y2,
          firstSeenAt: prev.firstSeenAt,
          lastSeen: now,
          lastLabel: prev.lastLabel,
          lastLabelTime: prev.lastLabelTime,
          hadServerMatch: prev.hadServerMatch,
          lastSentAt: prev.lastSentAt,
        });
      } else {
        const id = nextTrackIdRef.current;
        nextTrackIdRef.current = id + 1;
        const seeded = getOrCreateFilter(id).filter(raw, now);
        next.push({
          id,
          x1: seeded.x1,
          y1: seeded.y1,
          x2: seeded.x2,
          y2: seeded.y2,
          firstSeenAt: now,
          lastSeen: now,
          lastLabel: null,
          lastLabelTime: 0,
          hadServerMatch: false,
          lastSentAt: 0,
        });
      }
    }

    for (const prev of existing) {
      if (usedIds.has(prev.id)) continue;
      const persistMs =
        prev.hadServerMatch || prev.lastLabel != null ? TRACK_PERSIST_MS : TRACK_PERSIST_MS_UNLABELED;
      if (now - prev.lastSeen <= persistMs) {
        next.push(prev);
      } else {
        trackFiltersRef.current.delete(prev.id);
      }
    }

    trackedBoxesRef.current = next;
  };

  const drawFaceOverlay = (
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    drawX: number,
    drawY: number,
    drawW: number,
    drawH: number,
    matched: ServerFaceLabel | null,
    index: number,
    suppressDetecting: boolean,
  ) => {
    const style = getStyle(matched?.label);
    ctx.strokeStyle = style.stroke;
    ctx.strokeRect(drawX, drawY, drawW, drawH);

    const text = getOverlayLabelText(matched, index, suppressDetecting);
    if (!text) return;

    const labelWidth = Math.min(ctx.measureText(text).width + 16, canvasW - 16);
    const labelX = Math.max(8, Math.min(drawX, canvasW - labelWidth - 8));
    const labelY = drawY > 30 ? drawY - 30 : drawY + 8;
    ctx.fillStyle = style.fill;
    ctx.fillRect(labelX, labelY, labelWidth, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, labelX + 8, labelY + 4, labelWidth - 16);
  };

  const pickEligibleTrack = (now: number, frameW: number, frameH: number): TrackedBox | null => {
    const shortSide = Math.min(frameW, frameH);
    const minSide = shortSide * MIN_FACE_SIDE_TO_SEND_FRAC;
    let bestTrack: TrackedBox | null = null;
    let bestArea = 0;

    for (const track of trackedBoxesRef.current) {
      const bw = track.x2 - track.x1;
      const bh = track.y2 - track.y1;
      if (Math.min(bw, bh) < minSide) continue;

      const ageMs = track.lastLabel ? now - track.lastLabelTime : Infinity;
      const isUnknownVerdict = track.lastLabel?.label === 'unknown';
      const isStaleNamed = track.lastLabel && !isUnknownVerdict && ageMs > TRACK_LABEL_TTL_MS;
      const isStaleUnknown = isUnknownVerdict && ageMs > TRACK_UNKNOWN_RETRY_MS;
      const eligible = track.lastLabel === null || isStaleNamed || isStaleUnknown;
      if (!eligible) continue;
      if (now - track.lastSentAt < MIN_SEND_GAP_MS) continue;

      const area = bw * bh;
      if (area > bestArea) {
        bestArea = area;
        bestTrack = track;
      }
    }

    return bestTrack;
  };

  const sendFullFrame = (video: HTMLVideoElement, ws: WebSocket): void => {
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) return;

    const scale = Math.min(1, CAPTURE_MAX_WIDTH / srcW);
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);

    const offscreen = captureCanvasRef.current ?? document.createElement('canvas');
    captureCanvasRef.current = offscreen;
    if (offscreen.width !== w || offscreen.height !== h) {
      offscreen.width = w;
      offscreen.height = h;
    }

    const octx = offscreen.getContext('2d');
    if (!octx) return;
    octx.drawImage(video, 0, 0, w, h);

    const sentAt = performance.now();
    // Stream: do not block further sends on pendingResponse — server uses latest frame + frame_seq.
    if (USE_CLIENT_CROP_MODE) {
      pendingResponseRef.current = true;
      inFlightSentAtRef.current = sentAt;
    }
    inFlightTrackIdRef.current = null;
    inFlightBboxRef.current = null;
    lastSendTimeRef.current = sentAt;

    offscreen.toBlob(
      (blob) => {
        if (blob && wsRef.current === ws && ws.readyState === WebSocket.OPEN && isActiveRef.current) {
          ws.send(blob);
        } else if (USE_CLIENT_CROP_MODE) {
          pendingResponseRef.current = false;
        }
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  };

  const sendTrackCrop = (
    video: HTMLVideoElement,
    ws: WebSocket,
    track: TrackedBox,
    now: number,
  ): void => {
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) return;

    const bw = track.x2 - track.x1;
    const bh = track.y2 - track.y1;
    const padX = bw * CROP_MARGIN_RATIO;
    const padY = bh * CROP_MARGIN_RATIO;
    const cx1 = Math.max(0, Math.floor(track.x1 - padX));
    const cy1 = Math.max(0, Math.floor(track.y1 - padY));
    const cx2 = Math.min(srcW, Math.ceil(track.x2 + padX));
    const cy2 = Math.min(srcH, Math.ceil(track.y2 + padY));
    const cropW = cx2 - cx1;
    const cropH = cy2 - cy1;
    if (cropW < 32 || cropH < 32) return;

    const scale = Math.min(1, CROP_TARGET_WIDTH / cropW);
    const w = Math.max(1, Math.round(cropW * scale));
    const h = Math.max(1, Math.round(cropH * scale));

    const offscreen = captureCanvasRef.current ?? document.createElement('canvas');
    captureCanvasRef.current = offscreen;
    if (offscreen.width !== w || offscreen.height !== h) {
      offscreen.width = w;
      offscreen.height = h;
    }
    const octx = offscreen.getContext('2d');
    if (!octx) return;
    octx.drawImage(video, cx1, cy1, cropW, cropH, 0, 0, w, h);

    track.lastSentAt = now;
    pendingResponseRef.current = true;
    inFlightTrackIdRef.current = track.id;
    inFlightBboxRef.current = { x1: track.x1, y1: track.y1, x2: track.x2, y2: track.y2 };
    inFlightSentAtRef.current = now;
    lastSendTimeRef.current = now;

    offscreen.toBlob(
      (blob) => {
        if (blob && wsRef.current === ws && ws.readyState === WebSocket.OPEN && isActiveRef.current) {
          ws.send(blob);
        } else {
          pendingResponseRef.current = false;
          inFlightTrackIdRef.current = null;
          inFlightBboxRef.current = null;
        }
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  };

  const resolveInFlightTrack = (trackId: number, sentBbox: BBox | null): TrackedBox | null => {
    const tracks = trackedBoxesRef.current;
    const exact = tracks.find((t) => t.id === trackId);
    if (exact) return exact;
    if (!sentBbox) return null;

    let best: TrackedBox | null = null;
    let bestIoU = IOU_MATCH_THRESHOLD;
    for (const t of tracks) {
      const iou = computeIoU(t, sentBbox);
      if (iou > bestIoU) {
        bestIoU = iou;
        best = t;
      }
    }
    return best;
  };

  const buildLabelFromFace = (track: TrackedBox, face: FaceResult | null): ServerFaceLabel => {
    if (!face) {
      return {
        x1: track.x1,
        y1: track.y1,
        x2: track.x2,
        y2: track.y2,
        label: 'unknown',
        user_name: null,
        user_id: null,
        similarity: null,
        track_id: track.id,
      };
    }
    return {
      x1: track.x1,
      y1: track.y1,
      x2: track.x2,
      y2: track.y2,
      label: face.label,
      user_name: face.user_name,
      user_id: face.user_id,
      similarity: face.similarity,
      track_id: face.track_id ?? track.id,
    };
  };

  const enforceInFlightTimeout = (now: number): void => {
    if (!pendingResponseRef.current) return;
    if (now - inFlightSentAtRef.current < IN_FLIGHT_TIMEOUT_MS) return;
    console.warn(
      `WS recognition response not received in ${IN_FLIGHT_TIMEOUT_MS} ms — resetting in-flight state`,
    );
    pendingResponseRef.current = false;
    inFlightTrackIdRef.current = null;
    inFlightBboxRef.current = null;
  };

  const trySendFrame = () => {
    const ws = wsRef.current;
    const video = videoRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!video || video.readyState < 2) return;

    const now = performance.now();
    enforceInFlightTimeout(now);
    if (USE_CLIENT_CROP_MODE && pendingResponseRef.current) return;
    const minSendGapMs = USE_CLIENT_CROP_MODE ? MIN_SEND_GAP_MS : STREAM_SEND_INTERVAL_MS;
    if (now - lastSendTimeRef.current < minSendGapMs) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    if (USE_CLIENT_CROP_MODE && detectorRef.current) {
      const track = pickEligibleTrack(now, w, h);
      if (track) sendTrackCrop(video, ws, track, now);
      return;
    }

    sendFullFrame(video, ws);
  };

  const dispatchDetectorFrame = (video: HTMLVideoElement): void => {
    const detector = detectorRef.current;
    if (!detector || detectorInflightRef.current) return;
    detectorInflightRef.current = true;
    detector.send({ image: video }).catch((err) => {
      console.warn('MediaPipe send() failed', err);
      detectorInflightRef.current = false;
    });
  };

  /** Convert normalized MediaPipe detections to pixel-space, filtering implausible boxes. */
  const collectRawBoxes = (frameW: number, frameH: number): BBox[] => {
    const raw: BBox[] = [];
    for (const det of latestDetectionsRef.current) {
      const bb = det.boundingBox;
      if (!bb) continue;
      const wPx = bb.width * frameW;
      const hPx = bb.height * frameH;
      const x1 = bb.xCenter * frameW - wPx / 2;
      const y1 = bb.yCenter * frameH - hPx / 2;
      const x2 = x1 + wPx;
      const y2 = y1 + hPx;
      if (!isPlausibleFaceBox(x1, y1, x2, y2, frameW, frameH)) continue;
      raw.push({ x1, y1, x2, y2 });
    }
    return raw;
  };

  const applyServerLabelsByIoU = (serverLabels: ServerFaceLabel[], now: number): void => {
    if (serverLabels.length === 0) return;
    for (const track of trackedBoxesRef.current) {
      let best: ServerFaceLabel | null = null;
      let bestIoU = IOU_MATCH_THRESHOLD;
      for (const sl of serverLabels) {
        const iou = computeIoU(track, sl);
        if (iou > bestIoU) {
          bestIoU = iou;
          best = sl;
        }
      }
      if (best) {
        track.lastLabel = best;
        track.lastLabelTime = now;
        track.hadServerMatch = true;
      }
    }
  };

  const animationLoop = () => {
    if (!isActiveRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafIdRef.current = requestAnimationFrame(animationLoop);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      rafIdRef.current = requestAnimationFrame(animationLoop);
      return;
    }

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafIdRef.current = requestAnimationFrame(animationLoop);
      return;
    }

    const now = performance.now();
    const detector = detectorRef.current;
    const labelsFresh = now - serverLabelsTimeRef.current <= LABEL_STALE_MS;
    const serverLabels = labelsFresh ? serverLabelsRef.current : [];

    const useLocalBoxOverlay =
      Boolean(detector) && (USE_CLIENT_CROP_MODE || STREAM_USE_LOCAL_BOX_OVERLAY);

    if (useLocalBoxOverlay) {
      dispatchDetectorFrame(video);

      // Detector watchdog: recreate after silent stall (WebGL context loss, WASM hang…).
      if (
        lastDetectionAtRef.current > 0 &&
        now - lastDetectionAtRef.current > DETECTOR_IDLE_TIMEOUT_MS
      ) {
        lastDetectionAtRef.current = now;
        void reinitDetector();
      }

      updateTrackedBoxes(collectRawBoxes(w, h), now);
      applyServerLabelsByIoU(serverLabels, now);

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 3;
      ctx.font = '600 16px sans-serif';
      ctx.textBaseline = 'top';

      trackedBoxesRef.current.forEach((box, index) => {
        const bw = box.x2 - box.x1;
        const bh = box.y2 - box.y1;
        const drawX = w - box.x2;
        const drawY = box.y1;
        const suppressDetecting = !box.lastLabel && now - box.firstSeenAt < NEW_TRACK_LABEL_GRACE_MS;
        drawFaceOverlay(ctx, w, drawX, drawY, bw, bh, box.lastLabel, index, suppressDetecting);
      });
    } else {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 3;
      ctx.font = '600 16px sans-serif';
      ctx.textBaseline = 'top';
      if (serverLabels.length > 0) {
        serverLabels.forEach((sl, index) => {
          const drawX = w - sl.x2;
          const drawY = sl.y1;
          drawFaceOverlay(ctx, w, drawX, drawY, sl.x2 - sl.x1, sl.y2 - sl.y1, sl, index, false);
        });
      }
    }

    trySendFrame();
    rafIdRef.current = requestAnimationFrame(animationLoop);
  };

  const startAnimationLoop = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    trackedBoxesRef.current = [];
    trackFiltersRef.current.clear();
    nextTrackIdRef.current = 1;
    inFlightTrackIdRef.current = null;
    inFlightBboxRef.current = null;
    inFlightSentAtRef.current = 0;
    latestDetectionsRef.current = [];
    detectorInflightRef.current = false;
    lastDetectionAtRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(animationLoop);
  };

  const stopAnimationLoop = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const clearOverlay = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const c = canvas.getContext('2d');
      c?.clearRect(0, 0, canvas.width, canvas.height);
    }
    serverLabelsRef.current = [];
    trackedBoxesRef.current = [];
    trackFiltersRef.current.clear();
    inFlightTrackIdRef.current = null;
    inFlightBboxRef.current = null;
    inFlightSentAtRef.current = 0;
  };

  const closeWs = () => {
    stopAnimationLoop();
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    }
    pendingResponseRef.current = false;
    clearOverlay();
    lastServerSeqRef.current = 0;
  };

  const connectWs = () => {
    closeWs();
    if (!isActiveRef.current) return;

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setError(null);
    };

    ws.onmessage = (event) => {
      const inFlightTrackId = inFlightTrackIdRef.current;
      const inFlightBbox = inFlightBboxRef.current;
      inFlightTrackIdRef.current = null;
      inFlightBboxRef.current = null;
      pendingResponseRef.current = false;

      try {
        const data: StreamMessage = JSON.parse(event.data as string);
        if (data.error) {
          console.warn('WS server error:', data.error, data.detail);
          return;
        }

        if (data.frame_seq < lastServerSeqRef.current) return;
        lastServerSeqRef.current = data.frame_seq;

        const now = performance.now();

        if (inFlightTrackId !== null) {
          const face = data.faces?.[0] ?? null;
          const target = resolveInFlightTrack(inFlightTrackId, inFlightBbox);
          if (target) {
            target.lastLabel = buildLabelFromFace(target, face);
            target.lastLabelTime = now;
            target.hadServerMatch = true;
          }
          return;
        }

        const video = videoRef.current;
        if (video && data.faces && data.image_width > 0 && data.image_height > 0) {
          const sx = video.videoWidth / data.image_width;
          const sy = video.videoHeight / data.image_height;
          serverLabelsRef.current = data.faces.map((f) => ({
            x1: f.bbox.x1 * sx,
            y1: f.bbox.y1 * sy,
            x2: f.bbox.x2 * sx,
            y2: f.bbox.y2 * sy,
            label: f.label,
            user_name: f.user_name,
            user_id: f.user_id,
            similarity: f.similarity,
            track_id: f.track_id,
          }));
          serverLabelsTimeRef.current = now;
        }
      } catch (err) {
        console.error('WS message parse error', err);
      }
    };

    ws.onerror = () => {
      console.error('WebSocket connection error');
    };

    ws.onclose = () => {
      pendingResponseRef.current = false;
      if (!isActiveRef.current) return;

      reconnectAttemptsRef.current += 1;
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setError('Cannot connect to AI service. Check ai-inference-service on port 8000.');
        return;
      }

      reconnectTimerRef.current = window.setTimeout(connectWs, WS_RECONNECT_DELAY_MS);
    };
  };

  const startCamera = async () => {
    try {
      if (USE_CLIENT_CROP_MODE || STREAM_USE_LOCAL_BOX_OVERLAY) {
        await initMediaPipe();
      } else {
        await disposeDetector();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (!isActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setError(null);
      connectWs();
      startAnimationLoop();
    } catch (err) {
      console.error('startCamera error', err);
      setError('Cannot access camera. Allow permissions or use HTTPS/localhost.');
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    stopAnimationLoop();
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    closeWs();
    void disposeDetector();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) startCamera();
    else stopCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)]">
      <div className="flex items-center justify-between border-b border-slate-200/70 p-4 dark:border-[rgba(86,112,170,0.35)]">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100/80 p-2 text-slate-700 dark:bg-[rgba(12,20,40,0.9)] dark:text-[#d9e2f6]">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-tight text-slate-900 dark:text-[#f6f8ff]">Live Camera</h3>
            <p className="text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
              AI server tracking, voting and recognition
            </p>
          </div>
        </div>

        <Button onClick={() => setIsActive((v) => !v)} variant={isActive ? 'secondary' : 'primary'}>
          {isActive ? <VideoOff size={18} /> : <Video size={18} />}
          {isActive ? 'Turn Off' : 'Turn On'}
        </Button>
      </div>

      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-slate-50/90 transition-all dark:bg-[rgba(12,20,40,0.9)]">
        {error && (
          <div className="absolute bottom-4 left-4 right-4 z-10 rounded-md bg-red-950/75 px-3 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${isActive ? '' : 'hidden'} -scale-x-100`}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${isActive ? '' : 'hidden'}`}
        />

        {!isActive && !error && (
          <div className="flex flex-col items-center gap-5 animate-fade-in px-6 text-center">
            <div className="rounded-full border border-slate-200/60 bg-white/70 p-8 dark:border-white/10 dark:bg-[rgba(255,255,255,0.06)]">
              <VideoOff size={52} className="text-slate-700 dark:text-[#d9e2f6]" />
            </div>
            <div className="space-y-2">
              <h4 className="text-3xl font-bold text-slate-900 dark:text-[#f6f8ff]">Camera Offline</h4>
              <p className="max-w-xl text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
                Activate the facial recognition system to start detecting attendances.
              </p>
            </div>
          </div>
        )}

        {isActive && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-red-500" />
            <span className="rounded-md bg-black/45 px-2 py-1 text-xs font-bold uppercase tracking-wider text-white">
              Live
            </span>
          </div>
        )}

      </div>
    </div>
  );
};