import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, VideoOff } from 'lucide-react'; // Dùng lucide-react cho icon
import { Button } from '@/shared/components/ui/Button';

export const CameraStream: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  };

  useEffect(() => {
    if (isActive) startCamera();
    else stopCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <div className="w-full max-w-4xl mx-auto overflow-hidden bg-card rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg text-adaptive">
            <Camera size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-adaptive-h text-lg leading-tight">Live Camera</h3>
            <p className="text-sm text-on-card">Real-time attendance monitoring</p>
          </div>
        </div>

        <Button onClick={() => setIsActive((v) => !v)} variant={isActive ? 'secondary' : 'primary'}>
          {isActive ? <VideoOff size={18} /> : <Video size={18} />}
          {isActive ? 'Turn Off' : 'Turn On'}
        </Button>
      </div>

      {/* Camera Viewport */}
      <div className="relative aspect-video bg-camera flex items-center justify-center transition-all overflow-hidden">
        {error && <div className="p-4 text-sm text-red-500">{error}</div>}

        <video ref={videoRef} className={`w-full h-full object-cover ${isActive ? '' : 'hidden'}`} playsInline muted />

        {!isActive && !error && (
          <div className="flex flex-col items-center gap-5 animate-fade-in text-center px-6">
            <div className="p-8 bg-camera-muted rounded-full border border-white/10">
              <VideoOff size={52} className="text-camera" />
            </div>
            <div className="space-y-2">
              <h4 className="text-camera text-3xl font-bold">Camera Offline</h4>
              <p className="text-camera-subtext max-w-xl">
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