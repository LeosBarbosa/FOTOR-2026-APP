import React, { useRef } from 'react';

const getHandleStyles = (position: string) => {
    const style: React.CSSProperties = {
        position: 'absolute',
        width: '10px',
        height: '10px',
        border: '1.5px solid white',
        backgroundColor: '#4f46e5',
        borderRadius: '2px',
        boxShadow: '0 0 3px rgba(0,0,0,0.5)',
        zIndex: 10,
    };
    switch (position) {
        case 'top-left': style.top = '-6px'; style.left = '-6px'; style.cursor = 'nwse-resize'; break;
        case 'top-center': style.top = '-6px'; style.left = '50%'; style.transform = 'translateX(-50%)'; style.cursor = 'ns-resize'; break;
        case 'top-right': style.top = '-6px'; style.right = '-6px'; style.cursor = 'nesw-resize'; break;
        case 'middle-left': style.top = '50%'; style.left = '-6px'; style.transform = 'translateY(-50%)'; style.cursor = 'ew-resize'; break;
        case 'middle-right': style.top = '50%'; style.right = '-6px'; style.transform = 'translateY(-50%)'; style.cursor = 'ew-resize'; break;
        case 'bottom-left': style.bottom = '-6px'; style.left = '-6px'; style.cursor = 'nesw-resize'; break;
        case 'bottom-center': style.bottom = '-6px'; style.left = '50%'; style.transform = 'translateX(-50%)'; style.cursor = 'ns-resize'; break;
        case 'bottom-right': style.bottom = '-6px'; style.right = '-6px'; style.cursor = 'nwse-resize'; break;
    }
    return style;
};

interface CropOverlayProps {
    imageRef: React.RefObject<HTMLImageElement>;
    cropBox: { x: number; y: number; width: number; height: number; };
    setCropBox: (box: { x: number; y: number; width: number; height: number; }) => void;
}

export const CropOverlay: React.FC<CropOverlayProps> = ({ imageRef, cropBox, setCropBox }) => {
    const interaction = useRef<{
        action: 'move' | 'resize';
        handle: string | null;
        startX: number;
        startY: number;
        startBox: typeof cropBox;
    } | null>(null);

    const imageEl = imageRef.current;
    if (!imageEl || !imageEl.naturalWidth) return null;

    const { naturalWidth, naturalHeight } = imageEl;
    const imageRect = imageEl.getBoundingClientRect();
    const { left: imgLeft, top: imgTop, width: imgWidth, height: imgHeight } = imageRect;

    const toImageWidth = (screenWidth: number) => (screenWidth / imgWidth) * naturalWidth;
    const toImageHeight = (screenHeight: number) => (screenHeight / imgHeight) * naturalHeight;

    const handleMouseDown = (e: React.MouseEvent, action: 'move' | 'resize', handle: string | null = null) => {
        e.preventDefault();
        e.stopPropagation();
        interaction.current = { action, handle, startX: e.clientX, startY: e.clientY, startBox: { ...cropBox } };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!interaction.current) return;
        
        const { action, handle, startX, startY, startBox } = interaction.current;
        const dx = toImageWidth(e.clientX - startX);
        const dy = toImageHeight(e.clientY - startY);

        let newBox = { ...startBox };

        if (action === 'move') {
            newBox.x = startBox.x + dx;
            newBox.y = startBox.y + dy;
        } else if (action === 'resize' && handle) {
            if (handle.includes('right')) newBox.width = startBox.width + dx;
            if (handle.includes('left')) { newBox.width = startBox.width - dx; newBox.x = startBox.x + dx; }
            if (handle.includes('bottom')) newBox.height = startBox.height + dy;
            if (handle.includes('top')) { newBox.height = startBox.height - dy; newBox.y = startBox.y + dy; }
            
            if (newBox.width < 10) { newBox.width = 10; newBox.x = handle.includes('left') ? startBox.x + startBox.width - 10 : startBox.x; }
            if (newBox.height < 10) { newBox.height = 10; newBox.y = handle.includes('top') ? startBox.y + startBox.height - 10 : startBox.y; }
        }
        
        // Clamp to image boundaries
        newBox.x = Math.max(0, newBox.x);
        newBox.y = Math.max(0, newBox.y);
        if (newBox.x + newBox.width > naturalWidth) {
             if (action === 'move' || handle?.includes('right')) newBox.width = naturalWidth - newBox.x;
             else if (handle?.includes('left')) newBox.x = naturalWidth - newBox.width;
        }
        if (newBox.y + newBox.height > naturalHeight) {
            if (action === 'move' || handle?.includes('bottom')) newBox.height = naturalHeight - newBox.y;
            else if (handle?.includes('top')) newBox.y = naturalHeight - newBox.height;
        }

        setCropBox(newBox);
    };

    const handleMouseUp = () => {
        interaction.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    const handles = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];

    return (
        <div className="absolute inset-0 z-10" style={{ top: imageRect.top, left: imageRect.left, width: imageRect.width, height: imageRect.height }}>
            <div
                onMouseDown={(e) => handleMouseDown(e, 'move')}
                className="absolute cursor-move"
                style={{
                    left: `${(cropBox.x / naturalWidth) * 100}%`,
                    top: `${(cropBox.y / naturalHeight) * 100}%`,
                    width: `${(cropBox.width / naturalWidth) * 100}%`,
                    height: `${(cropBox.height / naturalHeight) * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                }}
            >
                {handles.map(pos => (
                    <div key={pos} style={getHandleStyles(pos)} onMouseDown={(e) => handleMouseDown(e, 'resize', pos)} />
                ))}
            </div>
        </div>
    );
};
