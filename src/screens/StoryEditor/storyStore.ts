import { create } from 'zustand';

/**
 * Story editor state store:
 * - canvasSize uses a 1080x1920 baseline to match common story dimensions.
 * - filter ranges: brightness/contrast/saturation are clamped between 0-2, blur is 0-20px (handled by UI later).
 */

export type StoryVector2 = { x: number; y: number };
export type Transform2D = { x: number; y: number; scale: number; rotation: number };

export type StoryBackground = {
  uri: string;
  transform: Transform2D;
};

export type StoryTextElement = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  rotation: number;
};

export type StoryStickerElement = {
  id: string;
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
};

export type FilterValues = {
  brightness: number; // 0-2
  contrast: number; // 0-2
  saturation: number; // 0-2
  blur: number; // 0-20 px
};

export type SelectionState = {
  type: 'background' | 'text' | 'sticker' | null;
  id: string | null;
};

type StorySnapshot = {
  backgroundImage: StoryBackground | null;
  texts: StoryTextElement[];
  stickers: StoryStickerElement[];
  filters: FilterValues;
  selected: SelectionState;
};

type StoryState = {
  canvasSize: StoryVector2;
  backgroundImage: StoryBackground | null;
  texts: StoryTextElement[];
  stickers: StoryStickerElement[];
  selected: SelectionState;
  filters: FilterValues;
  undoStack: StorySnapshot[];
  redoStack: StorySnapshot[];
};

type NewTextPayload = Omit<StoryTextElement, 'id'> & { id?: string };
type NewStickerPayload = Omit<StoryStickerElement, 'id'> & { id?: string };

type StoryActions = {
  setCanvasSize: (size: StoryVector2) => void;
  setBackgroundImage: (background: StoryBackground) => void;
  updateBackgroundTransform: (transform: Partial<Transform2D>) => void;
  addText: (text: NewTextPayload) => void;
  updateText: (id: string, updates: Partial<StoryTextElement>) => void;
  removeText: (id: string) => void;
  addSticker: (sticker: NewStickerPayload) => void;
  updateSticker: (id: string, updates: Partial<StoryStickerElement>) => void;
  removeSticker: (id: string) => void;
  updateFilters: (updates: Partial<FilterValues>) => void;
  setSelected: (selection: SelectionState) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
};

export type StoryStore = StoryState & StoryActions;

const BASE_CANVAS: StoryVector2 = { width: 1080, height: 1920 };

const INITIAL_BACKGROUND: StoryBackground = {
  uri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
  transform: { x: 0, y: 0, scale: 1, rotation: 0 },
};

const INITIAL_TEXTS: StoryTextElement[] = [
  {
    id: 'headline',
    text: 'New Drops',
    x: 540,
    y: 320,
    fontSize: 96,
    color: '#FFFFFF',
    fontFamily: 'GreatVibes-Regular',
    rotation: 0,
  },
  {
    id: 'body',
    text: 'Swipe up for details',
    x: 540,
    y: 520,
    fontSize: 48,
    color: '#F8F9FA',
    fontFamily: 'GreatVibes-Regular',
    rotation: 0,
  },
];

const INITIAL_STICKERS: StoryStickerElement[] = [
  {
    id: 'sticker-1',
    uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    x: 260,
    y: 1380,
    width: 320,
    height: 320,
    scale: 0.7,
    rotation: 0.1,
  },
  {
    id: 'sticker-2',
    uri: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=400',
    x: 820,
    y: 1460,
    width: 280,
    height: 280,
    scale: 0.9,
    rotation: -0.05,
  },
];

const INITIAL_FILTERS: FilterValues = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  blur: 0,
};

const cloneBackground = (background: StoryBackground | null): StoryBackground | null =>
  background
    ? {
        uri: background.uri,
        transform: { ...background.transform },
      }
    : null;

