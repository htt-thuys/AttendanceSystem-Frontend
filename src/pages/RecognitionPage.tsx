import React from 'react';
import { CameraStream } from '@/modules/recognition/components/CameraStream';
import Header from '@/shared/components/common/Header';

const RecognitionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_800px_at_15%_10%,rgba(227,236,255,0.85),transparent_60%),radial-gradient(900px_600px_at_90%_20%,rgba(196,220,255,0.55),transparent_60%),linear-gradient(180deg,#f8fbff_0%,#e9f1ff_100%)] p-8 text-slate-900 dark:bg-[radial-gradient(1200px_800px_at_15%_10%,rgba(30,60,140,0.65),transparent_60%),radial-gradient(900px_600px_at_90%_20%,rgba(20,80,150,0.45),transparent_60%),linear-gradient(180deg,#0b1326_0%,#090f1e_100%)] dark:text-[#d9e2f6]">
      <Header />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Camera stream */}
        <div className="lg:col-span-2">
          <CameraStream />
        </div>

        {/* Cột phải: Log kết quả (Placeholder cho ResultCard) */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-[rgba(86,112,170,0.55)] dark:bg-[rgba(28,38,64,0.92)]">
            <h4 className="mb-4 font-semibold text-slate-900 dark:text-[#f6f8ff]">Recent Logs</h4>
            <div className="space-y-3">
              <div className="py-10 text-center text-sm italic text-slate-500 dark:text-[rgba(170,184,214,0.7)]">
                Waiting for recognition...
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default RecognitionPage;