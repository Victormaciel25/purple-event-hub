
import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";
import OptimizedImage from "@/components/OptimizedImage";

interface ImageViewerProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  isOpen,
  onClose,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      goToPrevious();
    } else if (event.key === "ArrowRight") {
      goToNext();
    } else if (event.key === "Escape") {
      onClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStart) return;
    setIsDragging(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!dragStart || !isDragging) {
      setDragStart(null);
      setIsDragging(false);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - dragStart.x;
    const threshold = 50;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }

    setDragStart(null);
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return;
    setIsDragging(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragStart || !isDragging) {
      setDragStart(null);
      setIsDragging(false);
      return;
    }

    const deltaX = e.clientX - dragStart.x;
    const threshold = 50;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }

    setDragStart(null);
    setIsDragging(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="bg-white/95" />
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-white hover:bg-gray-100 text-black rounded-full border shadow-lg"
            onClick={onClose}
          >
            <X size={24} />
          </Button>

          {/* Previous button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-gray-100 text-black rounded-full border shadow-lg"
              onClick={goToPrevious}
            >
              <ChevronLeft size={24} />
            </Button>
          )}

          {/* Image */}
          <div 
            className="w-full h-full flex items-center justify-center p-8 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <OptimizedImage
              src={images[currentIndex]}
              alt={`Imagem ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg pointer-events-none"
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-white hover:bg-gray-100 text-black rounded-full border shadow-lg"
              onClick={goToNext}
            >
              <ChevronRight size={24} />
            </Button>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-1 rounded-full text-sm border shadow-lg">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
