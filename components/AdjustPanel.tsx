import React, { useState, Suspense } from 'react';
import { Wand, Crop, RotateCcw, SlidersHorizontal, Droplets, Triangle, CircleDot, ChevronRight, HelpCircle, Sun } from 'lucide-react';
import { Accordion } from './ActionPanel';
import { HslPanel } from './HslPanel';
import { StructurePanel } from './StructurePanel';
import { BasicAdjustmentsPanel } from './panels/BasicAdjustmentsPanel';
import { RotateFlipPanel } from './panels/RotateFlipPanel';
import { CropPanel } from './panels/CropPanel';

// Lazy load the new panel to avoid circular dependencies or large bundle sizes immediately
const LightingPanel = React.lazy(() => import('./LightingPanel').then(module => ({ default: module.LightingPanel })));

const ToggleRow: React.FC<{ icon: React.ElementType; label: string }> = ({ icon: Icon, label }) => (
    <div className="flex items-center justify-between px-4 py-2 text-white mx-1 gap-2">
        <div className="flex items-center gap-3 min-w-0">
            <Icon size={18} className="text-gray-300" />
            <span className="text-sm font-medium truncate">{label}</span>
        </div>
        <div className="relative w-10 h-5 bg-gray-600 rounded-full">
            <div className="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full"></div>
        </div>
    </div>
);

const ToolRow: React.FC<{ icon: React.ElementType; label: string, onClick?: () => void; }> = ({ icon: Icon, label, onClick }) => (
    <div onClick={onClick} className="flex items-center justify-between px-4 py-2 text-white hover:bg-gray-700/50 rounded-md cursor-pointer mx-1 gap-2">
        <div className="flex items-center gap-3 min-w-0">
            <Icon size={18} className="text-gray-300" />
            <span className="text-sm font-medium truncate">{label}</span>
             <HelpCircle size={14} className="text-gray-500" />
        </div>
        <ChevronRight size={18} className="text-gray-500 flex-shrink-0" />
    </div>
);
const SimpleToolRow: React.FC<{ icon: React.ElementType; label: string; onClick?: () => void; }> = ({ icon: Icon, label, onClick }) => (
    <div onClick={onClick} className="flex items-center justify-between px-4 py-2 text-white hover:bg-gray-700/50 rounded-md cursor-pointer mx-1 gap-2">
        <div className="flex items-center gap-3 min-w-0">
            <Icon size={18} className="text-gray-300" />
            <span className="text-sm font-medium truncate">{label}</span>
        </div>
        <ChevronRight size={18} className="text-gray-500 flex-shrink-0" />
    </div>
);

interface AdjustPanelProps {
    onRotate: (deg: number) => void;
    onFlip: (axis: 'horizontal' | 'vertical') => void;
    adjustments: { brightness: number, contrast: number, saturate: number, sharpness: number, hue: number };
    onAdjustmentChange: (adj: 'brightness' | 'contrast' | 'saturate' | 'sharpness' | 'hue', value: number) => void;
    onAllAdjustmentsReset: () => void;
    image: string | null;
    onApply: (newImage: string) => void;
    onCropStart: () => void;
    onCropApply: () => void;
    onCropCancel: () => void;
    onMagicEnhance?: () => void;
}

export const AdjustPanel: React.FC<AdjustPanelProps> = ({ onRotate, onFlip, adjustments, onAdjustmentChange, onAllAdjustmentsReset, image, onApply, onCropStart, onCropApply, onCropCancel, onMagicEnhance }) => {
    const [activeSubPanel, setActiveSubPanel] = useState<string | null>(null);

    if (activeSubPanel === 'rotate-flip') {
        return <RotateFlipPanel onRotate={onRotate} onFlip={onFlip} onBack={() => setActiveSubPanel(null)} />
    }
    if (activeSubPanel === 'basic-adjust') {
        return <BasicAdjustmentsPanel adjustments={adjustments} onAdjustmentChange={onAdjustmentChange} onBack={() => setActiveSubPanel(null)} />
    }
    if (activeSubPanel === 'hsl') {
        return <HslPanel image={image} onApply={onApply} onBack={() => setActiveSubPanel(null)} />
    }
    if (activeSubPanel === 'crop') {
        return <CropPanel onApply={onCropApply} onCancel={() => { onCropCancel(); setActiveSubPanel(null); }} />;
    }
    if (activeSubPanel === 'structure') {
        return <StructurePanel image={image} onApply={onApply} onBack={() => setActiveSubPanel(null)} />;
    }
    if (activeSubPanel === 'lighting') {
        return (
            <Suspense fallback={<div className="p-4 text-white">Carregando...</div>}>
                <LightingPanel image={image} onApply={onApply} onBack={() => setActiveSubPanel(null)} />
            </Suspense>
        );
    }

    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl flex flex-col h-full flex-shrink-0">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                
                <Accordion title="Ferramentas Inteligentes">
                    <div className="px-1 py-1 space-y-1">
                        <SimpleToolRow icon={Wand} label="Aprimoramento Mágico" onClick={onMagicEnhance} />
                        <ToolRow icon={Wand} label="Borracha Mágica" />
                    </div>
                </Accordion>

                <Accordion title="Tamanho">
                    <div className="px-1 py-1 space-y-1">
                        <SimpleToolRow icon={Crop} label="Cortar" onClick={() => { onCropStart(); setActiveSubPanel('crop'); }}/>
                        <SimpleToolRow icon={RotateCcw} label="Girar e virar" onClick={() => setActiveSubPanel('rotate-flip')} />
                    </div>
                </Accordion>

                <Accordion title="Brilho & Cor">
                     <div className="px-1 py-1 space-y-1">
                        <SimpleToolRow icon={SlidersHorizontal} label="Ajuste básico" onClick={() => setActiveSubPanel('basic-adjust')} />
                        <SimpleToolRow icon={Droplets} label="HSL" onClick={() => setActiveSubPanel('hsl')} />
                        <SimpleToolRow icon={Sun} label="Iluminação" onClick={() => setActiveSubPanel('lighting')} />
                    </div>
                </Accordion>
                
                <Accordion title="Edições Avançadas">
                    <div className="px-1 py-1 space-y-1">
                        <SimpleToolRow icon={Triangle} label="Estrutura" onClick={() => setActiveSubPanel('structure')} />
                        <SimpleToolRow icon={CircleDot} label="Desfoque" />
                    </div>
                </Accordion>

            </div>
            <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
                <button
                    onClick={onAllAdjustmentsReset}
                    className="w-full text-sm text-blue-400 hover:text-white transition-colors py-2 rounded-md hover:bg-gray-700/50 flex items-center justify-center gap-2"
                >
                    <RotateCcw size={16} />
                    Redefinir Ajustes
                </button>
            </div>
        </div>
    );
};
