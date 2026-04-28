import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, VideoOff } from 'lucide-react';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';
import { Button } from '@/shared/components/ui/Button';

export const CameraStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureDetector = async () => {
    if (detectorRef.current) return detectorRef.current;

    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    detectorRef.current = await FaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
      },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.55,
    });

    return detectorRef.current;
  };

  const stopDetectionLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const drawDetections = (
    detections: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number } }>
  ) => {
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
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
    ctx.lineWidth = 3;

    detections.forEach((detection) => {
      const box = detection.boundingBox;
      if (!box) return;
      ctx.strokeRect(box.originX, box.originY, box.width, box.height);
    });
  };

  const startDetectionLoop = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await ensureDetector();
    } catch (err) {
      console.error('detector init error', err);
      setError('Face detector failed to load.')
      return;
    }

    const tick = () => {
      if (!videoRef.current || !detectorRef.current || !isActive) return;
      if (video.readyState >= 2) {
        const result = detectorRef.current.detectForVideo(video, performance.now());
        drawDetections(result.detections || []);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // attempt to play (some browsers require user interaction)
        await videoRef.current.play().catch(() => {});
      }
      setError(null);
      await startDetectionLoop();
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
        {error && <div className="p-4 text-sm text-red-500">{error}</div>}

        <video
          ref={videoRef}
          className={`h-full w-full object-cover ${isActive ? '' : 'hidden'} -scale-x-100`}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className={`pointer-events-none absolute inset-0 h-full w-full ${isActive ? '' : 'hidden'} -scale-x-100`}
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