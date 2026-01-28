import React from 'react';
import { ArrowLeft, RotateCcw, FlipHorizontal, FlipVertical } from 'lucide-react';

interface RotateFlipPanelProps {
    onRotate: (deg: number) => void;
    onFlip: (axis: 'horizontal' | 'vertical') => void;
    onBack: () => void;
}

export const RotateFlipPanel: React.FC<RotateFlipPanelProps> = ({ onRotate, onFlip, onBack }) => (
    <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl h-full flex flex-col flex-shrink-0">
        <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
            <button onClick={onBack} className="p-1 hover:bg-gray-700/50 rounded-full">
                <ArrowLeft size={20} />
            </button>
            <h2 className="font-semibold text-sm">Girar e Virar</h2>
        </header>
        <div className="p-4 space-y-4">
            <div>
                <h3 className="text-xs text-gray-400 mb-2 px-1">GIRAR</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => onRotate(-90)} className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-700/50 rounded-md hover:bg-gray-600/50"><RotateCcw size={16} style={{transform: 'scaleX(-1)'}}/> Esquerda</button>
                    <button onClick={() => onRotate(90)} className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-700/50 rounded-md hover:bg-gray-600/50"><RotateCcw size={16}/> Direita</button>
                </div>
            </div>
             <div>
                <h3 className="text-xs text-gray-400 mb-2 px-1">VIRAR</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => onFlip('horizontal')} className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-700/50 rounded-md hover:bg-gray-600/50"><FlipHorizontal size={16} /> Horizontal</button>
                    <button onClick={() => onFlip('vertical')} className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-700/50 rounded-md hover:bg-gray-600/50"><FlipVertical size={16}/> Vertical</button>
                </div>
            </div>
        </div>
    </div>
);
