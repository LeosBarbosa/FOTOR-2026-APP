
import React, { useState } from 'react';
import { ArrowLeft, Download, Wand2, Edit, Sparkles, Loader } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { imageUrlToBase64 } from '../utils/fileUtils';
import { ImageCompareSlider } from '../components/ImageCompareSlider';

export const AiMagicEditScreen: React.FC<{
  onBack: () => void;
  onEdit: (imageUrl: string) => void;
  initialImage: string | null;
}> = ({ onBack, onEdit, initialImage }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!initialImage || !prompt.trim()) {
      setError('Por favor, descreva a edição que você deseja.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProcessedImage(null);

    try {
      const { base64, mimeType } = await imageUrlToBase64(initialImage);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // Using Gemini 2.5 Flash Image for superior editing
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64, mimeType } },
            { text: prompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      let imageFound = false;
      
      for (const part of parts) {
          if (part.inlineData) {
              const resultUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              setProcessedImage(resultUrl);
              imageFound = true;
              break;
          }
      }

      if (!imageFound) {
        const textResponse = candidate?.content?.parts?.[0]?.text;
        if (textResponse) {
            throw new Error(`A IA não gerou a imagem. Resposta: ${textResponse}`);
        }
        if (candidate?.finishReason) {
             throw new Error(`Geração bloqueada. Motivo: ${candidate.finishReason}`);
        }
        throw new Error("A IA não retornou uma imagem editada. Tente ajustar o prompt.");
      }
    } catch (err: any) {
      console.error("Erro na Edição Mágica:", err);
      setError(err.message || "Falha ao gerar a imagem. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleImprovePrompt = async () => {
      if (!prompt.trim()) return;
      setIsImproving(true);
      setError(null);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Given the user's request to edit an image: "${prompt}", rewrite it as a more detailed and effective prompt for an image generation AI. The new prompt should be descriptive and clear, focusing on visual changes. Only return the improved prompt text, nothing else.`,
          });
          setPrompt(response.text?.trim() || prompt);
      } catch (err) {
          console.error("Error improving prompt:", err);
          setError("Falha ao melhorar o prompt.");
      } finally {
          setIsImproving(false);
      }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `edicao-magica-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleAcceptAndEdit = () => {
      if(processedImage) {
          onEdit(processedImage);
      }
  }

  return (
    <div className="flex flex-col h-screen bg-[#1F1F1F] text-white overflow-hidden">
      <header className="flex-shrink-0 z-10 p-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-lg drop-shadow-md">Edição Mágica com IA</h1>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex items-center justify-center p-4">
        {isGenerating ? (
          <div className="flex flex-col items-center">
            <Loader size={48} className="animate-spin text-blue-400" />
            <p className="mt-4 text-gray-300">Aplicando sua edição mágica com Gemini 2.5 Flash...</p>
          </div>
        ) : processedImage && initialImage ? (
            <ImageCompareSlider beforeSrc={initialImage} afterSrc={processedImage} afterStyle={{}} onLoad={() => {}} />
        ) : initialImage ? (
          <img src={initialImage} alt="Para editar" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
        ) : (
          <p>Carregue uma imagem no editor principal para começar.</p>
        )}
      </main>

      <footer className="flex-shrink-0 z-10 p-4">
        {error && <div className="max-w-xl mx-auto mb-2 p-2 bg-red-900/80 rounded-lg text-center text-sm text-red-300 backdrop-blur-sm">{error}</div>}
        <div className="max-w-xl mx-auto flex flex-col gap-4 bg-black/30 backdrop-blur-sm p-4 rounded-xl">
          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: adicione um filtro retrô, remova a pessoa no fundo..."
              className="w-full flex-1 h-20 bg-gray-700/50 p-2 rounded-md text-sm resize-none placeholder-gray-500 focus:ring-1 focus:ring-blue-500"
              disabled={isGenerating || isImproving}
            />
             <button 
                onClick={handleImprovePrompt} 
                disabled={isImproving || !prompt.trim()}
                title="Melhorar Prompt"
                className="h-20 w-20 flex flex-col items-center justify-center bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-500"
            >
                {isImproving ? <Loader size={24} className="animate-spin" /> : <Sparkles size={24} />}
                <span className="text-[10px] mt-1">Melhorar</span>
            </button>
          </div>
          <div className="flex gap-3">
            {processedImage ? (
                 <>
                    <button onClick={handleGenerate} disabled={isGenerating || isImproving || !prompt.trim()} className="flex-1 bg-blue-600 font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">
                        Gerar Novamente
                    </button>
                    <button onClick={handleAcceptAndEdit} className="bg-green-600 font-bold py-3 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                        <Edit size={18} /> Aceitar
                    </button>
                    <button onClick={handleDownload} className="bg-gray-600 font-bold py-3 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2">
                        <Download size={18} /> Baixar
                    </button>
                </>
            ) : (
                <button onClick={handleGenerate} disabled={isGenerating || isImproving || !prompt.trim()} className="w-full bg-blue-600 font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-500">
                    <Wand2 size={18} />
                    Gerar
                </button>
            )}
           
          </div>
        </div>
      </footer>
    </div>
  );
};
