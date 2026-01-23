import React from 'react';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-[60]">
      <div className="flex flex-col items-center p-6 bg-gray-800 rounded-lg shadow-lg border border-blue-600/30 text-blue-300">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg font-medium text-center">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;