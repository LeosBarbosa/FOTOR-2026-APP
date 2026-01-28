import React from 'react';
import { Accordion } from './ActionPanel';

const frames = [
    { name: 'Nenhum', style: {} },
    { name: 'Simples Preto', style: { padding: '15px', border: '10px solid black', backgroundColor: 'white' } },
    { name: 'Simples Branco', style: { padding: '15px', border: '10px solid white', backgroundColor: '#333' } },
    { name: 'Madeira', style: { padding: '20px', border: '15px solid #855E42', backgroundColor: '#deb887' } },
    { name: 'Sombra', style: { padding: '10px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.5)' } },
    { name: 'Fino Dourado', style: { padding: '5px', border: '2px solid #FFD700', backgroundColor: 'black' } }
];

interface FramePanelProps {
    onSelectFrame: (style: React.CSSProperties) => void;
}

export const FramePanel: React.FC<FramePanelProps> = ({ onSelectFrame }) => {
    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl flex flex-col h-full flex-shrink-0">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <Accordion title="Molduras">
                    <div className="px-2 py-2 grid grid-cols-2 gap-4">
                        {frames.map(frame => (
                            <button key={frame.name} onClick={() => onSelectFrame(frame.style)} className="flex flex-col items-center gap-2 group">
                                <div className="w-full aspect-square bg-gray-800 flex items-center justify-center p-2 rounded-md group-hover:bg-gray-700">
                                    <div className="w-full h-full bg-gray-500" style={frame.style} />
                                </div>
                                <span className="text-xs text-gray-300 group-hover:text-white">{frame.name}</span>
                            </button>
                        ))}
                    </div>
                </Accordion>
            </div>
        </div>
    );
};