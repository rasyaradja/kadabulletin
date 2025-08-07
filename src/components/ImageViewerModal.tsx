import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

export function ImageViewerModal({ isOpen, onClose, imageUrl }: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetTransform();
    }
  }, [isOpen, resetTransform]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const scaleAmount = 0.1;
    const newScale = event.deltaY < 0 ? scale * (1 + scaleAmount) : scale / (1 + scaleAmount);
    setScale(Math.max(0.1, Math.min(newScale, 5))); // Limit zoom between 0.1x and 5x
  }, [scale]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    if (scale > 1) { // Only allow dragging if zoomed in
      setIsDragging(true);
      setStartDrag({ x: event.clientX - position.x, y: event.clientY - position.y });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    if (isDragging) {
      setPosition({
        x: event.clientX - startDrag.x,
        y: event.clientY - startDrag.y,
      });
    }
  }, [isDragging, startDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        onWheel={handleWheel}
        hideCloseButton
        variant="fullScreen"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:bg-white/20 z-[100]"
        >
          <X className="h-6 w-6" />
        </Button>

        <div
          ref={containerRef}
          className="flex items-center justify-center w-[80vw] h-screen bg-black mx-auto"
          style={{ cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'default') }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Viewer"
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'zoom-in'),
              touchAction: 'none', // Disable default touch actions like pinch-zoom
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            draggable="false" // Prevent native drag behavior
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
