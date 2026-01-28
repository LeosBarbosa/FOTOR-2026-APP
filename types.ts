import type * as React from 'react';
import { LucideIcon } from 'lucide-react';

export type NavItemId = 
  | 'ferramentas'
  | 'ajustar'
  | 'efeitos'
  | 'beleza'
  | 'quadros'
  | 'texto'
  | 'elementos'
  | 'uploads'
  | 'mais';

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: LucideIcon;
}

export interface CanvasElementData {
  id: number;
  type: 'emoji' | 'shape' | 'text';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // Text-specific properties
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
}
