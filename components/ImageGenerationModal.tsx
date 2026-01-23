import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { initGeminiApi } from '../utils/api';
import LoadingOverlay from './LoadingOverlay';

interface ImageGenerationModalProps {
  onClose: () => void;
}

const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9'>('1:1');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateImage = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setGeneratedImageUrl(null);
    setIsLoading(true);
    setError(null);

    try {
      const ai = initGeminiApi();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: imageSize,
          },
          tools: [{googleSearch: {}}], // Use googleSearch for `gemini-3-pro-image-preview`
        },
      });

      let imageUrl: string | null = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedImageUrl(imageUrl);
      } else {
        setError('No image was generated. Please try a different prompt.');
      }
    } catch (e: any) {
      console.error('Image generation error:', e);
      setError(`Failed to generate image: ${e.message || 'Unknown error'}.`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, imageSize, aspectRatio]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 bg-opacity-95 z-30 p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-700/50">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-400">Generate Image</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-gray-800 text-blue-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close image generation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-gray-300 text-sm font-bold mb-2">Prompt:</label>
          <textarea
            id="prompt"
            className="w-full p-3 rounded-lg bg-gray-800 border border-blue-600/30 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A futuristic city at sunset..."
            disabled={isLoading}
            aria-label="Image generation prompt"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="imageSize" className="block text-gray-300 text-sm font-bold mb-2">Image Size:</label>
            <select
              id="imageSize"
              className="w-full p-3 rounded-lg bg-gray-800 border border-blue-600/30 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value as '1K' | '2K' | '4K')}
              disabled={isLoading}
              aria-label="Select image size"
            >
              <option value="1K">1K (1024x1024)</option>
              <option value="2K">2K (2048x2048)</option>
              <option value="4K">4K (4096x4096)</option>
            </select>
          </div>
          <div>
            <label htmlFor="aspectRatio" className="block text-gray-300 text-sm font-bold mb-2">Aspect Ratio:</label>
            <select
              id="aspectRatio"
              className="w-full p-3 rounded-lg bg-gray-800 border border-blue-600/30 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9')}
              disabled={isLoading}
              aria-label="Select aspect ratio"
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="4:3">4:3 (Classic Landscape)</option>
              <option value="3:4">3:4 (Classic Portrait)</option>
              <option value="2:3">2:3 (Photo Portrait)</option>
              <option value="3:2">3:2 (Photo Landscape)</option>
              <option value="21:9">21:9 (Cinematic)</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleGenerateImage}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={isLoading}
          aria-label="Generate image"
        >
          {isLoading ? 'Generating...' : 'Generate Image'}
        </button>

        {generatedImageUrl && (
          <div className="mt-8 text-center bg-gray-800 p-4 rounded-lg border border-blue-600/30">
            <h3 className="text-xl font-bold text-blue-300 mb-4">Generated Image:</h3>
            <img src={generatedImageUrl} alt="Generated by AI" className="max-w-full h-auto mx-auto rounded-lg shadow-lg" />
          </div>
        )}
      </div>
      {isLoading && <LoadingOverlay message="Generating your image..." />}
    </div>
  );
};

export default ImageGenerationModal;