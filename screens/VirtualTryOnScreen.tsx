
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, Shirt, Scissors, Edit, Key, Sparkles, X, ChevronDown, Check } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64, fileToBlobUrl } from '../utils/fileUtils';

const clothingTypes = [
    { id: 'full', label: 'Conjunto Completo' },
    { id: 'top', label: 'Parte de Cima' },
    { id: 'bottom', label: 'Parte de Baixo' },
    { id: 'dress', label: 'Vestido' },
];

const Header: React.FC<{ onBack: () => void; }> = ({ onBack }) => (
    <header className="bg-[#1A1A1A] text-white flex items-center justify-between px-6 h-16 flex-shrink-0 border-b border-white/5 z-20">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-lg flex items-center gap-2">
                <Shirt size={20} className="text-purple-400" />
                Provador Virtual PRO
            </h1>
        </div>
    </header>
);

export const VirtualTryOnScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [personImage, setPersonImage] = useState<string | null>(initialImage || null);
    const [garmentImage, setGarmentImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [clothingType, setClothingType] = useState(clothingTypes[0]);
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const personInputRef = useRef<HTMLInputElement>(null);
    const garmentInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = async () => {
        if (!personImage) {
            setError("Por favor, carregue a imagem da pessoa.");
            return;
        }
        if (!garmentImage && !prompt.trim()) {
            setError("Por favor, carregue uma imagem da roupa ou descreva-a.");
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const { base64: personBase64, mimeType: personMimeType } = await imageUrlToBase64(personImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const parts: any[] = [
                { inlineData: { data: personBase64, mimeType: personMimeType } }
            ];
    
            let fullPrompt = `Task: High-Fidelity Virtual Try-On.
            Replace the existing clothing of the person in the first image with the target garment.
            
            Target Garment Source:`;
            
            if (garmentImage) {
                const { base64: garmentBase64, mimeType: garmentMimeType } = await imageUrlToBase64(garmentImage);
                parts.push({ inlineData: { data: garmentBase64, mimeType: garmentMimeType } });
                fullPrompt += ` Use the second image as the EXACT reference for texture, fabric, pattern, and style of the clothing.`;
            } else {
                fullPrompt += ` Generate clothing based on this description: "${prompt}".`;
            }

            fullPrompt += `
            Guidelines:
            1. Clothing Category: ${clothingType.label}.
            2. Fit & drape: Ensure the new clothing fits the person's body shape and pose naturally. Account for folds, wrinkles, and gravity.
            3. Lighting: Match the lighting direction, intensity, and color temperature of the person's photo.
            4. Preservation: DO NOT change the person's face, hair, skin tone, or background. Only replace the relevant clothing area.
            5. Output: Photorealistic, 4K resolution.
            `;
            
            if (prompt.trim() && garmentImage) {
                fullPrompt += `\nAdditional Details: ${prompt}`;
            }
            
            parts.push({ text: fullPrompt });

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts },
              config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            const partsRes = candidate?.content?.parts || [];
            let imageFound = false;

            for (const part of partsRes) {
              if (part.inlineData) {
                const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                setGeneratedImage(resultUrl);
                imageFound = true;
                break;
              }
            }

            if (!imageFound) {
                if (candidate?.finishReason === 'SAFETY') {
                    throw new Error("A geração foi bloqueada pelos filtros de segurança. Tente uma imagem diferente.");
                }
                const text = partsRes.find(p => p.text)?.text;
                throw new Error(text || "A IA não conseguiu gerar a imagem. Tente novamente.");
            }
            
        } catch (err: any) {
            console.error("Erro no provador:", err);
            setError(err.message || "Falha ao processar o visual.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        if (e.target.files?.[0]) {
            setter(fileToBlobUrl(e.target.files[0]));
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `provador-virtual-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#0F0F0F] text-white overflow-hidden">
            <Header onBack={onBack} />
            <input type="file" ref={personInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setPersonImage)} />
            <input type="file" ref={garmentInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setGarmentImage)} />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Controls */}
                <div className="w-96 bg-[#1A1A1A] border-r border-white/5 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-8">
                        
                        {/* Section 1: Person */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">1. Seu Modelo</h3>
                            <div 
                                onClick={() => personInputRef.current?.click()}
                                className="relative aspect-[3/4] w-full bg-[#252525] rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden group"
                            >
                                {personImage ? (
                                    <img src={personImage} alt="Modelo" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                                        <div className="p-3 bg-white/5 rounded-full"><Upload size={20} /></div>
                                        <span className="text-xs font-medium">Carregar Foto</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-xs font-bold text-white bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md">Trocar Imagem</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Garment */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">2. A Roupa</h3>
                            <div 
                                onClick={() => garmentInputRef.current?.click()}
                                className="relative h-40 w-full bg-[#252525] rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden group"
                            >
                                {garmentImage ? (
                                    <img src={garmentImage} alt="Roupa" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                                        <div className="p-3 bg-white/5 rounded-full"><Shirt size={20} /></div>
                                        <span className="text-xs font-medium">Carregar Imagem da Peça</span>
                                    </div>
                                )}
                                {garmentImage && (
                                    <button 
                                        onClick={(e) => {e.stopPropagation(); setGarmentImage(null);}} 
                                        className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-red-500 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            
                            <div className="mt-4">
                                <label className="text-xs text-gray-400 font-semibold mb-2 block">Categoria</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {clothingTypes.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setClothingType(type)}
                                            className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                                                clothingType.id === type.id 
                                                    ? 'bg-purple-600/20 border-purple-500 text-purple-200' 
                                                    : 'bg-[#252525] border-transparent text-gray-400 hover:bg-[#303030]'
                                            }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="text-xs text-gray-400 font-semibold mb-2 block">Detalhes (Opcional)</label>
                                <textarea 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Ex: seda vermelha, ajuste solto, mangas dobradas..."
                                    className="w-full bg-[#252525] border border-white/5 rounded-lg p-3 text-xs text-white placeholder-gray-600 resize-none h-20 focus:ring-1 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>

                    </div>
                    
                    {/* Action Footer */}
                    <div className="p-6 border-t border-white/5 bg-[#1A1A1A] sticky bottom-0">
                        <button 
                            onClick={handleGenerate}
                            disabled={isProcessing || !personImage}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-sm text-white shadow-lg shadow-purple-900/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Provando...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    <span>Gerar Visual</span>
                                </>
                            )}
                        </button>
                        {error && <p className="text-red-400 text-xs text-center mt-3 bg-red-900/10 p-2 rounded-lg border border-red-500/10">{error}</p>}
                    </div>
                </div>

                {/* Right Area - Preview */}
                <div className="flex-1 bg-[#0F0F0F] relative flex items-center justify-center p-8">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #333 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                    
                    {generatedImage ? (
                        <div className="relative h-full w-full flex flex-col items-center">
                            <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
                                <img src={generatedImage} alt="Resultado" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/10" />
                                <div className="absolute top-4 right-4 flex flex-col gap-2">
                                    <button onClick={handleDownload} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform tooltip" title="Baixar">
                                        <Download size={20} />
                                    </button>
                                    <button onClick={() => onEdit(generatedImage)} className="p-3 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform tooltip" title="Editar">
                                        <Edit size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-4">
                                <button onClick={() => setGeneratedImage(null)} className="px-6 py-2 bg-[#252525] text-white rounded-full text-sm font-medium hover:bg-[#303030] border border-white/5">
                                    Voltar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center max-w-md">
                            <div className="w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-white/10">
                                <Shirt size={48} className="text-gray-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Seu Estilo, Reinventado</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Experimente roupas virtualmente com qualidade de estúdio. O Gemini 2.5 Flash analisa a textura, caimento e iluminação para um resultado ultra-realista.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
