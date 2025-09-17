import { useState, useEffect } from 'react';
import { isTouchDevice } from '@/lib/navigation-utils';

// Mobile drawer state management hook
export function useMobileDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(!isOpen);
  
  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

// Touch gesture handling for drawer swipe to close
export function useDrawerGestures(onClose: () => void) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  
  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent, startXRef: React.MutableRefObject<number>, currentXRef: React.MutableRefObject<number>) => {
    if (!isTouchDevice()) return;
    
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    currentXRef.current = touch.clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent, startXRef: React.MutableRefObject<number>, currentXRef: React.MutableRefObject<number>) => {
    if (!isDragging || !isTouchDevice()) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    currentXRef.current = touch.clientX;
    const diff = touch.clientX - startXRef.current;
    
    // Only allow leftward swipe (closing gesture)
    if (diff < 0) {
      setDragOffset(Math.max(diff, -300)); // Limit drag distance
    }
  };

  const handleTouchEnd = (startXRef: React.MutableRefObject<number>, currentXRef: React.MutableRefObject<number>) => {
    if (!isDragging) return;
    
    const diff = currentXRef.current - startXRef.current;
    setIsDragging(false);
    setDragOffset(0);
    
    // If swiped left more than 100px, close the drawer
    if (diff < -100) {
      onClose();
    }
  };

  return {
    isDragging,
    dragOffset,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}