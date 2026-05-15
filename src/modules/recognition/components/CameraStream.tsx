import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, VideoOff } from 'lucide-react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { Button } from '@/shared/components/ui/Button';

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
  lastSeen: number;
  lastLabel: ServerFaceLabel | null;
  lastLabelTime: number;
  /** True once this track matched a server face (IoU); longer persist is OK */
  hadServerMatch: boolean;
};

const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_BASE_URL || '/ai-api').replace(/\/$/, '');
const CAPTURE_MAX_WIDTH = Number(import.meta.env.VITE_FACE_DETECT_IMAGE_MAX_WIDTH || 640);
const CAMERA_ID = import.meta.env.VITE_FACE_RECOGNITION_CAMERA_ID || 'frontend-camera';
const JPEG_QUALITY = 0.92;
const MIN_SEND_GAP_MS = 200;
const WS_RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const IOU_MATCH_THRESHOLD = 0.15;
const LABEL_STALE_MS = 5000;
const TRACK_PERSIST_MS = 280;
const TRACK_PERSIST_MS_UNLABELED = 90;
const TRACK_IOU_MATCH = 0.32;
const SMOOTHING_ALPHA = 0.52;
/** BlazeFace: stricter = fewer false positives on texture / corners */
const MP_MIN_DETECTION_CONFIDENCE = 0.58;
const MP_MIN_SUPPRESSION = 0.48;
/** Per-detection score from MediaPipe categories (0–1); extra gate beyond model threshold */
const MP_MIN_CATEGORY_SCORE = 0.55;
/** Reject tiny / strip-like boxes (fraction of shorter video side) */
const MP_MIN_FACE_SIDE_FRAC = 0.055;
/** Typical upright face width/height ratio */
const MP_ASPECT_MIN = 0.55;
const MP_ASPECT_MAX = 1.75;

const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MEDIAPIPE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

function buildWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const query = CAMERA_ID ? `?camera_id=${encodeURIComponent(CAMERA_ID)}` : '';
  return `${protocol}//${window.location.host}${AI_API_BASE_URL}/api/v1/ws/stream${query}`;
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

function getDetectionCategoryScore(det: { categories?: readonly { score?: number }[] }): number {
  const s = det.categories?.[0]?.score;
  return typeof s === 'number' ? s : 1;
}

function isPlausibleFaceBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  frameW: number,
  frameH: number,
  categoryScore: number,
): boolean {
  if (categoryScore < MP_MIN_CATEGORY_SCORE) return false;
  const bw = x2 - x1;
  const bh = y2 - y1;
  if (bw <= 0 || bh <= 0) return false;
  const shortSide = Math.min(frameW, frameH);
  if (Math.min(bw, bh) < shortSide * MP_MIN_FACE_SIDE_FRAC) return false;
  const ar = bw / bh;
  if (ar < MP_ASPECT_MIN || ar > MP_ASPECT_MAX) return false;
  return true;
}

function getOverlayLabelText(matched: ServerFaceLabel | null, index: number): string {
  if (!matched) return `${index + 1}. Detecting…`;
  const name =
    matched.user_name ||
    matched.user_id ||
    (matched.label === 'unknown' ? 'Unknown' : matched.label.toUpperCase());
  const sim = typeof matched.similarity === 'number' ? `${Math.round(matched.similarity * 100)}%` : null;
  const trackId = matched.track_id ?? index + 1;
  return sim ? `${trackId}. ${name} ${sim}` : `${trackId}. ${name}`;
}

