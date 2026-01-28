
import React, { useState, useRef, useEffect } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface NeuroCompareProps {
  beforeImage: string;
  afterImage: string;
}

export const NeuroCompare: React.FC<NeuroCompareProps> = ({ beforeImage, afterImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Função que calcula a posição do mouse/toque
  const handleMove = (event: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent | React.MouseEvent).clientX;
    const x = clientX - rect.left;
    const width = rect.width;
    
    // Garante que fique entre 0 e 100%
    const position = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(position);
  };

  // Listeners globais para arrastar suavemente mesmo se sair da área
  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    const handleMoveGlobal = (e: MouseEvent | TouchEvent) => {
      if (isDragging) handleMove(e);
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
      window.addEventListener('mousemove', handleMoveGlobal);
      window.addEventListener('touchmove', handleMoveGlobal);
    }

    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('mousemove', handleMoveGlobal);
      window.removeEventListener('touchmove', handleMoveGlobal);
    };
  }, [isDragging]);

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 select-none">
      <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400 mb-2 font-bold">
        <span>Original (Cenário)</span>
        <span className="text-indigo-400">NeuroBlend (Resultado)</span>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full aspect-[4/5] md:aspect-square overflow-hidden rounded-xl border-2 border-slate-700 shadow-2xl cursor-col-resize group bg-[#0d1117]"
        onMouseDown={(e) => { setIsDragging(true); handleMove(e); }}
        onTouchStart={(e) => { setIsDragging(true); handleMove(e); }}
      >
        {/* IMAGEM 1: AFTER (Resultado - Fundo) */}
        <img 
          src={afterImage} 
          alt="After" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
          draggable="false"
        />

        {/* IMAGEM 2: BEFORE (Original - Recortada pela Div) */}
        <div 
          className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white/50 bg-[#0d1117]"
          style={{ width: `${sliderPosition}%` }}
        >
          <img 
            src={beforeImage} 
            alt="Before" 
            className="absolute inset-0 h-full object-contain max-w-none pointer-events-none" 
            style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }}
            draggable="false"
          />
        </div>

        {/* O SLIDER (A Linha Vertical e o Botão) */}
        <div 
          className="absolute inset-y-0"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Linha Vertical Brilhante */}
          <div className="absolute inset-y-0 -ml-[1px] w-[2px] bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
          
          {/* Botão Central (Handle) */}
          <div className="absolute top-1/2 -translate-y-1/2 -ml-5 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-ew-resize transform group-hover:scale-110 transition-transform z-10">
            <ChevronsLeftRight className="text-indigo-600 w-5 h-5" />
          </div>
        </div>

        {/* Labels Flutuantes */}
        <div 
          className="absolute top-4 left-4 bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-none transition-opacity duration-300 border border-white/10"
          style={{ opacity: sliderPosition < 15 ? 0 : 1 }}
        >
          ORIGINAL
        </div>
        <div 
          className="absolute bottom-4 right-4 bg-indigo-600/90 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur-md pointer-events-none transition-opacity duration-300 shadow-lg border border-white/10"
          style={{ opacity: sliderPosition > 85 ? 0 : 1 }}
        >
          NEUROBLEND
        </div>
      </div>
    </div>
  );
};
