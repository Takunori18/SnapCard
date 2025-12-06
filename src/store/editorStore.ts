// src/stores/editorStore.ts
import { create } from 'zustand';

// ========== 型定義 ==========

export type Transform2D = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type Point = {
  x: number;
  y: number;
};

// 基本要素
type BaseElement = {
  id: string;
  type: 'text' | 'image' | 'shape' | 'sticker' | 'drawing';
  transform: Transform2D;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  name?: string;
  groupId?: string;
};

// テキスト要素
export type TextElement = BaseElement & {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
  shadow?: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
};

// 画像要素
export type ImageElement = BaseElement & {
  type: 'image';
  uri: string;
  width: number;
  height: number;
  mask?: 'circle' | 'rect' | null;
  flipX?: boolean;
  flipY?: boolean;
};

// 図形要素
export type ShapeElement = BaseElement & {
  type: 'shape';
  shapeType: 'rect' | 'roundRect' | 'circle' | 'ellipse' | 'triangle' | 'star';
  width: number;
  height: number;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  points?: number; // 星の頂点数
};

// スタンプ要素
export type StickerElement = BaseElement & {
  type: 'sticker';
  uri: string;
  emoji?: string;
  width: number;
  height: number;
};

// 描画要素
export type DrawingElement = BaseElement & {
  type: 'drawing';
  points: Point[];
  color: string;
  strokeWidth: number;
  brushType: 'pen' | 'marker' | 'highlighter';
};

export type EditorElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | StickerElement
  | DrawingElement;

// レイヤーグループ
export type LayerGroup = {
  id: string;
  name: string;
  elementIds: string[];
  locked?: boolean;
  visible?: boolean;
};

// キャンバス状態
export type CanvasState = {
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
  zoom: number;
  pan: { x: number; y: number };
};

// 選択状態
export type SelectionState = {
  selectedIds: string[];
  hoveredId: string | null;
};

// スナップガイド
export type SnapGuide = {
  type: 'vertical' | 'horizontal';
  position: number;
};

// スナップショット
export type EditorSnapshot = {
  canvas: CanvasState;
  elements: EditorElement[];
  groups: LayerGroup[];
};

// ストアの状態
type EditorStore = {
  // モード
  mode: 'story' | 'card';
  setMode: (mode: 'story' | 'card') => void;

  // キャンバス
  canvas: CanvasState;
  setCanvas: (canvas: Partial<CanvasState>) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;

  // 要素
  elements: EditorElement[];
  addElement: (element: Omit<EditorElement, 'id'>) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  reorderElements: (newOrder: string[]) => void;

  // レイヤー操作
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // グループ
  groups: LayerGroup[];
  createGroup: (elementIds: string[], name: string) => void;
  ungroup: (groupId: string) => void;

  // 選択
  selection: SelectionState;
  selectElements: (ids: string[]) => void;
  setHoveredElement: (id: string | null) => void;

  // スナップガイド
  snapGuides: SnapGuide[];
  setSnapGuides: (guides: SnapGuide[]) => void;

  // 描画モード
  isDrawing: boolean;
  currentDrawing: { points: Point[]; color: string; strokeWidth: number; brushType: string } | null;
  startDrawing: (config: { color: string; strokeWidth: number; brushType: string }) => void;
  updateDrawing: (point: Point) => void;
  finishDrawing: () => void;

  // 履歴
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // スナップショット
  getSnapshot: () => EditorSnapshot;
  loadSnapshot: (snapshot: EditorSnapshot) => void;

  // リセット
  reset: () => void;
};

// ========== 初期状態 ==========

const initialCanvasState: CanvasState = {
  width: 1080,
  height: 1920,
  backgroundColor: '#FFFFFF',
  zoom: 1,
  pan: { x: 0, y: 0 },
};

const MAX_HISTORY = 50;

// ========== ストア ==========