export const CameraStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastServerSeqRef = useRef(0);
  const lastSendTimeRef = useRef(0);
  const pendingResponseRef = useRef(false);
  const serverLabelsRef = useRef<ServerFaceLabel[]>([]);
  const serverLabelsTimeRef = useRef(0);
  const trackedBoxesRef = useRef<TrackedBox[]>([]);
  const nextTrackIdRef = useRef(1);
  const isActiveRef = useRef(false);

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initMediaPipe = async (): Promise<void> => {
    try {
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      try {
        detectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MEDIAPIPE_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: MP_MIN_DETECTION_CONFIDENCE,
          minSuppressionThreshold: MP_MIN_SUPPRESSION,
        });
      } catch {
        detectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MEDIAPIPE_MODEL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: MP_MIN_DETECTION_CONFIDENCE,
          minSuppressionThreshold: MP_MIN_SUPPRESSION,
        });
      }
    } catch (err) {
      console.warn('MediaPipe FaceDetector init failed — overlay falls back to server boxes only', err);
      detectorRef.current = null;
    }
  };

  const updateTrackedBoxes = (
    rawBoxes: { x1: number; y1: number; x2: number; y2: number }[],
    now: number,
  ): void => {
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
        const a = SMOOTHING_ALPHA;
        next.push({
          id: prev.id,
          x1: prev.x1 * (1 - a) + raw.x1 * a,
          y1: prev.y1 * (1 - a) + raw.y1 * a,
          x2: prev.x2 * (1 - a) + raw.x2 * a,
          y2: prev.y2 * (1 - a) + raw.y2 * a,
          lastSeen: now,
          lastLabel: prev.lastLabel,
          lastLabelTime: prev.lastLabelTime,
          hadServerMatch: prev.hadServerMatch,
        });
      } else {
        const id = nextTrackIdRef.current;
        nextTrackIdRef.current = id + 1;
        next.push({
          id,
          x1: raw.x1,
          y1: raw.y1,
          x2: raw.x2,
          y2: raw.y2,
          lastSeen: now,
          lastLabel: null,
          lastLabelTime: 0,
          hadServerMatch: false,
        });
      }
    }

    for (const prev of existing) {
      if (usedIds.has(prev.id)) continue;
      const persistMs =
        prev.hadServerMatch || prev.lastLabel != null ? TRACK_PERSIST_MS : TRACK_PERSIST_MS_UNLABELED;
      if (now - prev.lastSeen <= persistMs) {
        next.push(prev);
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
  ) => {
    const style = getStyle(matched?.label);
    const text = getOverlayLabelText(matched, index);
    const labelWidth = Math.min(ctx.measureText(text).width + 16, canvasW - 16);
    const labelX = Math.max(8, Math.min(drawX, canvasW - labelWidth - 8));
    const labelY = drawY > 30 ? drawY - 30 : drawY + 8;

    ctx.strokeStyle = style.stroke;
    ctx.strokeRect(drawX, drawY, drawW, drawH);
    ctx.fillStyle = style.fill;
    ctx.fillRect(labelX, labelY, labelWidth, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, labelX + 8, labelY + 4, labelWidth - 16);
  };

  const trySendFrame = () => {
    const ws = wsRef.current;
    const video = videoRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!video || video.readyState < 2) return;
    if (pendingResponseRef.current) return;
    if (performance.now() - lastSendTimeRef.current < MIN_SEND_GAP_MS) return;

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

    pendingResponseRef.current = true;
    lastSendTimeRef.current = performance.now();

    offscreen.toBlob(
      (blob) => {
        if (blob && wsRef.current?.readyState === WebSocket.OPEN && isActiveRef.current) {
          wsRef.current.send(blob);
        } else {
          pendingResponseRef.current = false;
        }
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  };

  const animationLoop = (timestamp: number) => {
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

    if (detector) {
      try {
        const result = detector.detectForVideo(video, timestamp);
        const raw: { x1: number; y1: number; x2: number; y2: number }[] = [];
        for (const det of result.detections) {
          const bb = det.boundingBox;
          if (!bb) continue;
          const catScore = getDetectionCategoryScore(det);
          const x1 = bb.originX;
          const y1 = bb.originY;
          const x2 = bb.originX + bb.width;
          const y2 = bb.originY + bb.height;
          if (!isPlausibleFaceBox(x1, y1, x2, y2, w, h, catScore)) continue;
          raw.push({ x1, y1, x2, y2 });
        }
        updateTrackedBoxes(raw, now);
      } catch {
        // skip frame
      }

      if (serverLabels.length > 0) {
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
      }

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 3;
      ctx.font = '600 16px sans-serif';
      ctx.textBaseline = 'top';

      trackedBoxesRef.current.forEach((box, index) => {
        const bw = box.x2 - box.x1;
        const bh = box.y2 - box.y1;
        const drawX = w - box.x2;
        const drawY = box.y1;
        drawFaceOverlay(ctx, w, drawX, drawY, bw, bh, box.lastLabel, index);
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
          drawFaceOverlay(ctx, w, drawX, drawY, sl.x2 - sl.x1, sl.y2 - sl.y1, sl, index);
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
    nextTrackIdRef.current = 1;
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
      pendingResponseRef.current = false;

      try {
        const data: StreamMessage = JSON.parse(event.data as string);
        if (data.error) {
          console.warn('WS server error:', data.error, data.detail);
          return;
        }

        if (data.frame_seq < lastServerSeqRef.current) return;
        lastServerSeqRef.current = data.frame_seq;

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
          serverLabelsTimeRef.current = performance.now();
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
      await initMediaPipe();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
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
    if (detectorRef.current) {
      try {
        detectorRef.current.close();
      } catch {
        /* ignore */
      }
      detectorRef.current = null;
    }
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
              Client boxes (MediaPipe) · Recognition from AI server
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
