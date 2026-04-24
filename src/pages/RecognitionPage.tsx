import React from 'react';
import { CameraStream } from '@/modules/recognition/components/CameraStream';

const RecognitionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-adaptive p-8">
      <div className="mb-8">
        <img src="/src/assets/LogoEnclave.png" alt="Logo" className="w-35 h-auto" />
        {/* <h1 className="text-2xl font-bold text-adaptive-h">Attendance Recognition</h1>
        <p className="text-adaptive">Position yourself in front of the camera for automatic check-in.</p> */}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Camera stream */}
        <div className="lg:col-span-2">
          <CameraStream />
        </div>

        {/* Cột phải: Log kết quả (Placeholder cho ResultCard) */}
          <div className="bg-card p-4 rounded-xl shadow-sm border border-gray-100">
           <h4 className="font-semibold mb-4 text-adaptive-h">Recent Logs</h4>
           <div className="space-y-3">
             <div className="text-sm text-on-card italic text-center py-10">
               Waiting for recognition...
             </div>
           </div>
          </div>
      </div>
    </div>
  );
};

export default RecognitionPage;