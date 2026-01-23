import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { initGeminiApi } from '../utils/api';
import { base64EncodeFile } from '../utils/media';
import LoadingOverlay from './LoadingOverlay';

interface VideoGenerationModalProps {
  onClose: () => void;
}

const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [startingImageFile, setStartingImageFile] = useState<File | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('Initializing video generation...');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const loadingMessages = [
    'Sending your creative vision to Veo...',
    'Veo is conceptualizing the scene...',
    'Building the first frames...',
    'Adding dynamic movements...',
    'Refining details and lighting...',
    'Almost there! Your video is rendering...',
    'Just a moment more, preparing the final cut...',
  ];

  useEffect(() => {
    // Use `number` for setInterval return type in browser environments
    let interval: number;
    if (isLoading) {
      let messageIndex = 0;
      interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
      }, 5000); // Change message every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setStartingImageFile(e.target.files[0]);
      setGeneratedVideoUrl(null);
      setError(null);
    }
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (!prompt.trim() && !startingImageFile) {
      setError('Please enter a prompt or upload a starting image.');
      return;
    }

    setGeneratedVideoUrl(null);
    setIsLoading(true);
    setError(null);
    setLoadingMessage('Initializing video generation...');

    try {
      const ai = initGeminiApi();
      let imagePart = undefined;
      if (startingImageFile) {
        const base64ImageData = await base64EncodeFile(startingImageFile);
        imagePart = {
          imageBytes: base64ImageData,
          mimeType: startingImageFile.type,
        };
      }

      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt.trim() || undefined, // prompt is optional if image is provided
        image: imagePart,
        config: {
          numberOfVideos: 1,
          resolution: '720p', // Only 720p for fast preview model
          aspectRatio: aspectRatio,
        },
      });

      // Polling for operation completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        // Fetch the video with API key appended
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        const videoBlob = await response.blob();
        setGeneratedVideoUrl(URL.createObjectURL(videoBlob));
      } else {
        setError('Video generation completed, but no download link was provided.');
      }
    } catch (e: any) {
      console.error('Video generation error:', e);
      setError(`Failed to generate video: ${e.message || 'Unknown error'}.`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, startingImageFile, aspectRatio]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 bg-opacity-95 z-30 p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-700/50">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-400">Generate Video (Veo)</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-gray-800 text-blue-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close video generation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="mb-4">
          <label htmlFor="videoPrompt" className="block text-gray-300 text-sm font-bold mb-2">Prompt (Optional with image):</label>
          <textarea
            id="videoPrompt"
            className="w-full p-3 rounded-lg bg-gray-800 border border-blue-600/30 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cat playing with yarn in a cozy living room..."
            disabled={isLoading}
            aria-label="Video generation prompt"
          ></textarea>
        </div>

        <div className="mb-4">
          <label htmlFor="startingImageUpload" className="block text-gray-300 text-sm font-bold mb-2">Starting Image (Optional):</label>
          <input
            id="startingImageUpload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-gray-100 bg-gray-800 border border-blue-600/30 rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
            disabled={isLoading}
            aria-label="Upload starting image for video"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="aspectRatio" className="block text-gray-300 text-sm font-bold mb-2">Aspect Ratio:</label>
          <select
            id="aspectRatio"
            className="w-full p-3 rounded-lg bg-gray-800 border border-blue-600/30 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}
            disabled={isLoading}
            aria-label="Select video aspect ratio"
          >
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (Portrait)</option>
          </select>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleGenerateVideo}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isLoading || (!prompt.trim() && !startingImageFile)}
          aria-label="Generate video"
        >
          {isLoading ? 'Generating...' : 'Generate Video'}
        </button>

        {generatedVideoUrl && (
          <div className="mt-8 text-center bg-gray-800 p-4 rounded-lg border border-blue-600/30">
            <h3 className="text-xl font-bold text-blue-300 mb-4">Generated Video:</h3>
            <video controls src={generatedVideoUrl} className="max-w-full h-auto mx-auto rounded-lg shadow-lg"></video>
          </div>
        )}
      </div>
      {isLoading && <LoadingOverlay message={loadingMessage} />}
    </div>
  );
};

export default VideoGenerationModal;