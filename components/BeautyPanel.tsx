
import React from 'react';
import { ChevronRight, HelpCircle, Eraser, Wand, Droplets, SmilePlus, PersonStanding, Smile, EyeOff, Palette, Paintbrush, SwatchBook, GitBranch, Eye, Shirt, CalendarClock, Sparkles, ScanFace } from 'lucide-react';
import { Accordion } from './ActionPanel';

const ToolRow: React.FC<{ icon: React.ElementType; label: string; onClick?: () => void; isAi?: boolean }> = ({ icon: Icon, label, onClick, isAi = false }) => (
    <button
        onClick={onClick}
        disabled={!onClick}
        className="flex items-center justify-between px-4 py-2 text-white hover:bg-gray-700/50 rounded-md cursor-pointer mx-1 w-full text-left disabled:cursor-not-allowed gap-2"
    >
        <div className="flex items-center gap-3 min-w-0">
            <Icon size={18} className="text-gray-300 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{label}</span>
            {isAi && <Sparkles size={14} className="text-yellow-400 flex-shrink-0" />}
             <HelpCircle size={14} className="text-gray-500 flex-shrink-0" />
        </div>
        <ChevronRight size={18} className="text-gray-500 flex-shrink-0" />
    </button>
);

interface BeautyPanelProps {
    onSelectSubTool: (toolId: string) => void;
    onToolSelect: (toolId: string) => void;
}

export const BeautyPanel: React.FC<BeautyPanelProps> = ({ onSelectSubTool, onToolSelect }) => {
    return (
        <div className="w-[calc(100vw-5rem)] sm:w-80 bg-[#2c2c2c]/90 backdrop-blur-lg shadow-2xl flex flex-col h-full flex-shrink-0">
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                
                <Accordion title="Ferramentas de IA">
                    <div className="px-1 py-1 space-y-1">
                        <ToolRow icon={Shirt} label="Provador de roupas com IA" isAi onClick={() => onToolSelect('virtual-try-on')} />
                        <ToolRow icon={CalendarClock} label="Trocador de Idade IA" isAi onClick={() => onSelectSubTool('ai-age-changer')} />
                        <ToolRow icon={ScanFace} label="Aprimorar Rosto IA" isAi onClick={() => onSelectSubTool('ai-face-enhance')} />
                        <ToolRow icon={Sparkles} label="Retoque de pele AI" isAi onClick={() => onToolSelect('ai-skin-retouch')} />
                    </div>
                </Accordion>

                <Accordion title="Retoque de Pele">
                    <div className="px-1 py-1 space-y-1">
                        <ToolRow icon={Eraser} label="Remoção de manchas" />
                        <ToolRow icon={Wand} label="Removedor de rugas" />
                        <ToolRow icon={Droplets} label="Suavização da pele" />
                    </div>
                </Accordion>

                <Accordion title="Remodelar">
                    <div className="px-1 py-1 space-y-1">
                        <ToolRow icon={SmilePlus} label="Remodelar rosto" />
                        <ToolRow icon={PersonStanding} label="Emagrecimento" />
                    </div>
                </Accordion>
                
                <Accordion title="Maquiagem">
                    <div className="px-1 py-1 space-y-1">
                        <ToolRow icon={Paintbrush} label="Cor dos lábios" />
                        <ToolRow icon={SwatchBook} label="Base" />
                        <ToolRow icon={GitBranch} label="Sobrancelha" />
                        <ToolRow icon={Palette} label="Sombra" />
                    </div>
                </Accordion>
                
                <Accordion title="Outros">
                    <div className="px-1 py-1 space-y-1">
                        <ToolRow icon={Smile} label="Clareamento dental" />
                        <ToolRow icon={EyeOff} label="Removedor de olhos vermelhos" />
                        <ToolRow icon={Eye} label="Cor dos olhos" />
                    </div>
                </Accordion>
            </div>
        </div>
    );
};
