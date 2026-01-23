import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { decode } from '../utils/base64';
import { initGeminiApi } from '../utils/api';
import LoadingOverlay from './LoadingOverlay';

interface AIChatModalProps {
  onClose: () => void;
  geolocation: { latitude: number; longitude: number } | null;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingLinks?: { uri: string; title: string }[];
}

const AIChatModal: React.FC<AIChatModalProps> = ({ onClose, geolocation }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const ai = initGeminiApi();
      let response: GenerateContentResponse;
      let toolsUsed: ('googleMaps' | 'googleSearch')[] = [];

      // Check for location-related queries to use Maps Grounding
      const lowerCaseInput = userMessage.toLowerCase();
      const isLocationQuery =
        lowerCaseInput.includes('nearby') ||
        lowerCaseInput.includes('restaurants') ||
        lowerCaseInput.includes('cafes') ||
        lowerCaseInput.includes('places to eat') ||
        lowerCaseInput.includes('where is') ||
        lowerCaseInput.includes('show me on map');

      if (isLocationQuery && geolocation) {
        // Use gemini-2.5-flash for Maps grounding as per guidelines
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userMessage,
          config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: geolocation.latitude,
                  longitude: geolocation.longitude,
                },
              },
            },
          },
        });
        toolsUsed.push('googleMaps');
      } else {
        // Default to gemini-3-flash-preview for general chat
        response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: userMessage,
          config: {
            // Potentially add googleSearch for general knowledge queries not handled by base model
            tools: [{ googleSearch: {} }],
          },
        });
        toolsUsed.push('googleSearch');
      }

      const modelText = response.text || "No response from model.";
      let groundingLinks: { uri: string; title: string }[] = [];

      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        for (const chunk of chunks) {
          if ('web' in chunk && chunk.web?.uri) {
            groundingLinks.push({ uri: chunk.web.uri, title: chunk.web.title || 'Web Link' });
          } else if ('maps' in chunk && chunk.maps?.uri) {
            groundingLinks.push({ uri: chunk.maps.uri, title: chunk.maps.title || 'Map Link' });
          }
          if ('placeAnswerSources' in chunk.maps && chunk.maps.placeAnswerSources) {
            for (const source of chunk.maps.placeAnswerSources) {
                if (source.reviewSnippets) {
                    for (const review of source.reviewSnippets) {
                        if (review.uri) {
                            groundingLinks.push({uri: review.uri, title: review.title || 'Review Link'})
                        }
                    }
                }
            }
          }
        }
      }

      setMessages((prev) => [...prev, { role: 'model', text: modelText, groundingLinks }]);
    } catch (e: any) {
      console.error('AI chat error:', e);
      setError(`Failed to get response: ${e.message || 'Unknown error'}.`);
      setMessages((prev) => [...prev, { role: 'model', text: `Error: ${e.message || 'Could not connect to AI.'}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, geolocation]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900 bg-opacity-95 z-30 p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-700/50">
        <h2 className="text-2xl sm:text-3xl font-bold text-blue-400">AI Chat</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-gray-800 text-blue-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Close chat"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-lg py-10">
            Start a conversation with Gemini! Ask about anything, including local places.
            {geolocation ? (
              <p className="text-sm mt-2 text-green-400">Geolocation available for enhanced queries.</p>
            ) : (
              <p className="text-sm mt-2 text-yellow-400">Geolocation not available. Maps grounding may be limited.</p>
            )}
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                msg.role === 'user'
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                <div className="mt-2 text-xs text-blue-200">
                  <p className="font-semibold">References:</p>
                  <ul className="list-disc list-inside">
                    {msg.groundingLinks.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <a
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline text-blue-300"
                          title={link.title || link.uri}
                        >
                          {link.title || link.uri.split('//')[1].split('/')[0]}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="text-red-500 p-2 text-center">{error}</div>}

      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-3 rounded-lg bg-gray-800 border border-blue-600/30 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
          aria-label="Chat input"
        />
        <button
          type="submit"
          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
          aria-label="Send message"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          )}
        </button>
      </form>
      {isLoading && <LoadingOverlay message="Gemini is thinking..." />}
    </div>
  );
};

export default AIChatModal;