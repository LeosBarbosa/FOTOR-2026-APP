
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Zap, Download, Edit, CheckSquare, Square } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64, fileToBlobUrl } from '../utils/fileUtils';

const sampleImages = [
    { name: 'Retrato', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=300&fit=crop' },
    { name: 'Anime', url: 'https://images.unsplash.com/photo-1579401923644-3e3c04c53a7b?w=200&h=300&fit=crop' },
    { name: 'Paisagem', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&h=300&fit=crop' },
    { name: 'Animal', url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&h=300&fit=crop' }
];

const ImageCompare: React.FC<{ before: string; after: string }> = ({ before, after }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const handleMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
        setSliderPos(percent);
    };

    return (
        <div className="relative w-full h-full select-none max-w-3xl mx-auto aspect-[3/4] md:aspect-auto" onMouseMove={handleMove}>
            <img src={after} alt="Depois" className="absolute inset-0 w-full h-full object-contain bg-black/20" decoding="async" />
            <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={before} alt="Antes" className="absolute inset-0 w-full h-full object-contain bg-black/20" decoding="async" />
            </div>
            <div className="absolute top-0 bottom-0 bg-white w-1 cursor-ew-resize" style={{ left: `calc(${sliderPos}% - 2px)` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-8 rounded-full bg-white shadow-md grid place-items-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                </div>
            </div>
             <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Original</div>
             <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">HD+ (IA)</div>
        </div>
    );
};

export const UpscalerScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [originalImage, setOriginalImage] = useState<string | null>(initialImage || null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(2);
    const [enhanceFace, setEnhanceFace] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (file: File) => {
        const blobUrl = fileToBlobUrl(file);
        setOriginalImage(blobUrl);
        setProcessedImage(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            handleImageUpload(e.target.files[0]);
        }
    };
    
    const handleSampleSelect = (url: string) => {
        setOriginalImage(url);
        setProcessedImage(null);
    };

    const handleUpscale = async () => {
        if (!originalImage) return;

        setIsProcessing(true);
        setError(null);
        try {
            const { base64, mimeType } = await imageUrlToBase64(originalImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const scaleText = scale === 2 ? "dobrando suas dimensões (2x)" : "quadruplicando suas dimensões (4x) para uma resolução ultra-alta";
            
            let prompt = `Upscale this image to higher resolution, ${scaleText}. Significantly improve details, clarity, and sharpness without artifacts. Maintain original composition and colors. Output a high-definition version.`;

            if (enhanceFace) {
                prompt += " SPECIAL FOCUS ON FACES: Restore human faces to be natural, sharp, and realistic. Fix eyes and skin texture.";
            }
            
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
              config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let newImageFound = false;

            for (const part of parts) {
                if (part.inlineData) {
                    const newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    setProcessedImage(newImageUrl);
                    newImageFound = true;
                    break;
                }
            }
            if (!newImageFound) {
                throw new Error("A IA não conseguiu processar esta imagem no momento.");
            }

        } catch (err: any) {
            console.error("Erro no upscale:", err);
            setError(err.message || "Falha ao fazer o upscale da imagem. Tente novamente.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDownload = () => {
        if (!processedImage) return;
        const link = document.createElement('a');
        link.href = processedImage;
        link.download = `upscaled-${scale}x-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <input type="file" ref={inputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

            <header className="flex-shrink-0 z-10 p-4 border-b border-gray-800/50">
                <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="font-semibold text-lg flex items-center gap-2">
                            <Zap size={20} className="text-blue-400" />
                            Aumentar Resolução IA
                        </h1>
                    </div>
                    {processedImage && (
                         <button onClick={handleDownload} className="px-4 py-2 font-bold bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
                            <Download size={16} />
                            Baixar
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 relative">
                {isProcessing && (
                     <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center text-center p-4 backdrop-blur-sm">
                        <Zap className="text-blue-400 animate-pulse mb-4" size={48} />
                        <h3 className="text-white font-bold text-xl">Aumentando Resolução...</h3>
                        <p className="text-gray-400 text-sm mt-2 max-w-xs">A IA está reconstruindo detalhes para garantir nitidez em {scale}x.</p>
                    </div>
                )}
                
                {processedImage && originalImage ? (
                    <div className="w-full h-full flex flex-col">
                        <div className="flex-1 min-h-0">
                             <ImageCompare before={originalImage} after={processedImage} />
                        </div>
                         <div className="flex-shrink-0 mt-4 flex justify-center">
                             <button onClick={() => onEdit(processedImage)} className="bg-gray-700 text-white font-semibold py-2 px-6 rounded-full hover:bg-gray-600 transition-colors flex items-center gap-2 border border-gray-600">
                                <Edit size={16} /> Editar Resultado
                            </button>
                        </div>
                    </div>
                ) : originalImage ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <img src={originalImage} alt="Original" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl mb-8"/>
                        
                        <div className="bg-[#2c2c2c] p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-700">
                            <h3 className="font-bold text-white mb-4 text-center">Configurações de Upscale</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 mb-2 block uppercase tracking-wider">Fator de Aumento</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => setScale(2)} 
                                            className={`py-3 rounded-lg font-bold text-sm transition-all ${scale === 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                        >
                                            2x (HD)
                                        </button>
                                        <button 
                                            onClick={() => setScale(4)} 
                                            className={`py-3 rounded-lg font-bold text-sm transition-all ${scale === 4 ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                        >
                                            4x (Ultra HD)
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => setEnhanceFace(!enhanceFace)}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${enhanceFace ? 'bg-blue-900/30 border-blue-500/50' : 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {enhanceFace ? <CheckSquare className="text-blue-400" size={20}/> : <Square className="text-gray-500" size={20}/>}
                                        <div className="text-left">
                                            <span className={`block text-sm font-medium ${enhanceFace ? 'text-blue-200' : 'text-gray-300'}`}>Aprimorar Rostos</span>
                                            <span className="block text-[10px] text-gray-500">Recomendado para retratos</span>
                                        </div>
                                    </div>
                                </button>

                                <button 
                                    onClick={handleUpscale} 
                                    disabled={isProcessing}
                                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-2 flex items-center justify-center gap-2"
                                >
                                    <Zap size={18} fill="currentColor" />
                                    Iniciar Upscale
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-2xl text-center">
                         <div className="flex justify-center items-center relative mb-6">
                            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                            <div className="w-24 h-24 bg-[#2c2c2c] text-blue-400 rounded-2xl flex items-center justify-center relative shadow-2xl border border-gray-700">
                                <Zap size={48} />
                            </div>
                        </div>
                        <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Upscaler 4K com IA</h2>
                        <p className="text-gray-400 mb-8 text-lg">Aumente a resolução, recupere detalhes e melhore a nitidez automaticamente.</p>
                        
                        <div className="flex justify-center my-8">
                            <button onClick={() => inputRef.current?.click()} className="bg-white text-black font-bold py-4 px-10 rounded-full transition-transform hover:scale-105 flex items-center gap-3 shadow-xl hover:shadow-white/20">
                                <Upload size={22} /> Carregar Imagem
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
