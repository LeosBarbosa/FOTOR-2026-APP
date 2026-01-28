
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface EditorContextType {
  image: string | null;
  setImage: (image: string | null) => void;
  history: string[];
  historyIndex: number;
  addToHistory: (image: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  originalImage: string | null;
  setOriginalImage: (image: string | null) => void;
  resetToOriginal: () => void;
  loadImage: (image: string) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [image, setImageState] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [originalImage, setOriginalImage] = useState<string | null>(null);

  const setImage = useCallback((newImage: string | null) => {
    setImageState(newImage);
  }, []);

  // Inicializa uma nova imagem, limpando o histórico anterior
  const loadImage = useCallback((newImage: string) => {
      setImageState(newImage);
      setOriginalImage(newImage);
      setHistory([newImage]);
      setHistoryIndex(0);
  }, []);

  // Adiciona uma nova versão da imagem ao histórico
  const addToHistory = useCallback((newImage: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      // Limite opcional de histórico para economizar memória se necessário
      if (newHistory.length > 20) {
          newHistory.shift();
      }
      return [...newHistory, newImage];
    });
    setHistoryIndex(prev => {
        const newIndex = prev + 1;
        return newIndex > 20 ? 20 : newIndex;
    });
    setImageState(newImage);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setImageState(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setImageState(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const resetToOriginal = useCallback(() => {
    if (originalImage) {
      addToHistory(originalImage);
    }
  }, [originalImage, addToHistory]);

  const value = {
    image,
    setImage,
    history,
    historyIndex,
    addToHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    originalImage,
    setOriginalImage,
    resetToOriginal,
    loadImage
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
