import { create } from 'zustand';

type EditorLayer = {
  id: string;
  label: string;
};

type StoryEditorState = {
  activeLayerId: string | null;
  layers: EditorLayer[];
  setActiveLayer: (layerId: string | null) => void;
};

type CardEditorState = {
  activeTemplateId: string | null;
  accentColor: string;
  setActiveTemplate: (templateId: string | null) => void;
  cycleAccentColor: () => void;
};

const ACCENT_COLORS = ['#FF6B6B', '#34C759', '#5AC8FA'];

export const useStoryEditorStore = create<StoryEditorState>((set) => ({
  activeLayerId: null,
  layers: [
    { id: 'background', label: '背景レイヤー' },
    { id: 'text', label: 'テキストレイヤー' },
    { id: 'sticker', label: 'スタンプレイヤー' },
  ],
  setActiveLayer: (layerId) => set({ activeLayerId: layerId }),
}));

export const useCardEditorStore = create<CardEditorState>((set, get) => ({
  activeTemplateId: null,
  accentColor: ACCENT_COLORS[0],
  setActiveTemplate: (templateId) => set({ activeTemplateId: templateId }),
  cycleAccentColor: () => {
    const currentColor = get().accentColor;
    const currentIndex = ACCENT_COLORS.indexOf(currentColor);
    const nextColor = ACCENT_COLORS[(currentIndex + 1) % ACCENT_COLORS.length];
    set({ accentColor: nextColor });
  },
}));
