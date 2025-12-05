import { create } from 'zustand';

type CanvasState = {
  width: number;
  height: number;
  zoom: number;
};

type BackgroundState = {
  color: string;
  imageUri: string | null;
  imageOpacity: number;
};

export type ShapeType = 'rect' | 'roundRect' | 'circle' | 'line';

export type ShapeElement = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
};

export type TextElement = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  lineHeight: number;
  letterSpacing: number;
  rotation: number;
  opacity: number;
  backgroundColor?: string | null;
};

export type ImageElement = {
  id: string;
  uri: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type SelectionState = {
  type: 'shape' | 'text' | 'image' | null;
  id: string | null;
};

type LayerRef = {
  type: NonNullable<SelectionState['type']>;
  id: string;
};

type CardSnapshot = {
  canvas: CanvasState;
  background: BackgroundState;
  shapes: ShapeElement[];
  texts: TextElement[];
  images: ImageElement[];
  layerOrder: LayerRef[];
  selected: SelectionState;
};

type CardState = {
  canvas: CanvasState;
  background: BackgroundState;
  shapes: ShapeElement[];
  texts: TextElement[];
  images: ImageElement[];
  layerOrder: LayerRef[];
  selected: SelectionState;
  undoStack: CardSnapshot[];
  redoStack: CardSnapshot[];
};

type UpdateOptions = {
  recordHistory?: boolean;
};

type CardActions = {
  setZoom: (zoom: number) => void;
  setBackground: (updates: Partial<BackgroundState>, options?: UpdateOptions) => void;
  addShape: (shape: Omit<ShapeElement, 'id'> & { id?: string }) => void;
  updateShape: (id: string, updates: Partial<ShapeElement>, options?: UpdateOptions) => void;
  removeShape: (id: string) => void;
  addText: (text: Omit<TextElement, 'id'> & { id?: string }) => void;
  updateText: (id: string, updates: Partial<TextElement>, options?: UpdateOptions) => void;
  removeText: (id: string) => void;
  addImage: (image: Omit<ImageElement, 'id'> & { id?: string }) => void;
  updateImage: (id: string, updates: Partial<ImageElement>, options?: UpdateOptions) => void;
  removeImage: (id: string) => void;
  setSelected: (selection: SelectionState) => void;
  bringForward: (selection: SelectionState) => void;
  sendBackward: (selection: SelectionState) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
};

export type CardStore = CardState & CardActions;

const CANVAS_DEFAULT: CanvasState = {
  width: 900,
  height: 540,
  zoom: 0.85,
};

const BACKGROUND_DEFAULT: BackgroundState = {
  color: '#111827',
  imageUri: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=1200',
  imageOpacity: 0.35,
};

const INITIAL_SHAPES: ShapeElement[] = [
  {
    id: 'shape-hero',
    type: 'roundRect',
    x: 120,
    y: 120,
    width: 320,
    height: 200,
    radius: 28,
    strokeColor: '#93C5FD',
    fillColor: 'rgba(59,130,246,0.25)',
    strokeWidth: 4,
    opacity: 1,
    rotation: 0,
  },
];

const INITIAL_TEXTS: TextElement[] = [
  {
    id: 'title',
    text: 'SnapCard Studio',
    x: 450,
    y: 180,
    fontSize: 72,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#F9FAFB',
    fontWeight: 'bold',
    fontStyle: 'normal',
    lineHeight: 1.2,
    letterSpacing: 1,
    rotation: 0,
    opacity: 1,
    backgroundColor: null,
  },
  {
    id: 'subtitle',
    text: 'Design bold, modern cards in minutes.',
    x: 450,
    y: 260,
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#E5E7EB',
    fontWeight: 'normal',
    fontStyle: 'normal',
    lineHeight: 1.3,
    letterSpacing: 0,
    rotation: 0,
    opacity: 1,
    backgroundColor: null,
  },
];

const INITIAL_IMAGES: ImageElement[] = [
  {
    id: 'logo',
    uri: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300',
    x: 720,
    y: 380,
    scale: 0.5,
    rotation: 0,
    opacity: 1,
  },
];

const INITIAL_LAYER_ORDER: LayerRef[] = [
  { type: 'shape', id: 'shape-hero' },
  { type: 'image', id: 'logo' },
  { type: 'text', id: 'title' },
  { type: 'text', id: 'subtitle' },
];

const cloneShapes = (shapes: ShapeElement[]) => shapes.map((shape) => ({ ...shape }));
const cloneTexts = (texts: TextElement[]) => texts.map((text) => ({ ...text }));
const cloneImages = (images: ImageElement[]) => images.map((image) => ({ ...image }));

const createSnapshot = (state: CardState): CardSnapshot => ({
  canvas: { ...state.canvas },
  background: { ...state.background },
  shapes: cloneShapes(state.shapes),
  texts: cloneTexts(state.texts),
  images: cloneImages(state.images),
  layerOrder: state.layerOrder.map((layer) => ({ ...layer })),
  selected: { ...state.selected },
});

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const useCardStore = create<CardStore>((set, get) => {
  const applyWithHistory = (producer: (state: CardState) => CardState) => {
    set((state) => {
      const snapshot = createSnapshot(state);
      const next = producer(state);
      return {
        ...next,
        undoStack: [...state.undoStack, snapshot],
        redoStack: [],
      };
    });
  };

  const removeLayerRef = (layers: LayerRef[], target: LayerRef) =>
    layers.filter((layer) => !(layer.type === target.type && layer.id === target.id));

  const updateLayersOrder = (layers: LayerRef[], selection: SelectionState, direction: 'forward' | 'backward') => {
    if (!selection.type || !selection.id) return layers;
    const index = layers.findIndex((layer) => layer.type === selection.type && layer.id === selection.id);
    if (index === -1) return layers;
    const newLayers = [...layers];
    const [layer] = newLayers.splice(index, 1);
    const targetIndex = direction === 'forward' ? Math.min(newLayers.length, index + 1) : Math.max(0, index - 1);
    newLayers.splice(targetIndex, 0, layer);
    return newLayers;
  };

  return {
    canvas: CANVAS_DEFAULT,
    background: BACKGROUND_DEFAULT,
    shapes: INITIAL_SHAPES,
    texts: INITIAL_TEXTS,
    images: INITIAL_IMAGES,
    layerOrder: INITIAL_LAYER_ORDER,
    selected: { type: null, id: null },
    undoStack: [],
    redoStack: [],

    setZoom: (zoom) =>
      set((state) => ({
        ...state,
        canvas: { ...state.canvas, zoom: Math.min(Math.max(zoom, 0.3), 2) },
      })),

    setBackground: (updates, options) => {
      const updater = (state: CardState) => ({
        ...state,
        background: {
          ...state.background,
          ...updates,
        },
      });
      if (options?.recordHistory === false) {
        set((state) => updater(state));
      } else {
        applyWithHistory(updater);
      }
    },

    addShape: (shape) =>
      applyWithHistory((state) => {
        const id = shape.id ?? createId('shape');
        const nextShape: ShapeElement = {
          strokeColor: '#FFFFFF',
          fillColor: '#F87171',
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
          ...shape,
          id,
        };
        return {
          ...state,
          shapes: [...state.shapes, nextShape],
          layerOrder: [...state.layerOrder, { type: 'shape', id }],
          selected: { type: 'shape', id },
        };
      }),

    updateShape: (id, updates, options) => {
      const updater = (state: CardState) => ({
        ...state,
        shapes: state.shapes.map((shape) => (shape.id === id ? { ...shape, ...updates } : shape)),
      });
      if (options?.recordHistory) {
        applyWithHistory(updater);
      } else {
        set((state) => updater(state));
      }
    },

    removeShape: (id) =>
      applyWithHistory((state) => ({
        ...state,
        shapes: state.shapes.filter((shape) => shape.id !== id),
        layerOrder: removeLayerRef(state.layerOrder, { type: 'shape', id }),
        selected: state.selected.type === 'shape' && state.selected.id === id ? { type: null, id: null } : state.selected,
      })),

    addText: (text) =>
      applyWithHistory((state) => {
        const id = text.id ?? createId('text');
        const nextText: TextElement = {
          fontFamily: 'SpaceGrotesk-Regular',
          fontSize: 48,
          color: '#FFFFFF',
          fontWeight: 'normal',
          fontStyle: 'normal',
          lineHeight: 1.2,
          letterSpacing: 0,
          rotation: 0,
          opacity: 1,
          backgroundColor: null,
          ...text,
          id,
        };
        return {
          ...state,
          texts: [...state.texts, nextText],
          layerOrder: [...state.layerOrder, { type: 'text', id }],
          selected: { type: 'text', id },
        };
      }),

    updateText: (id, updates, options) => {
      const updater = (state: CardState) => ({
        ...state,
        texts: state.texts.map((text) => (text.id === id ? { ...text, ...updates } : text)),
      });
      if (options?.recordHistory) {
        applyWithHistory(updater);
      } else {
        set((state) => updater(state));
      }
    },

    removeText: (id) =>
      applyWithHistory((state) => ({
        ...state,
        texts: state.texts.filter((text) => text.id !== id),
        layerOrder: removeLayerRef(state.layerOrder, { type: 'text', id }),
        selected: state.selected.type === 'text' && state.selected.id === id ? { type: null, id: null } : state.selected,
      })),

    addImage: (image) =>
      applyWithHistory((state) => {
        const id = image.id ?? createId('image');
        const nextImage: ImageElement = {
          scale: 1,
          rotation: 0,
          opacity: 1,
          ...image,
          id,
        };
        return {
          ...state,
          images: [...state.images, nextImage],
          layerOrder: [...state.layerOrder, { type: 'image', id }],
          selected: { type: 'image', id },
        };
      }),

    updateImage: (id, updates, options) => {
      const updater = (state: CardState) => ({
        ...state,
        images: state.images.map((image) => (image.id === id ? { ...image, ...updates } : image)),
      });
      if (options?.recordHistory) {
        applyWithHistory(updater);
      } else {
        set((state) => updater(state));
      }
    },

    removeImage: (id) =>
      applyWithHistory((state) => ({
        ...state,
        images: state.images.filter((image) => image.id !== id),
        layerOrder: removeLayerRef(state.layerOrder, { type: 'image', id }),
        selected: state.selected.type === 'image' && state.selected.id === id ? { type: null, id: null } : state.selected,
      })),

    setSelected: (selection) =>
      set((state) => ({
        ...state,
        selected: selection,
      })),

    bringForward: (selection) =>
      applyWithHistory((state) => ({
        ...state,
        layerOrder: updateLayersOrder(state.layerOrder, selection, 'forward'),
      })),

    sendBackward: (selection) =>
      applyWithHistory((state) => ({
        ...state,
        layerOrder: updateLayersOrder(state.layerOrder, selection, 'backward'),
      })),

    pushHistory: () =>
      set((state) => ({
        ...state,
        undoStack: [...state.undoStack, createSnapshot(state)],
        redoStack: [],
      })),

    undo: () => {
      const state = get();
      if (state.undoStack.length === 0) return;
      const previous = state.undoStack[state.undoStack.length - 1];
      const remainingUndo = state.undoStack.slice(0, -1);
      const redoEntry = createSnapshot(state);
      set({
        ...state,
        canvas: previous.canvas,
        background: previous.background,
        shapes: previous.shapes,
        texts: previous.texts,
        images: previous.images,
        layerOrder: previous.layerOrder,
        selected: previous.selected,
        undoStack: remainingUndo,
        redoStack: [...state.redoStack, redoEntry],
      });
    },

    redo: () => {
      const state = get();
      if (state.redoStack.length === 0) return;
      const next = state.redoStack[state.redoStack.length - 1];
      const remainingRedo = state.redoStack.slice(0, -1);
      const undoEntry = createSnapshot(state);
      set({
        ...state,
        canvas: next.canvas,
        background: next.background,
        shapes: next.shapes,
        texts: next.texts,
        images: next.images,
        layerOrder: next.layerOrder,
        selected: next.selected,
        undoStack: [...state.undoStack, undoEntry],
        redoStack: remainingRedo,
      });
    },
  };
});