const cloneTexts = (texts: StoryTextElement[]) => texts.map((text) => ({ ...text }));
const cloneStickers = (stickers: StoryStickerElement[]) => stickers.map((sticker) => ({ ...sticker }));

const createSnapshot = (state: StoryState): StorySnapshot => ({
  backgroundImage: cloneBackground(state.backgroundImage),
  texts: cloneTexts(state.texts),
  stickers: cloneStickers(state.stickers),
  filters: { ...state.filters },
  selected: { ...state.selected },
});

const createId = () => Math.random().toString(36).slice(2, 9);

export const useStoryStore = create<StoryStore>((set, get) => ({
  canvasSize: BASE_CANVAS,
  backgroundImage: INITIAL_BACKGROUND,
  texts: INITIAL_TEXTS,
  stickers: INITIAL_STICKERS,
  selected: { type: 'background', id: 'background' },
  filters: INITIAL_FILTERS,
  undoStack: [],
  redoStack: [],

  setCanvasSize: (size) =>
    set(() => ({
      canvasSize: size,
    })),

  setBackgroundImage: (background) =>
    set((state) => ({
      backgroundImage: {
        ...background,
        transform: background.transform ?? state.backgroundImage?.transform ?? { x: 0, y: 0, scale: 1, rotation: 0 },
      },
    })),

  updateBackgroundTransform: (transform) =>
    set((state) => {
      if (!state.backgroundImage) return {};
      return {
        backgroundImage: {
          ...state.backgroundImage,
          transform: {
            ...state.backgroundImage.transform,
            ...transform,
          },
        },
      };
    }),

  addText: (text) =>
    set((state) => ({
      texts: [
        ...state.texts,
        {
          ...text,
          id: text.id ?? createId(),
        },
      ],
    })),

  updateText: (id, updates) =>
    set((state) => ({
      texts: state.texts.map((text) => (text.id === id ? { ...text, ...updates } : text)),
    })),

  removeText: (id) =>
    set((state) => ({
      texts: state.texts.filter((text) => text.id !== id),
    })),

  addSticker: (sticker) =>
    set((state) => ({
      stickers: [
        ...state.stickers,
        {
          ...sticker,
          id: sticker.id ?? createId(),
        },
      ],
    })),

  updateSticker: (id, updates) =>
    set((state) => ({
      stickers: state.stickers.map((sticker) => (sticker.id === id ? { ...sticker, ...updates } : sticker)),
    })),

  removeSticker: (id) =>
    set((state) => ({
      stickers: state.stickers.filter((sticker) => sticker.id !== id),
    })),

  updateFilters: (updates) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...updates,
      },
    })),

  setSelected: (selection) => set(() => ({ selected: selection })),

  pushHistory: () =>
    set((state) => ({
      undoStack: [...state.undoStack, createSnapshot(state)],
      redoStack: [],
    })),

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) {
      return;
    }
    const previous = state.undoStack[state.undoStack.length - 1];
    const remainingUndo = state.undoStack.slice(0, -1);
    const redoEntry = createSnapshot(state);
    set({
      backgroundImage: cloneBackground(previous.backgroundImage),
      texts: cloneTexts(previous.texts),
      stickers: cloneStickers(previous.stickers),
      filters: { ...previous.filters },
      selected: { ...previous.selected },
      undoStack: remainingUndo,
      redoStack: [...state.redoStack, redoEntry],
    });
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) {
      return;
    }
    const next = state.redoStack[state.redoStack.length - 1];
    const remainingRedo = state.redoStack.slice(0, -1);
    const undoEntry = createSnapshot(state);
    set({
      backgroundImage: cloneBackground(next.backgroundImage),
      texts: cloneTexts(next.texts),
      stickers: cloneStickers(next.stickers),
      filters: { ...next.filters },
      selected: { ...next.selected },
      undoStack: [...state.undoStack, undoEntry],
      redoStack: remainingRedo,
    });
  },
}));
