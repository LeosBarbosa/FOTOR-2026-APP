
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { EditorInterface } from './components/EditorInterface';
import { UpscalerScreen } from './screens/UpscalerScreen';
import { PortraitScreen } from './screens/PortraitScreen';
import { NoiseRemoverScreen } from './screens/NoiseRemoverScreen';
import { ColorizeScreen } from './screens/ColorizeScreen';
import { ImageGeneratorScreen } from './screens/ImageGeneratorScreen';
import { OneTapEnhanceScreen } from './screens/OneTapEnhanceScreen';
import { BackgroundRemoverScreen } from './screens/BackgroundRemoverScreen';
import { AiSkinRetouchScreen } from './screens/AiSkinRetouchScreen';
import { MagicEraserScreen } from './screens/MagicEraserScreen';
import { FaceBlurScreen } from './screens/FaceBlurScreen';
import { WatermarkRemoverScreen } from './screens/WatermarkRemoverScreen';
import { BackgroundBlurScreen } from './screens/BackgroundBlurScreen';
import { ChangeBackgroundScreen } from './screens/ChangeBackgroundScreen';
import { OldPhotoRestorerScreen } from './screens/OldPhotoRestorerScreen';
import { OcrScreen } from './screens/OcrScreen';
import { HeadshotScreen } from './screens/HeadshotScreen';
import { ImageExpandScreen } from './screens/ImageExpandScreen';
import { AiReplaceScreen } from './screens/AiReplaceScreen';
import { AiBackgroundScreen } from './screens/AiBackgroundScreen';
import { VirtualTattooScreen } from './screens/VirtualTattooScreen';
import { Upcoming2026Screen } from './screens/Upcoming2026Screen';
import { CinematicPortraitScreen } from './screens/CinematicPortraitScreen';
import { AiMagicEditScreen } from './screens/AiMagicEditScreen';
import { ImageAnalysisScreen } from './screens/ImageAnalysisScreen';
import { ColoringBookScreen } from './screens/ColoringBookScreen';
import { FutureFamilyScreen } from './screens/FutureFamilyScreen';
import { LifestyleSceneScreen } from './screens/LifestyleSceneScreen';
import { VirtualTryOnScreen } from './screens/VirtualTryOnScreen';
import { LiquifyScreen } from './screens/LiquifyScreen';
import { ProgressiveSalienceScreen } from './screens/ProgressiveSalienceScreen';
import { FaceSwapScreen } from './screens/FaceSwapScreen';
import { EditorProvider } from './contexts/EditorContext';

const MainEditor: React.FC = () => {
    const [currentTool, setCurrentTool] = useState<string | null>('old-photo-restorer');
    const [imageForEditor, setImageForEditor] = useState<string | null>(null);

    const handleToolSelect = (toolId: string, image: string | null) => {
        setCurrentTool(toolId);
        setImageForEditor(image);
    };

    const handleGoBack = () => {
        setCurrentTool(null);
        setImageForEditor(null);
    };
    
    const handleImageProcessComplete = (imageUrl: string) => {
        setImageForEditor(imageUrl);
        setCurrentTool(null); // Go back to the main editor
    };

    const toolScreens: { [key: string]: React.ReactElement } = {
        'ai-magic-edit': <AiMagicEditScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'image-analysis': <ImageAnalysisScreen onBack={handleGoBack} initialImage={imageForEditor} />,
        'ai-image-generator': <ImageGeneratorScreen onBack={handleGoBack} onImageGenerated={handleImageProcessComplete} />,
        'one-tap-enhance': <OneTapEnhanceScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'bg-remover': <BackgroundRemoverScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'ai-upscaler': <UpscalerScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'ai-portrait': <PortraitScreen onBack={handleGoBack} initialImage={imageForEditor} />,
        'ai-noise-remover': <NoiseRemoverScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'colorize': <ColorizeScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'ai-skin-retouch': <AiSkinRetouchScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'magic-eraser': <MagicEraserScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'face-blur': <FaceBlurScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'watermark-remover': <WatermarkRemoverScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'bg-blur': <BackgroundBlurScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'change-bg': <ChangeBackgroundScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'old-photo-restorer': <OldPhotoRestorerScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'ocr': <OcrScreen onBack={handleGoBack} />,
        'ai-headshot': <HeadshotScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'ai-expand': <ImageExpandScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'ai-replace': <AiReplaceScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'ai-bg': <AiBackgroundScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'virtual-tattoo': <VirtualTattooScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'upcoming-2026': <Upcoming2026Screen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'cinematic-portrait': <CinematicPortraitScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} />,
        'coloring-book': <ColoringBookScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'future-family': <FutureFamilyScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'lifestyle-scene': <LifestyleSceneScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'virtual-try-on': <VirtualTryOnScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'liquify': <LiquifyScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'progressive-salience': <ProgressiveSalienceScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
        'face-swap': <FaceSwapScreen onBack={handleGoBack} onEdit={handleImageProcessComplete} initialImage={imageForEditor} />,
    };
    
    if (currentTool && toolScreens[currentTool]) {
        return toolScreens[currentTool];
    }

    return <EditorInterface onToolSelect={handleToolSelect} initialImage={imageForEditor} onClearInitialImage={() => setImageForEditor(null)} />;
};

const App: React.FC = () => {
    return (
        <EditorProvider>
            <Routes>
                <Route path="*" element={<MainEditor />} />
            </Routes>
        </EditorProvider>
    );
};

export default App;
