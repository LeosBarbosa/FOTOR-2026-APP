
import React, { useState, useRef } from 'react';
import { ArrowLeft, Download, Users, Edit, Plus, X } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64, fileToBlobUrl } from '../utils/fileUtils';

export const FutureFamilyScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [parent1, setParent1] = useState<string | null>(initialImage || null);
    const [parent2, setParent2] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    const p1InputRef = useRef<HTMLInputElement>(null);
    const p2InputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setParent: (url: string) => void) => {
        if (e.target.files?.[0]) {
            const url = fileToBlobUrl(e.target.files[0]);
            setParent(url);
        }
    };

    const handleGenerate = async () => {
        if (!parent1 || !parent2) {
            setError("Por favor, carregue as fotos de ambos os pais.");
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setError(null);

        // Simulate progress
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) return 90;
                return prev + Math.floor(Math.random() * 5) + 1;
            });
        }, 500);

        try {
            const p1Base64 = await imageUrlToBase64(parent1);
            const p2Base64 = await imageUrlToBase64(parent2);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const prompt = `Analyze the two reference images and create one ultra-realistic, high-definition family portrait featuring both individuals from the reference photos as the parents, together with their possible child — gender can be randomly a boy or a girl.

Both parents must look exactly like in the reference images, preserving every facial feature, skin tone, hair color, and expression with absolute accuracy.
The child should appear as a natural genetic blend of the parents, with believable, harmonious features, looking like a real offspring of the couple.

Age of the child: around 8–12 years old.

Expression: natural and friendly, reflecting warmth and family resemblance.

The family stands close together, with relaxed, genuine body language — a natural, affectionate pose that conveys warmth and unity.

Lighting should be soft and cinematic, coming from the front and slightly above (key light at ~45° angle, fill light from the opposite side at 30%), producing smooth, realistic shadows and catchlights in the eyes.
Add subtle rim lighting to separate the subjects from the background, enhancing depth.

The background is minimalistic and slightly defocused with a soft gradient in light blue or warm beige, maintaining a studio-style elegance.
Skin tones must be balanced and natural, with realistic micro-texture and no over-smoothing.

Simulate the look and depth of field of a Canon EOS R5 full-frame mirrorless camera, using a Canon RF 50mm f/1.2L lens, ISO 200, aperture f/1.8, shutter speed 1/160s, and color temperature 5200K for neutral daylight tones.
The image should have shallow depth of field (sharp focus on faces, soft background blur) and lifelike 8K resolution detail.

Visual keywords:
ultra-realistic family portrait, photorealism, 8k resolution, full-frame camera depth, soft cinematic light, authentic facial likeness, shallow depth of field, natural skin texture, DSLR quality, genetic resemblance, family warmth, professional studio photography, color-accurate tones, real-life lighting.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: p1Base64.base64, mimeType: p1Base64.mimeType } },
                        { inlineData: { data: p2Base64.base64, mimeType: p2Base64.mimeType } },
                        { text: prompt }
                    ]
                },
                config: { responseModalities: [Modality.IMAGE] }
            });

            clearInterval(interval);
            setProgress(100);

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let imageFound = false;

            for (const part of parts) {
                if (part.inlineData) {
                    const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    setGeneratedImage(resultUrl);
                    imageFound = true;
                    break;
                }
            }

            if (!imageFound) {
                const text = candidate?.content?.parts?.[0]?.text;
                throw new Error(text || "A IA não retornou uma imagem.");
            }

        } catch (err: any) {
            console.error("Erro na geração de família:", err);
            setError(err.message || "Falha ao gerar o retrato de família.");
            clearInterval(interval);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `familia-futura-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
            <header className="flex-shrink-0 z-10 p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-semibold text-lg drop-shadow-md">Retrato Família Futura</h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                {!generatedImage ? (
                    <div className="w-full max-w-4xl flex flex-col gap-8">
                        <div className="text-center">
                            <div className="inline-flex p-4 bg-blue-500/20 rounded-full mb-4">
                                <Users size={40} className="text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Descubra sua Família Futura</h2>
                            <p className="text-gray-400">Carregue fotos dos dois pais e veja como seria seu filho(a) em um retrato realista.</p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                            {/* Parent 1 Upload */}
                            <div className="relative group w-64 h-64 bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors flex flex-col items-center justify-center overflow-hidden cursor-pointer" onClick={() => p1InputRef.current?.click()}>
                                {parent1 ? (
                                    <>
                                        <img src={parent1} alt="Pai/Mãe 1" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-sm font-medium">Trocar foto</span>
                                        </div>
                                        <button onClick={(e) => {e.stopPropagation(); setParent1(null);}} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500"><X size={16}/></button>
                                    </>
                                ) : (
                                    <>
                                        <Plus size={32} className="text-gray-500 mb-2" />
                                        <span className="text-sm text-gray-400">Carregar Pai/Mãe 1</span>
                                    </>
                                )}
                                <input type="file" ref={p1InputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setParent1)} />
                            </div>

                            <div className="text-2xl font-bold text-gray-600">+</div>

                            {/* Parent 2 Upload */}
                            <div className="relative group w-64 h-64 bg-gray-800 rounded-xl border-2 border-dashed border-gray-600 hover:border-blue-500 transition-colors flex flex-col items-center justify-center overflow-hidden cursor-pointer" onClick={() => p2InputRef.current?.click()}>
                                {parent2 ? (
                                    <>
                                        <img src={parent2} alt="Pai/Mãe 2" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-sm font-medium">Trocar foto</span>
                                        </div>
                                        <button onClick={(e) => {e.stopPropagation(); setParent2(null);}} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500"><X size={16}/></button>
                                    </>
                                ) : (
                                    <>
                                        <Plus size={32} className="text-gray-500 mb-2" />
                                        <span className="text-sm text-gray-400">Carregar Pai/Mãe 2</span>
                                    </>
                                )}
                                <input type="file" ref={p2InputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setParent2)} />
                            </div>
                        </div>
                        
                        {error && <div className="bg-red-900/50 text-red-300 p-3 rounded-lg text-center text-sm">{error}</div>}

                        <div className="flex justify-center mt-4">
                            <button 
                                onClick={handleGenerate} 
                                disabled={!parent1 || !parent2 || isProcessing}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-12 rounded-full flex items-center gap-2 text-lg transition-all hover:scale-105"
                            >
                                {isProcessing ? 'Gerando...' : 'Gerar Família'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
                        <div className="w-full aspect-video bg-black/20 rounded-lg overflow-hidden shadow-2xl">
                             <img src={generatedImage} alt="Família Gerada" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex gap-4">
                             <button onClick={() => setGeneratedImage(null)} className="px-6 py-3 bg-gray-700 rounded-full font-semibold hover:bg-gray-600">Tentar Novamente</button>
                             <button onClick={handleDownload} className="px-6 py-3 bg-blue-600 rounded-full font-semibold hover:bg-blue-500 flex items-center gap-2"><Download size={18}/> Baixar</button>
                             <button onClick={() => onEdit(generatedImage)} className="px-6 py-3 bg-purple-600 rounded-full font-semibold hover:bg-purple-500 flex items-center gap-2"><Edit size={18}/> Editar</button>
                        </div>
                    </div>
                )}
            </main>

             {isProcessing && (
                <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h3 className="text-xl font-bold mb-2">Imaginando o futuro...</h3>
                    <p className="text-gray-400 mb-4">A IA está combinando traços e criando seu retrato.</p>
                    
                    <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-500 ease-out" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{progress}%</p>
                </div>
            )}
        </div>
    );
};
