import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, Expand, RotateCcw, Undo, Redo } from 'lucide-react';

const ToolButton: React.FC<{
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ label, icon: Icon, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center justify-center gap-1.5 text-gray-600 hover:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
  >
    <Icon size={20} />
    <span className="text-xs font-semibold">{label}</span>
  </button>
);

interface BottomToolbarProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomReset: () => void;
  onZoomChange: (newLevel: number) => void;
  onRevertToOriginal: () => void;
  isRevertable: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomReset,
  onZoomChange,
  onRevertToOriginal,
  isRevertable,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [isZoomSliderOpen, setIsZoomSliderOpen] = useState(false);
  const zoomControlRef = useRef<HTMLDivElement>(null);
  const zoomPercentage = Math.round(zoomLevel * 100);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (zoomControlRef.current && !zoomControlRef.current.contains(event.target as Node)) {
            setIsZoomSliderOpen(false);
        }
    };
    if (isZoomSliderOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isZoomSliderOpen]);

  return (
    <div className="bg-[#f0f2f5] flex-shrink-0 px-2 sm:px-4 py-2 border-t border-gray-300">
      <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
        <ToolButton label="Desfazer" icon={Undo} onClick={onUndo} disabled={!canUndo} />
        <ToolButton label="Refazer" icon={Redo} onClick={onRedo} disabled={!canRedo} />

        <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>

        <div ref={zoomControlRef} className="relative flex items-center gap-2 sm:gap-4">
          <button
            onClick={onZoomOut}
            className="p-2 text-gray-600 hover:text-blue-600 rounded-full transition-colors"
            aria-label="Diminuir zoom"
          >
            <ZoomOut size={20} />
          </button>
          <div
            onClick={() => setIsZoomSliderOpen(prev => !prev)}
            className="text-sm font-bold text-gray-800 w-16 text-center cursor-pointer"
            aria-label="Ajustar zoom"
          >
            {zoomPercentage}%
          </div>
          <button
            onClick={onZoomIn}
            className="p-2 text-gray-600 hover:text-blue-600 rounded-full transition-colors"
            aria-label="Aumentar zoom"
          >
            <ZoomIn size={20} />
          </button>
          
          {isZoomSliderOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#3a3a3a] p-4 rounded-lg shadow-lg border border-gray-600 z-10">
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-300 font-mono">{zoomPercentage}%</span>
                    <input
                        type="range"
                        min="10"
                        max="300"
                        step="1"
                        value={zoomPercentage}
                        onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
                        className="w-36 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full"
                    />
                </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>

        <ToolButton label="Ajustar" icon={Expand} onClick={onZoomFit} />
        <ToolButton label="Reverter Original" icon={RotateCcw} onClick={onRevertToOriginal} disabled={!isRevertable} />
      </div>
    </div>
  );
};