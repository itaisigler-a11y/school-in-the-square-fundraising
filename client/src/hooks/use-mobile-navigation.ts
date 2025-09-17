import { useState, useEffect } from 'react';
import { isTouchDevice } from '@/lib/navigation-utils';

// Mobile navigation gestures and interactions
export function useMobileNavGestures() {
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [gestureStartY, setGestureStartY] = useState(0);

  // Handle swipe up gesture on mobile bottom nav
  const handleGestureStart = (e: React.TouchEvent) => {
    if (!isTouchDevice()) return;
    
    const touch = e.touches[0];
    setGestureStartY(touch.clientY);
    setIsGestureActive(true);
  };

  const handleGestureMove = (e: React.TouchEvent) => {
    if (!isGestureActive || !isTouchDevice()) return;
    
    const touch = e.touches[0];
    const deltaY = gestureStartY - touch.clientY;
    
    // Detect upward swipe
    if (deltaY > 50) {
      // Could trigger additional navigation actions
      console.log('Upward swipe detected on mobile nav');
    }
  };

  const handleGestureEnd = () => {
    setIsGestureActive(false);
    setGestureStartY(0);
  };

  // Haptic feedback for touch interactions (if available)
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Light haptic feedback
    }
  };

  return {
    isGestureActive,
    handleGestureStart,
    handleGestureMove,
    handleGestureEnd,
    triggerHapticFeedback,
  };
}