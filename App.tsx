

import React, { useState, useCallback, useEffect, useRef } from 'react';
// Remove: Incorrect comment, ForgeRing will be made a named export.
import { ForgeRing } from './components/ForgeRing';
import RadialMenu from './components/RadialMenu';
import AIChatModal from './components/AIChatModal';
import ImageGenerationModal from './components/ImageGenerationModal';
import ImageAnalysisModal from './components/ImageAnalysisModal';
import VideoGenerationModal from './components/VideoGenerationModal';
import VideoAnalysisModal from './components/VideoAnalysisModal';
import ApiKeyPrompt from './components/ApiKeyPrompt';
import DraggableModalWrapper from './components/DraggableModalWrapper'; // New wrapper for draggable modals
import { GoogleGenAI } from "@google/genai"; // Only import for the type, actual instance created in modal

type AIFeature = 'chat' | 'generateImage' | 'analyzeImage' | 'generateVideo' | 'analyzeVideo' | 'codeForge';

interface GeolocationLatLng {
  latitude: number;
  longitude: number;
}

interface ActiveModal {
  id: string;
  type: AIFeature;
  x: number;
  y: number;
}

const SWIPE_THRESHOLD = 80; // Minimum distance for a swipe in pixels
const CORNER_ZONE_PERCENTAGE = 0.25; // Define the corner zone (e.g., 25% of screen width/height)
const CENTER_ZONE_PERCENTAGE = 0.5; // Define the center zone (e.g., 50% of screen width/height)
const CLICK_THRESHOLD = 5; // Global click threshold to differentiate click from drag for gestures

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [ringPosition, setRingPosition] = useState<{ x: number; y: number }>({ x: 20, y: 100 });
  const [activeModals, setActiveModals] = useState<ActiveModal[]>([]); // Array to manage multiple open modals
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState<boolean>(false);
  const [geolocation, setGeolocation] = useState<GeolocationLatLng | null>(null);

  // Swipe gesture state
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  // --- Geolocation Logic ---
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Handle cases where geolocation is denied or unavailable
        }
      );
    }
  }, []);

  // --- API Key Check Logic ---
  const checkApiKey = useCallback(async (feature: AIFeature) => {
    // These models require a paid API key.
    const requiresPaidKey = ['generateImage', 'generateVideo'].includes(feature);
    if (requiresPaidKey && window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowApiKeyPrompt(true);
        return false;
      }
    }
    return true;
  }, []);

  const handleOpenApiKeySelection = useCallback(async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setShowApiKeyPrompt(false); // Assume successful selection and proceed
    }
  }, []);

  // --- Menu and Feature Handlers ---
  const handleRingClick = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const handleRingDrag = useCallback((newX: number, newY: number) => {
    setRingPosition({ x: newX, y: newY });
  }, []);

  const handleMenuItemClick = useCallback(async (menuItem: AIFeature) => {
    const canProceed = await checkApiKey(menuItem);
    if (canProceed) {
      // Generate unique ID and initial position for the new modal
      const newModalId = `${menuItem}-${Date.now()}`;
      // Initial position for modals, perhaps offset slightly from center or ForgeRing
      const initialX = window.innerWidth / 2 - 200 + activeModals.length * 20; // Example offset
      const initialY = window.innerHeight / 2 - 150 + activeModals.length * 20;

      setActiveModals(prev => [...prev, { id: newModalId, type: menuItem, x: initialX, y: initialY }]);
      setIsMenuOpen(false); // Close radial menu after launching a feature
    } else {
      console.warn("API Key required. Prompting user.");
    }
  }, [checkApiKey, activeModals.length]);

  const handleCloseAIFeature = useCallback((id: string) => {
    setActiveModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const handleDragModal = useCallback((id: string, newX: number, newY: number) => {
    setActiveModals(prev =>
      prev.map(modal => (modal.id === id ? { ...modal, x: newX, y: newY } : modal))
    );
  }, []);

  // --- Global Swipe Gesture Logic ---
  const getCornerZone = useCallback((x: number, y: number) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const cornerWidth = screenWidth * CORNER_ZONE_PERCENTAGE;
    const cornerHeight = screenHeight * CORNER_ZONE_PERCENTAGE;

    if (x < cornerWidth && y < cornerHeight) return 'top-left';
    if (x > screenWidth - cornerWidth && y < cornerHeight) return 'top-right';
    if (x < cornerWidth && y > screenHeight - cornerHeight) return 'bottom-left';
    if (x > screenWidth - cornerWidth && y > screenHeight - cornerHeight) return 'bottom-right';
    return null;
  }, []);

  const getCenterZone = useCallback((x: number, y: number) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const centerXStart = screenWidth * (1 - CENTER_ZONE_PERCENTAGE) / 2;
    const centerXEnd = screenWidth * (1 + CENTER_ZONE_PERCENTAGE) / 2;
    const centerYStart = screenHeight * (1 - CENTER_ZONE_PERCENTAGE) / 2;
    const centerYEnd = screenHeight * (1 + CENTER_ZONE_PERCENTAGE) / 2;

    return (x >= centerXStart && x <= centerXEnd && y >= centerYStart && y <= centerYEnd);
  }, []);

  const isDiagonalSwipe = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < SWIPE_THRESHOLD) return false;

    // Check if swipe direction is roughly diagonal (e.g., within 20-70 degrees of horizontal/vertical)
    const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
    const isRoughlyDiagonal = (angle > 20 && angle < 70) || (angle > 110 && angle < 160);
    return isRoughlyDiagonal;
  }, []);

  const handleInteractionStart = useCallback((clientX: number, clientY: number) => {
    swipeStartRef.current = { x: clientX, y: clientY };
    isSwipingRef.current = false; // Reset swiping flag
  }, []);

  const handleInteractionMove = useCallback((clientX: number, clientY: number) => {
    if (!swipeStartRef.current) return;
    const dx = clientX - swipeStartRef.current.x;
    const dy = clientY - swipeStartRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > CLICK_THRESHOLD) { // If moved beyond click threshold, it's a potential swipe/drag
      isSwipingRef.current = true;
    }
  }, []);

  const handleInteractionEnd = useCallback((clientX: number, clientY: number) => {
    if (!swipeStartRef.current || !isSwipingRef.current) {
      swipeStartRef.current = null;
      isSwipingRef.current = false;
      return;
    }

    const startX = swipeStartRef.current.x;
    const startY = swipeStartRef.current.y;
    const endX = clientX;
    const endY = clientY;

    swipeStartRef.current = null;
    isSwipingRef.current = false;

    // Don't activate global gestures if an AI modal is currently open and being interacted with.
    // This provides a modicum more control to the user over active modals.
    // TODO: A more robust check would involve checking if the pointer is *over* any active modal.
    if (activeModals.length > 0 && (getCenterZone(startX, startY) || getCenterZone(endX, endY))) {
      return; // If starting or ending in center, and modals are open, assume interaction with modals.
    }

    if (!isDiagonalSwipe(startX, startY, endX, endY)) return;

    const startZone = getCornerZone(startX, startY);
    const endInCenter = getCenterZone(endX, endY);
    const startInCenter = getCenterZone(startX, startY);
    const endZone = getCornerZone(endX, endY);

    // Swipe in from corner to open menu
    if (!isMenuOpen && !activeModals.length && startZone && endInCenter) {
      setIsMenuOpen(true);
    }
    // Swipe out from center to close menu
    else if (isMenuOpen && startInCenter && endZone) {
      setIsMenuOpen(false);
    }
  }, [isMenuOpen, activeModals.length, getCornerZone, getCenterZone, isDiagonalSwipe]);

  // Mouse and Touch Event Listeners for global gestures
  const handleGlobalMouseDown = useCallback((e: React.MouseEvent) => {
    // Only track global gestures if not interacting with ForgeRing or a modal directly
    const target = e.target as HTMLElement;
    if (target.closest('#forge-ring') || target.closest('.draggable-modal-wrapper')) {
      return;
    }
    handleInteractionStart(e.clientX, e.clientY);
  }, [handleInteractionStart]);

  const handleGlobalMouseMove = useCallback((e: React.MouseEvent) => {
    // Only track global gestures if not interacting with ForgeRing or a modal directly
    const target = e.target as HTMLElement;
    if (target.closest('#forge-ring') || target.closest('.draggable-modal-wrapper')) {
      return;
    }
    handleInteractionMove(e.clientX, e.clientY);
  }, [handleInteractionMove]);

  const handleGlobalMouseUp = useCallback((e: React.MouseEvent) => {
    // Only track global gestures if not interacting with ForgeRing or a modal directly
    const target = e.target as HTMLElement;
    if (target.closest('#forge-ring') || target.closest('.draggable-modal-wrapper')) {
      return;
    }
    handleInteractionEnd(e.clientX, e.clientY);
  }, [handleInteractionEnd]);

  const handleGlobalTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track global gestures if not interacting with ForgeRing or a modal directly
    const target = e.target as HTMLElement;
    if (target.closest('#forge-ring') || target.closest('.draggable-modal-wrapper')) {
      return;
    }
    const touch = e.touches[0];
    handleInteractionStart(touch.clientX, touch.clientY);
  }, [handleInteractionStart]);

  const handleGlobalTouchMove = useCallback((e: React.TouchEvent) => {
    // Only track global gestures if not interacting with ForgeRing or a modal directly
    const target = e.target as HTMLElement;
    if (target.closest('#forge-ring') || target.closest('.draggable-modal-wrapper')) {
      return;
    }
    const touch = e.touches[0];
    handleInteractionMove(touch.clientX, touch.clientY);
  }, [handleInteractionMove]);

  const handleGlobalTouchEnd = useCallback((e: React.TouchEvent) => {
    // Only track global gestures if not interacting with ForgeRing or a modal directly
    const target = e.target as HTMLElement;
    if (target.closest('#forge-ring') || target.closest('.draggable-modal-wrapper')) {
      return;
    }
    const touch = e.changedTouches[0];
    handleInteractionEnd(touch.clientX, touch.clientY);
  }, [handleInteractionEnd]);


  useEffect(() => {
    // Add event listeners to the window for global swipe detection
    window.addEventListener('mousedown', handleGlobalMouseDown);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchstart', handleGlobalTouchStart);
    window.addEventListener('touchmove', handleGlobalTouchMove);
    window.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      window.removeEventListener('mousedown', handleGlobalMouseDown);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchstart', handleGlobalTouchStart);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [handleGlobalMouseDown, handleGlobalMouseMove, handleGlobalMouseUp, handleGlobalTouchStart, handleGlobalTouchMove, handleGlobalTouchEnd]);


  const renderAIFeatureModals = () => {
    return activeModals.map(modal => (
      <DraggableModalWrapper
        key={modal.id}
        id={modal.id}
        initialX={modal.x}
        initialY={modal.y}
        onClose={() => handleCloseAIFeature(modal.id)}
        onDrag={handleDragModal}
        title={modal.type.charAt(0).toUpperCase() + modal.type.slice(1).replace(/([A-Z])/g, ' $1') + ' AI'} // Nicer title from type
      >
        {(() => {
          switch (modal.type) {
            case 'chat':
              return <AIChatModal geolocation={geolocation} />;
            case 'generateImage':
              return <ImageGenerationModal />;
            case 'analyzeImage':
              return <ImageAnalysisModal />;
            case 'generateVideo':
              return <VideoGenerationModal />;
            case 'analyzeVideo':
              return <VideoAnalysisModal />;
            case 'codeForge':
              return (
                <div className="p-8 text-center bg-gray-800 rounded-lg shadow-xl text-white">
                  <h2 className="text-3xl font-bold text-blue-400 mb-4">Code Forge</h2>
                  <p className="text-lg text-gray-300 mb-6">Your AI-powered IDE workspace. Coming soon!</p>
                </div>
              );
            default:
              return null;
          }
        })()}
      </DraggableModalWrapper>
    ));
  };

  return (
    <div className="relative w-screen h-screen">
      <ForgeRing
        x={ringPosition.x}
        y={ringPosition.y}
        onDrag={handleRingDrag}
        onClick={handleRingClick}
      />
      <RadialMenu
        isOpen={isMenuOpen && activeModals.length === 0} // Only show radial menu if no AI modals are open
        onMenuItemClick={handleMenuItemClick}
      />

      {renderAIFeatureModals()}
      {showApiKeyPrompt && (
        <ApiKeyPrompt onClose={() => setShowApiKeyPrompt(false)} onSelectKey={handleOpenApiKeySelection} />
      )}

      <div className="fixed bottom-5 left-5 text-blue-400 text-xs sm:text-sm z-10">
        GlassForge v0.0.1 | Drag the orb • Click for actions • Swipe from corners to summon • Swipe from center to dismiss
      </div>
    </div>
  );
};

export default App;