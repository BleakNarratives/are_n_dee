import React from 'react';

interface ApiKeyPromptProps {
  onClose: () => void;
  onSelectKey: () => void;
}

const ApiKeyPrompt: React.FC<ApiKeyPromptProps> = ({ onClose, onSelectKey }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-yellow-600/50 text-center max-w-md w-full">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">API Key Required</h2>
        <p className="text-gray-300 mb-6">
          Certain advanced AI features, like high-quality image and video generation, require a selected API key from a paid Google Cloud project.
        </p>
        <p className="text-gray-300 mb-6">
          Please select your API key to continue. You can learn more about billing <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">here</a>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onSelectKey}
            className="px-6 py-3 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="Select API Key"
          >
            Select API Key
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Close prompt"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyPrompt;