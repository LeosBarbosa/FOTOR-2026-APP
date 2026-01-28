import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Accordion } from '../ActionPanel';

interface CropPanelProps {
    onApply: () => void;
    onCancel: () => void;
}

export const CropPanel: React.FC<CropPanelProps> = ({ onApply, onCancel }) => {
    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl h-full flex flex-col flex-shrink-0">
            <header className="flex items-center gap-4 p-4 border-b border-gray-700/50 flex-shrink-0">
                <button onClick={onCancel} className="p-1 hover:bg-gray-700/50 rounded-full">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="font-semibold text-sm">Cortar Imagem</h2>
            </header>
            <div className="flex-1 overflow-y-auto p-2">
                <Accordion title="Proporções">
                    <div className="px-1 py-1 space-y-1">
                        <p className="text-gray-400 text-xs text-center p-4">Ajuste de proporção em breve.</p>
                    </div>
                </Accordion>
            </div>
            <div className="p-4 border-t border-gray-700/50 flex-shrink-0 flex items-center gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 text-sm text-gray-300 hover:text-white transition-colors py-2 rounded-md hover:bg-gray-700/50"
                >
                    Cancelar
                </button>
                <button
                    onClick={onApply}
                    className="flex-1 text-sm bg-blue-600 text-white font-bold py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Aplicar Corte
                </button>
            </div>
        </div>
    );
};
