import React, { useState, useRef, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface ImageCompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  afterStyle: React.CSSProperties;
  onLoad: () => void;
}

export const ImageCompareSlider: React.FC<ImageCompareSliderProps> = ({ beforeSrc, afterSrc, afterStyle, onLoad }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPos(percent);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
  };

  const handleInteractionEnd = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    handleMove(e.touches[0].clientX);
  };


  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none cursor-ew-resize max-w-full max-h-full"
      onMouseDown={handleMouseDown}
      onMouseUp={handleInteractionEnd}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleInteractionEnd}
      onTouchStart={handleMouseDown as any}
      onTouchEnd={handleInteractionEnd}
      onTouchMove={handleTouchMove}
    >
      <img 
        src={afterSrc} 
        alt="Depois" 
        className="block max-w-full max-h-full object-contain pointer-events-none"
        style={afterStyle} 
        onLoad={onLoad} 
      />
      
      <div 
        className="absolute inset-0 max-w-full max-h-full overflow-hidden pointer-events-none" 
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img src={beforeSrc} alt="Antes" className="block max-w-full max-h-full object-contain h-full w-full" />
      </div>

      <div
        className="absolute top-0 bottom-0 w-1 bg-white/80 pointer-events-none"
        style={{ left: `calc(${sliderPos}%)` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/80 shadow-md grid place-items-center text-gray-700 backdrop-blur-sm">
          <ChevronsLeftRight size={20} />
        </div>
      </div>
    </div>
  );
};