
import React, { useState, useRef } from 'react';
import { ArrowLeft, Upload, Download, RefreshCw, UserRound, Sparkles, AlertCircle, CheckCircle, ScanFace } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64, fileToBlobUrl } from '../utils/fileUtils';
import { NeuroCompare } from '../components/NeuroCompare';

export const FaceSwapScreen: React.FC<{ onBack: () => void; onEdit: (imageUrl: string) => void; initialImage?: string | null; }> = ({ onBack, onEdit, initialImage }) => {
    const [sourceImage, setSourceImage] = useState<string | null>(null); // Rosto de Referência
    const [targetImage, setTargetImage] = useState<string | null>(initialImage || null); // Cenário/Corpo
    const [resultImage, setResultImage] = useState<string | null>(null);
    
    // Status state: 'idle' | 'analyzing' | 'processing' | 'success' | 'error'
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'processing' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    
    const sourceInputRef = useRef<HTMLInputElement>(null);
    const targetInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
        if (e.target.files?.[0]) {
            setter(fileToBlobUrl(e.target.files[0]));
            // Resetar resultado se mudar as entradas
            if (status === 'success') {
                setResultImage(null);
                setStatus('idle');
            }
        }
    };

    const handleSwap = async () => {
        if (!sourceImage || !targetImage) {
            setError("Por favor, faça o upload das duas imagens (Origem e Destino).");
            return;
        }

        setStatus('analyzing');
        setError(null);

        try {
            const sourceBase64 = await imageUrlToBase64(sourceImage);
            const targetBase64 = await imageUrlToBase64(targetImage);
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            // Simular tempo de análise para UX (o usuário sente que a IA está "pensando")
            await new Promise(resolve => setTimeout(resolve, 1500));
            setStatus('processing');

            const prompt = `ATUE COMO: Editor de Imagens Profissional.
TAREFA: Composição Digital de Rostos (Face Transfer).

INSTRUÇÕES:
1. Substitua o rosto na IMAGEM 2 (Target/Corpo) pelo rosto da IMAGEM 1 (Source/Referência).
2. HARMONIZAÇÃO: Ajuste o tom de pele, iluminação, sombras e temperatura de cor para que o novo rosto se integre perfeitamente ao corpo e ambiente da Imagem 2.
3. GEOMETRIA: Alinhe a perspectiva, inclinação e rotação do rosto para corresponder naturalemente à pose do corpo.
4. REALISMO: Mantenha a textura da pele e detalhes realistas. O resultado deve parecer uma fotografia autêntica.

IMPORTANTE: Retorne APENAS a imagem final editada.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { inlineData: { data: sourceBase64.base64, mimeType: sourceBase64.mimeType } },
                        { inlineData: { data: targetBase64.base64, mimeType: targetBase64.mimeType } },
                        { text: prompt }
                    ]
                },
                config: { responseModalities: [Modality.IMAGE] }
            });

            const candidate = response.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            let imageFound = false;

            for (const part of parts) {
                if (part.inlineData) {
                    const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    setResultImage(resultUrl);
                    imageFound = true;
                    setStatus('success');
                    break;
                }
            }

            if (!imageFound) {
                if (candidate?.finishReason === 'SAFETY') {
                    throw new Error("A geração foi bloqueada por filtros de segurança. Tente usar imagens diferentes.");
                }
                const text = candidate?.content?.parts?.[0]?.text;
                throw new Error(text || "A IA não conseguiu gerar a troca de rosto. Tente novamente ou use imagens diferentes.");
            }

        } catch (err: any) {
            console.error("Erro no NeuroBlend:", err);
            setError(err.message || "Falha ao processar a troca de rostos.");
            setStatus('error');
        }
    };

    const handleDownload = () => {
        if (!resultImage) return;
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `neuroblend-faceswap-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-screen bg-[#0f1115] text-white overflow-hidden font-sans">
            <header className="flex-shrink-0 z-10 p-6 border-b border-white/5 bg-[#161b22]">
                <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                            <ArrowLeft size={20} className="text-gray-300" />
                        </button>
                        <div>
                            <h1 className="font-bold text-xl flex items-center gap-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                <Sparkles size={24} className="text-blue-400" />
                                NeuroBlend AI
                            </h1>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">Sistema de Fusão Facial de Alta Fidelidade</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center">
                
                {/* Upload Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mb-10">
                    
                    {/* Source Image Card */}
                    <div className="bg-[#1c2128] p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                                <UserRound size={16}/> 1. Rosto de Referência
                            </label>
                            {sourceImage && (
                                <button onClick={() => setSourceImage(null)} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold">Remover</button>
                            )}
                        </div>
                        <div 
                            onClick={() => sourceInputRef.current?.click()}
                            className="aspect-[4/3] w-full bg-[#0d1117] rounded-xl border-2 border-dashed border-white/10 hover:border-blue-500/50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative"
                        >
                            {sourceImage ? (
                                <img src={sourceImage} alt="Source" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center p-6">
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <ScanFace size={32} className="text-blue-400" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-400">Clique para carregar rosto</span>
                                </div>
                            )}
                            <input type="file" ref={sourceInputRef} onChange={(e) => handleFileChange(e, setSourceImage)} className="hidden" accept="image/*" />
                        </div>
                    </div>

                    {/* Target Image Card */}
                    <div className="bg-[#1c2128] p-5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                <Sparkles size={16}/> 2. Cenário de Destino
                            </label>
                            {targetImage && (
                                <button onClick={() => setTargetImage(null)} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold">Remover</button>
                            )}
                        </div>
                        <div 
                            onClick={() => targetInputRef.current?.click()}
                            className="aspect-[4/3] w-full bg-[#0d1117] rounded-xl border-2 border-dashed border-white/10 hover:border-purple-500/50 transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative"
                        >
                            {targetImage ? (
                                <img src={targetImage} alt="Target" className="w-full h-full object-contain" />
                            ) : (
                                <div className="text-center p-6">
                                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Upload size={32} className="text-purple-400" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-400">Clique para carregar cenário</span>
                                </div>
                            )}
                            <input type="file" ref={targetInputRef} onChange={(e) => handleFileChange(e, setTargetImage)} className="hidden" accept="image/*" />
                        </div>
                    </div>
                </div>

                {/* Action Area */}
                <div className="flex flex-col items-center gap-6 w-full max-w-xl">
                    {error && (
                        <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/30 px-6 py-4 rounded-xl text-sm text-red-200 w-full animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={20} className="flex-shrink-0" /> {error}
                        </div>
                    )}

                    <button 
                        onClick={handleSwap} 
                        disabled={status === 'analyzing' || status === 'processing' || !sourceImage || !targetImage}
                        className={`
                            relative w-full py-5 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:scale-[0.98]
                            ${status === 'idle' || status === 'success' || status === 'error'
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white' 
                                : 'bg-[#2c313a] text-gray-400 cursor-wait border border-white/5'}
                        `}
                    >
                        {status === 'idle' && <><RefreshCw size={20}/> Iniciar Fusão Neural</>}
                        {status === 'error' && <><RefreshCw size={20}/> Tentar Novamente</>}
                        {status === 'analyzing' && <><ScanFace className="animate-pulse" size={20}/> Analisando Luz e Geometria...</>}
                        {status === 'processing' && <><Sparkles className="animate-spin" size={20}/> Renderizando Face Swap...</>}
                        {status === 'success' && <><CheckCircle size={20}/> Processo Concluído!</>}
                    </button>
                </div>

                {/* Result Section */}
                {status === 'success' && resultImage && targetImage && (
                    <div className="w-full max-w-5xl mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
                        <div className="border-t border-white/10 pt-8">
                            <h3 className="text-2xl font-bold text-center mb-2 text-white flex items-center justify-center gap-2">
                                <Sparkles className="text-indigo-400" size={24} /> Análise Comparativa
                            </h3>
                            <p className="text-center text-slate-400 mb-8">Arraste o slider para verificar a adaptação de luz, sombras e geometria.</p>
                            
                            {/* Inserção do Componente de Comparação NeuroCompare */}
                            <NeuroCompare 
                                beforeImage={targetImage} 
                                afterImage={resultImage} 
                            />

                            {/* Botões de Ação Abaixo do Slider */}
                            <div className="flex justify-center gap-4 mt-10">
                                <button 
                                    onClick={() => { setResultImage(null); setStatus('idle'); }}
                                    className="px-8 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition font-medium"
                                >
                                    Nova Edição
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/50 transition flex items-center gap-3 hover:scale-105"
                                >
                                    <Download size={18} />
                                    Baixar Resultado
                                </button>
                                <button 
                                    onClick={() => onEdit(resultImage)}
                                    className="px-8 py-3 rounded-xl bg-[#2c313a] hover:bg-[#363b46] text-white font-bold border border-white/10 transition flex items-center gap-3"
                                >
                                    <RefreshCw size={18} />
                                    Editar no Canvas
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};
