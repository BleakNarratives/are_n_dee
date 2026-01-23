import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { initGeminiApi } from '../utils/api';
import { base64EncodeFile } from '../utils/media';
import LoadingOverlay from './LoadingOverlay';

interface VideoAnalysisModalProps {
  onClose: () => void;
}

const VideoAnalysisModal: React.FC<VideoAnalysisModalProps> = ({ onClose }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('Analyze this video and provide a summary of its content and key events.');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Create a preview URL
      setAnalysisResult(null);
      setError(null);
    }
  }, []);

  const handleAnalyzeVideo = useCallback(async () => {
    if (!videoFile) {
      setError('Please upload a video first.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt for analysis.');
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setError(null);

    try {
      const base64VideoData = await base64EncodeFile(videoFile);
      const ai = initGeminiApi();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Use Pro for video understanding
        contents: {
          parts: [
            {
              inlineData: {
                data: base64VideoData,
                mimeType: videoFile.type,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      setAnalysisResult(response.text);
    } catch (e: any) {
      console.error('Video analysis error:', e);
      setError(`Failed to analyze video: ${e.message || 'Unknown error'}.`);
    } finally {
      setIsLoading(false);
    }
  }, [videoFile, prompt]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 bg-opacity-95 z-30 p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-700/50">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-400">Analyze Video</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-gray-800 text-blue-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close video analysis"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="mb-4">
          <label htmlFor="videoUpload" className="block text-gray-300 text-sm font-bold mb-2">Upload Video:</label>
          <input
            id="videoUpload"
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="w-full text-gray-100 bg-gray-800 border border-blue-600/30 rounded-lg p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
            disabled={isLoading}
            aria-label="Upload video for analysis"
          />
        </div>

        {previewUrl && (
          <div className="mb-4 text-center">
            <video controls src={previewUrl} className="max-w-full h-auto mx-auto rounded-lg shadow-lg border border-blue-600/30"></video>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="prompt" className="block text-gray-300 text-sm font-bold mb-2">Analysis Prompt:</label>
          <textarea
            id="prompt"
            className="w-full p-3 rounded-lg bg-gray-800 border border-blue-600/30 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Summarize the main events in this video."
            disabled={isLoading}
            aria-label="Video analysis prompt"
          ></textarea>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleAnalyzeVideo}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isLoading || !videoFile}
          aria-label="Analyze video"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Video'}
        </button>

        {analysisResult && (
          <div className="mt-8 bg-gray-800 p-4 rounded-lg border border-blue-600/30">
            <h3 className="text-xl font-bold text-blue-300 mb-4">Analysis Result:</h3>
            <div className="prose prose-invert max-w-none text-gray-100">
              <p className="whitespace-pre-wrap">{analysisResult}</p>
            </div>
          </div>
        )}
      </div>
      {isLoading && <LoadingOverlay message="Analyzing video with Gemini Pro..." />}
    </div>
  );
};

export default VideoAnalysisModal;