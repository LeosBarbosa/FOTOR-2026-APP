import React from 'react';
import { ArrowLeft } from 'lucide-react';

type AdjustmentKeys = 'brightness' | 'contrast' | 'saturate' | 'sharpness' | 'hue';

interface BasicAdjustmentsPanelProps {
    adjustments: Record<AdjustmentKeys, number>;
    onAdjustmentChange: (adj: AdjustmentKeys, value: number) => void;
    onBack: () => void;
}

export const BasicAdjustmentsPanel: React.FC<BasicAdjustmentsPanelProps> = ({ adjustments, onAdjustmentChange, onBack }) => {
    const adjInfo: Record<AdjustmentKeys, { label: string; min: number; max: number }> = {
        brightness: { label: 'Brilho', min: 0, max: 200 },
        contrast: { label: 'Contraste', min: 0, max: 200 },
        saturate: { label: 'Saturação', min: 0, max: 200 },
        sharpness: { label: 'Nitidez', min: 0, max: 200 },
        hue: { label: 'Matiz', min: -180, max: 180 },
    };

    // Define the order of controls
    const controlOrder: AdjustmentKeys[] = ['brightness', 'contrast', 'saturate', 'sharpness', 'hue'];

    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl h-full flex flex-col flex-shrink-0">
            <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onBack} className="p-1 hover:bg-gray-700/50 rounded-full"><ArrowLeft size={20} /></button>
                <h2 className="font-semibold text-sm">Ajuste Básico</h2>
            </header>
            <div className="p-4 space-y-4">
                {controlOrder.map((key) => (
                    <div key={key}>
                        <div className="flex justify-between items-center text-xs mb-1 group">
                            <label className="text-gray-300 flex items-center gap-2">
                                {adjInfo[key].label}
                                <button 
                                    onClick={() => onAdjustmentChange(key, key === 'hue' ? 0 : 100)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-blue-400 hover:text-blue-300"
                                    title="Redefinir"
                                >
                                    ↺
                                </button>
                            </label>
                            <span className="text-white font-mono">
                                {adjustments[key]}
                                {key === 'hue' ? '°' : ''}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={adjInfo[key].min}
                            max={adjInfo[key].max}
                            step="1"
                            value={adjustments[key]}
                            onInput={(e) => onAdjustmentChange(key, Number(e.currentTarget.value))}
                            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
