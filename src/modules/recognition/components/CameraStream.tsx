import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, VideoOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

type RecognitionLabel = 'match' | 'review' | 'unknown' | 'spoof';

type RecognitionResponse = {
  faces: Array<{
    bbox: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
    confidence: number;
    track_id?: number | null;
    label: RecognitionLabel;
    user_id?: string | null;
    user_name?: string | null;
    similarity?: number | null;
    liveness_score?: number | null;
    unknown_face_id?: string | null;
  }>;
  image_width: number;
  image_height: number;
  inference_ms: number;
  camera_id?: string | null;
};

const AI_API_BASE_URL = (import.meta.env.VITE_AI_API_BASE_URL || '/ai-api').replace(/\/$/, '');
const DETECT_INTERVAL_MS = Number(import.meta.env.VITE_FACE_DETECT_INTERVAL_MS || 700);
const DETECT_IMAGE_MAX_WIDTH = Number(import.meta.env.VITE_FACE_DETECT_IMAGE_MAX_WIDTH || 640);
const CAMERA_ID = import.meta.env.VITE_FACE_RECOGNITION_CAMERA_ID || 'frontend-camera';

export const CameraStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isActiveRef = useRef(false);
  const isDetectingRef = useRef(false);
  const failedDetectCountRef = useRef(0);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopDetectionLoop = () => {
    if (loopTimerRef.current) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isDetectingRef.current = false;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const getRecognitionStyle = (label: RecognitionLabel) => {
    if (label === 'match') {
      return {
        stroke: 'rgba(34, 197, 94, 0.95)',
        fill: 'rgba(22, 163, 74, 0.92)',
      };
    }

    if (label === 'review') {
      return {
        stroke: 'rgba(245, 158, 11, 0.95)',
        fill: 'rgba(217, 119, 6, 0.92)',
      };
    }

    if (label === 'spoof') {
      return {
        stroke: 'rgba(239, 68, 68, 0.95)',
        fill: 'rgba(220, 38, 38, 0.92)',
      };
    }

    return {
      stroke: 'rgba(148, 163, 184, 0.95)',
      fill: 'rgba(51, 65, 85, 0.92)',
    };
  };

  const getRecognitionText = (face: RecognitionResponse['faces'][number], index: number) => {
    const name = face.user_name || face.user_id || (face.label === 'unknown' ? 'Unknown' : face.label.toUpperCase());
    const similarity = typeof face.similarity === 'number' ? `${Math.round(face.similarity * 100)}%` : null;
    const trackId = face.track_id ?? index + 1;

    return similarity ? `${trackId}. ${name} ${similarity}` : `${trackId}. ${name}`;
  };

  const drawRecognitions = (result: RecognitionResponse) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 3;
    ctx.font = '600 16px sans-serif';
    ctx.textBaseline = 'top';

    const scaleX = width / result.image_width;
    const scaleY = height / result.image_height;

    result.faces.forEach((face, index) => {
      const style = getRecognitionStyle(face.label);
      const boxWidth = (face.bbox.x2 - face.bbox.x1) * scaleX;
      const x = width - face.bbox.x2 * scaleX;
      const y = face.bbox.y1 * scaleY;
      const boxHeight = (face.bbox.y2 - face.bbox.y1) * scaleY;
      const label = getRecognitionText(face, index);
      const labelWidth = Math.min(ctx.measureText(label).width + 16, width - 16);
      const labelX = Math.max(8, Math.min(x, width - labelWidth - 8));
      const labelY = y > 30 ? y - 30 : y + 8;

      ctx.strokeStyle = style.stroke;
      ctx.strokeRect(x, y, boxWidth, boxHeight);
      ctx.fillStyle = style.fill;
      ctx.fillRect(labelX, labelY, labelWidth, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, labelX + 8, labelY + 4, labelWidth - 16);
    });
  };

  const captureFrameBlob = (video: HTMLVideoElement) => {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return Promise.resolve<Blob | null>(null);

    const scale = Math.min(1, DETECT_IMAGE_MAX_WIDTH / sourceWidth);
    const width = Math.round(sourceWidth * scale);
    const height = Math.round(sourceHeight * scale);

    const canvas = captureCanvasRef.current ?? document.createElement('canvas');
    captureCanvasRef.current = canvas;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve<Blob | null>(null);

    ctx.drawImage(video, 0, 0, width, height);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    });
  };

  const recogniseFaces = async (video: HTMLVideoElement, signal: AbortSignal) => {
    const blob = await captureFrameBlob(video);
    if (!blob) return null;

    const formData = new FormData();
    formData.append('image', blob, 'camera-frame.jpg');

    const query = CAMERA_ID ? `?camera_id=${encodeURIComponent(CAMERA_ID)}` : '';
    const response = await fetch(`${AI_API_BASE_URL}/api/v1/faces/recognise${query}`, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      throw new Error(`Recognise API failed with status ${response.status}`);
    }

    return (await response.json()) as RecognitionResponse;
  };

  const startDetectionLoop = () => {
    const video = videoRef.current;
    if (!video) return;
    stopDetectionLoop();

    const tick = async () => {
      if (!videoRef.current || !isActiveRef.current) return;

      if (videoRef.current.readyState >= 2 && !isDetectingRef.current) {
        isDetectingRef.current = true;
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const result = await recogniseFaces(videoRef.current, controller.signal);
          if (result && isActiveRef.current) {
            failedDetectCountRef.current = 0;
            drawRecognitions(result);
            setError(null);
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            console.error('recognise API error', err);
            failedDetectCountRef.current += 1;
            if (failedDetectCountRef.current >= 3) {
              setError('Face recognise API is unstable. Check ai-inference-service on port 8000.');
            }
          }
        } finally {
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          isDetectingRef.current = false;
        }
      }

      if (isActiveRef.current) {
        loopTimerRef.current = window.setTimeout(tick, DETECT_INTERVAL_MS);
      }
    };

    void tick();
  };

  const startCamera = async () => {
    try {
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
        // attempt to play (some browsers require user interaction)
        await videoRef.current.play().catch(() => {});
      }
      setError(null);
      startDetectionLoop();
    } catch (err) {
      console.error('startCamera error', err);
      setError('Cannot access camera. Allow permissions or use HTTPS/localhost.');
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    stopDetectionLoop();
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
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 p-4 dark:border-[rgba(86,112,170,0.35)]">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-slate-100/80 p-2 text-slate-700 dark:bg-[rgba(12,20,40,0.9)] dark:text-[#d9e2f6]">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-tight text-slate-900 dark:text-[#f6f8ff]">Live Camera</h3>
            <p className="text-sm text-slate-500 dark:text-[rgba(170,184,214,0.7)]">Real-time attendance monitoring</p>
          </div>
        </div>

        <Button onClick={() => setIsActive((v) => !v)} variant={isActive ? 'secondary' : 'primary'}>
          {isActive ? <VideoOff size={18} /> : <Video size={18} />}
          {isActive ? 'Turn Off' : 'Turn On'}
        </Button>
      </div>

      {/* Camera Viewport */}
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
          className={`pointer-events-none absolute inset-0 h-full w-full ${isActive ? '' : 'hidden'}`}
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
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
            <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/45 px-2 py-1 rounded-md">Live</span>
          </div>
        )}
      </div>
    </div>
  );
};