export const useEditorStore = create<EditorStore>((set, get) => ({
  // モード
  mode: 'story',
  setMode: (mode) => set({ mode }),

  // キャンバス
  canvas: initialCanvasState,
  setCanvas: (updates) =>
    set((state) => ({
      canvas: { ...state.canvas, ...updates },
    })),
  setZoom: (zoom) =>
    set((state) => ({
      canvas: { ...state.canvas, zoom },
    })),
  setPan: (pan) =>
    set((state) => ({
      canvas: { ...state.canvas, pan },
    })),

  // 要素
  elements: [],
  
  addElement: (element) => {
    const id = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newElement = { ...element, id } as EditorElement;
    
    set((state) => ({
      elements: [...state.elements, newElement],
    }));
    
    get().pushHistory();
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
    
    get().pushHistory();
  },

  removeElements: (ids) => {
    set((state) => ({
      elements: state.elements.filter((el) => !ids.includes(el.id)),
      selection: {
        ...state.selection,
        selectedIds: state.selection.selectedIds.filter((id) => !ids.includes(id)),
      },
    }));
    
    get().pushHistory();
  },

  duplicateElements: (ids) => {
    const state = get();
    const elementsToDuplicate = state.elements.filter((el) => ids.includes(el.id));
    
    const newElements = elementsToDuplicate.map((el) => ({
      ...el,
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transform: {
        ...el.transform,
        x: el.transform.x + 20,
        y: el.transform.y + 20,
      },
    }));

    set((state) => ({
      elements: [...state.elements, ...newElements],
      selection: {
        ...state.selection,
        selectedIds: newElements.map((el) => el.id),
      },
    }));
    
    get().pushHistory();
  },

  reorderElements: (newOrder) => {
    set((state) => {
      const orderedElements = newOrder
        .map((id) => state.elements.find((el) => el.id === id))
        .filter((el): el is EditorElement => el !== undefined);
      
      return { elements: orderedElements };
    });
    
    get().pushHistory();
  },

  // レイヤー操作
  bringToFront: (id) => {
    set((state) => {
      const element = state.elements.find((el) => el.id === id);
      if (!element) return state;
      
      const filtered = state.elements.filter((el) => el.id !== id);
      return { elements: [...filtered, element] };
    });
    
    get().pushHistory();
  },

  sendToBack: (id) => {
    set((state) => {
      const element = state.elements.find((el) => el.id === id);
      if (!element) return state;
      
      const filtered = state.elements.filter((el) => el.id !== id);
      return { elements: [element, ...filtered] };
    });
    
    get().pushHistory();
  },

  bringForward: (id) => {
    set((state) => {
      const index = state.elements.findIndex((el) => el.id === id);
      if (index === -1 || index === state.elements.length - 1) return state;
      
      const newElements = [...state.elements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      
      return { elements: newElements };
    });
    
    get().pushHistory();
  },

  sendBackward: (id) => {
    set((state) => {
      const index = state.elements.findIndex((el) => el.id === id);
      if (index <= 0) return state;
      
      const newElements = [...state.elements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      
      return { elements: newElements };
    });
    
    get().pushHistory();
  },

  // グループ
  groups: [],
  
  createGroup: (elementIds, name) => {
    const groupId = `group-${Date.now()}`;
    const newGroup: LayerGroup = {
      id: groupId,
      name,
      elementIds,
    };

    set((state) => ({
      groups: [...state.groups, newGroup],
      elements: state.elements.map((el) =>
        elementIds.includes(el.id) ? { ...el, groupId } : el
      ),
    }));
    
    get().pushHistory();
  },

  ungroup: (groupId) => {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      elements: state.elements.map((el) =>
        el.groupId === groupId ? { ...el, groupId: undefined } : el
      ),
    }));
    
    get().pushHistory();
  },

  // 選択
  selection: {
    selectedIds: [],
    hoveredId: null,
  },

  selectElements: (ids) =>
    set((state) => ({
      selection: { ...state.selection, selectedIds: ids },
    })),

  setHoveredElement: (id) =>
    set((state) => ({
      selection: { ...state.selection, hoveredId: id },
    })),

  // スナップガイド
  snapGuides: [],
  setSnapGuides: (guides) => set({ snapGuides: guides }),

  // 描画モード
  isDrawing: false,
  currentDrawing: null,

  startDrawing: ({ color, strokeWidth, brushType }) => {
    set({
      isDrawing: true,
      currentDrawing: {
        points: [],
        color,
        strokeWidth,
        brushType,
      },
    });
  },

  updateDrawing: (point) => {
    set((state) => {
      if (!state.currentDrawing) return state;
      
      return {
        currentDrawing: {
          ...state.currentDrawing,
          points: [...state.currentDrawing.points, point],
        },
      };
    });
  },

  finishDrawing: () => {
    const state = get();
    
    if (state.currentDrawing && state.currentDrawing.points.length > 1) {
      const drawingElement: Omit<DrawingElement, 'id'> = {
        type: 'drawing',
        points: state.currentDrawing.points,
        color: state.currentDrawing.color,
        strokeWidth: state.currentDrawing.strokeWidth,
        brushType: state.currentDrawing.brushType as 'pen' | 'marker' | 'highlighter',
        transform: { x: 0, y: 0, scale: 1, rotation: 0 },
        opacity: 1,
        name: '描画',
      };
      
      get().addElement(drawingElement);
    }
    
    set({
      isDrawing: false,
      currentDrawing: null,
    });
  },

  // 履歴
  undoStack: [],
  redoStack: [],

  pushHistory: () => {
    const snapshot = get().getSnapshot();
    
    set((state) => {
      const newUndoStack = [...state.undoStack, snapshot];
      
      // 履歴サイズ制限
      if (newUndoStack.length > MAX_HISTORY) {
        newUndoStack.shift();
      }
      
      return {
        undoStack: newUndoStack,
        redoStack: [], // 新しい操作でredoスタックをクリア
      };
    });
  },

  undo: () => {
    const state = get();
    
    if (state.undoStack.length === 0) return;
    
    const currentSnapshot = state.getSnapshot();
    const previousSnapshot = state.undoStack[state.undoStack.length - 1];
    
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, currentSnapshot],
    });
    
    get().loadSnapshot(previousSnapshot);
  },

  redo: () => {
    const state = get();
    
    if (state.redoStack.length === 0) return;
    
    const currentSnapshot = state.getSnapshot();
    const nextSnapshot = state.redoStack[state.redoStack.length - 1];
    
    set({
      undoStack: [...state.undoStack, currentSnapshot],
      redoStack: state.redoStack.slice(0, -1),
    });
    
    get().loadSnapshot(nextSnapshot);
  },

  // スナップショット
  getSnapshot: () => {
    const state = get();
    return {
      canvas: state.canvas,
      elements: state.elements,
      groups: state.groups,
    };
  },

  loadSnapshot: (snapshot) => {
    set({
      canvas: snapshot.canvas,
      elements: snapshot.elements,
      groups: snapshot.groups,
    });
  },

  // リセット
  reset: () => {
    set({
      canvas: initialCanvasState,
      elements: [],
      groups: [],
      selection: { selectedIds: [], hoveredId: null },
      snapGuides: [],
      isDrawing: false,
      currentDrawing: null,
      undoStack: [],
      redoStack: [],
    });
  },
}));