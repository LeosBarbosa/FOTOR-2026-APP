
import React from 'react';
import { Crop, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Eye, Hand } from 'lucide-react';

const ToolButton: React.FC<{
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  onDoubleClick?: () => void;
  disabled?: boolean;
  isActive?: boolean;
}> = ({ label, icon: Icon, onClick, onDoubleClick, disabled, isActive }) => (
  <button
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    disabled={disabled}
    title={label}
    className={`flex items-center justify-center p-2 rounded-md transition-colors ${
        isActive 
            ? 'bg-blue-600 text-white' 
            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed'
    }`}
  >
    <Icon size={20} />
  </button>
);

const Separator: React.FC = () => (
    <div className="w-px h-6 bg-gray-600/50"></div>
);

interface TopToolbarProps {
    onCrop: () => void;
    onRotate: (deg: number) => void;
    onFlip: (axis: 'horizontal' | 'vertical') => void;
    onToggleCompare: () => void;
    isCompareActive: boolean;
    onHandToolToggle: () => void;
    isHandToolActive: boolean;
    onFitScreen: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  onCrop,
  onRotate,
  onFlip,
  onToggleCompare,
  isCompareActive,
  onHandToolToggle,
  isHandToolActive,
  onFitScreen,
}) => {
  return (
    <div className="bg-[#2c2c2c] flex-shrink-0 px-2 sm:px-4 py-2 border-b border-gray-700/50">
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
        <ToolButton 
            label="Ferramenta Mão (H ou Espaço)" 
            icon={Hand} 
            onClick={onHandToolToggle} 
            onDoubleClick={onFitScreen}
            isActive={isHandToolActive} 
        />
        <Separator />
        <ToolButton label="Cortar" icon={Crop} onClick={onCrop} />
        <Separator />
        <ToolButton label="Girar à Esquerda" icon={RotateCcw} onClick={() => onRotate(-90)} />
        <ToolButton label="Girar à Direita" icon={RotateCw} onClick={() => onRotate(90)} />
        <Separator />
        <ToolButton label="Virar Horizontalmente" icon={FlipHorizontal} onClick={() => onFlip('horizontal')} />
        <ToolButton label="Virar Verticalmente" icon={FlipVertical} onClick={() => onFlip('vertical')} />
        <Separator />
        <ToolButton label="Comparar Antes/Depois" icon={Eye} onClick={onToggleCompare} isActive={isCompareActive} />
      </div>
    </div>
  );
};
