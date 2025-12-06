// src/components/editors/SkiaCanvas.tsx
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, Platform } from 'react-native';
import {
  Canvas,
  Group,
  Text as SkText,
  Image as SkImage,
  Rect,
  RoundedRect,
  Circle,
  Path,
  Paint,
  Skia,
  useFont,
  useImage,
  Fill,
} from '@shopify/react-native-skia';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useEditorStore, EditorElement, TextElement, ImageElement, ShapeElement, DrawingElement } from '../../store/editorStore';

type SkiaCanvasProps = {
  width: number;
  height: number;
  onElementSelect?: (id: string | null) => void;
};

// フォント設定（実機対応）
const FONT_FAMILIES: Record<string, string> = {
  'System': Platform.select({
    ios: 'Helvetica',
    android: 'Roboto',
    default: 'Arial',
  }) || 'Arial',
  'Classic': 'Times New Roman',
  'Modern': 'Helvetica',
  'Script': 'Courier New',
  'Elegant': 'Georgia',
  'Bold': 'Arial Black',
};

export const SkiaCanvas: React.FC<SkiaCanvasProps> = ({
  width,
  height,
  onElementSelect,
}) => {
  const {
    canvas,
    elements,
    selection,
    selectElements,
    updateElement,
    setZoom,
    setPan,
    isDrawing,
    currentDrawing,
    updateDrawing,
    finishDrawing,
  } = useEditorStore();

  // ジェスチャー用の共有値
  const scale = useSharedValue(canvas.zoom);
  const offsetX = useSharedValue(canvas.pan.x);
  const offsetY = useSharedValue(canvas.pan.y);
  const savedScale = useSharedValue(canvas.zoom);
  const savedOffsetX = useSharedValue(canvas.pan.x);
  const savedOffsetY = useSharedValue(canvas.pan.y);

  // ピンチジェスチャー（ズーム）
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.min(Math.max(savedScale.value * event.scale, 0.1), 5);
    })
    .onEnd(() => {
      setZoom(scale.value);
    });

  // パンジェスチャー（移動）
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedOffsetX.value = offsetX.value;
      savedOffsetY.value = offsetY.value;
    })
    .onUpdate((event) => {
      offsetX.value = savedOffsetX.value + event.translationX;
      offsetY.value = savedOffsetY.value + event.translationY;
    })
    .onEnd(() => {
      setPan({ x: offsetX.value, y: offsetY.value });
    });

  // タップジェスチャー（要素選択）
  const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const x = (event.x - offsetX.value) / scale.value;
      const y = (event.y - offsetY.value) / scale.value;

      // 逆順でヒットテスト（上のレイヤーから）
      let hitElement: EditorElement | null = null;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.visible === false || el.locked) continue;

        const { x: ex, y: ey, scale: es } = el.transform;
        
        let hitTest = false;
        
        switch (el.type) {
          case 'text':
            const textWidth = (el.text?.length || 0) * el.fontSize * 0.6 * es;
            const textHeight = el.fontSize * es;
            hitTest = x >= ex && x <= ex + textWidth && y >= ey && y <= ey + textHeight;
            break;
            
          case 'image':
          case 'shape':
            const w = el.width * es;
            const h = el.height * es;
            hitTest = x >= ex && x <= ex + w && y >= ey && y <= ey + h;
            break;
            
          case 'drawing':
            // 描画のヒットテストは簡易版
            if (el.points && el.points.length > 0) {
              const threshold = (el.strokeWidth || 5) * es;
              hitTest = el.points.some(p => 
                Math.abs(p.x - x) < threshold && Math.abs(p.y - y) < threshold
              );
            }
            break;
        }

        if (hitTest) {
          hitElement = el;
          break;
        }
      }

      if (hitElement) {
        selectElements([hitElement.id]);
        onElementSelect?.(hitElement.id);
      } else {
        selectElements([]);
        onElementSelect?.(null);
      }
    });

  // 描画ジェスチャー（描画モード時）
  const drawGesture = Gesture.Pan()
    .enabled(isDrawing)
    .onStart((event) => {
      const x = (event.x - offsetX.value) / scale.value;
      const y = (event.y - offsetY.value) / scale.value;
      // 描画開始は既にstoreで管理
    })
    .onUpdate((event) => {
      const x = (event.x - offsetX.value) / scale.value;
      const y = (event.y - offsetY.value) / scale.value;
      updateDrawing({ x, y });
    })
    .onEnd(() => {
      finishDrawing();
    });

  const composedGesture = Gesture.Race(
    drawGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
    tapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureHandlerRootView style={{ width, height }}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <Canvas style={{ width: canvas.width, height: canvas.height }}>
            {/* 背景 */}
            <Fill color={canvas.backgroundColor || '#FFFFFF'} />
            
            {/* 背景画像 */}
            {canvas.backgroundImage && (
              <BackgroundImage uri={canvas.backgroundImage} width={canvas.width} height={canvas.height} />
            )}

            {/* 要素レンダリング */}
            {elements.map((element) => {
              if (element.visible === false) return null;
              return <ElementRenderer key={element.id} element={element} />;
            })}

            {/* 現在描画中のパス */}
            {isDrawing && currentDrawing && currentDrawing.points.length > 1 && (
              <DrawingPath drawing={currentDrawing} />
            )}

            {/* 選択ボックス */}
            {selection.selectedIds.map((id) => {
              const element = elements.find((el) => el.id === id);
              if (!element) return null;
              return <SelectionBox key={`selection-${id}`} element={element} />;
            })}
          </Canvas>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

// ========== 要素レンダラー ==========

const ElementRenderer: React.FC<{ element: EditorElement }> = ({ element }) => {
  switch (element.type) {
    case 'text':
      return <TextRenderer element={element} />;
    case 'image':
      return <ImageRenderer element={element} />;
    case 'shape':
      return <ShapeRenderer element={element} />;
    case 'drawing':
      return <DrawingRenderer element={element} />;
    case 'sticker':
      return <StickerRenderer element={element} />;
    default:
      return null;
  }
};

// ========== テキストレンダラー ==========

const TextRenderer: React.FC<{ element: TextElement }> = ({ element }) => {
  const fontFamily = FONT_FAMILIES[element.fontFamily || 'System'];
  const font = useFont(
    require('../../../assets/fonts/Roboto-Regular.ttf'), // フォールバック
    element.fontSize
  );

  if (!font) return null;

  const { x, y, scale: s, rotation } = element.transform;
  const opacity = element.opacity ?? 1;

  return (
    <Group
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: (rotation * Math.PI) / 180 },
        { scale: s },
      ]}
      opacity={opacity}
    >
      {/* 背景色 */}
      {element.backgroundColor && element.backgroundColor !== 'transparent' && (
        <Rect
          x={0}
          y={0}
          width={(element.text?.length || 0) * element.fontSize * 0.6}
          height={element.fontSize * 1.2}
          color={element.backgroundColor}
        />
      )}

      {/* テキスト */}
      <SkText
        x={0}
        y={element.fontSize}
        text={element.text || ''}
        font={font}
        color={element.color}
      />
    </Group>
  );
};

// ========== 画像レンダラー ==========

const ImageRenderer: React.FC<{ element: ImageElement }> = ({ element }) => {
  const image = useImage(element.uri);

  if (!image) return null;

  const { x, y, scale: s, rotation } = element.transform;
  const opacity = element.opacity ?? 1;

  return (
    <Group
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: (rotation * Math.PI) / 180 },
        { scale: s },
        { scaleX: element.flipX ? -1 : 1 },
        { scaleY: element.flipY ? -1 : 1 },
      ]}
      opacity={opacity}
    >
      <SkImage
        image={image}
        x={element.flipX ? -element.width : 0}
        y={element.flipY ? -element.height : 0}
        width={element.width}
        height={element.height}
        fit="cover"
      />
    </Group>
  );
};

// ========== 図形レンダラー ==========

const ShapeRenderer: React.FC<{ element: ShapeElement }> = ({ element }) => {
  const { x, y, scale: s, rotation } = element.transform;
  const opacity = element.opacity ?? 1;

  const fillPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(element.fillColor));
    paint.setAlphaf(opacity);
    return paint;
  }, [element.fillColor, opacity]);

  const strokePaint = useMemo(() => {
    if (!element.strokeWidth || !element.strokeColor) return null;
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(element.strokeColor));
    paint.setStyle(1); // Stroke
    paint.setStrokeWidth(element.strokeWidth);
    return paint;
  }, [element.strokeColor, element.strokeWidth]);

  return (
    <Group
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: (rotation * Math.PI) / 180 },
        { scale: s },
      ]}
    >
      {element.shapeType === 'rect' && (
        <>
          <Rect
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            color={element.fillColor}
            opacity={opacity}
          />
          {strokePaint && (
            <Rect
              x={0}
              y={0}
              width={element.width}
              height={element.height}
              paint={strokePaint}
            />
          )}
        </>
      )}

      {element.shapeType === 'roundRect' && (
        <>
          <RoundedRect
            x={0}
            y={0}
            width={element.width}
            height={element.height}
            r={element.cornerRadius || 10}
            color={element.fillColor}
            opacity={opacity}
          />
          {strokePaint && (
            <RoundedRect
              x={0}
              y={0}
              width={element.width}
              height={element.height}
              r={element.cornerRadius || 10}
              paint={strokePaint}
            />
          )}
        </>
      )}

      {element.shapeType === 'circle' && (
        <>
          <Circle
            cx={element.width / 2}
            cy={element.height / 2}
            r={Math.min(element.width, element.height) / 2}
            color={element.fillColor}
            opacity={opacity}
          />
          {strokePaint && (
            <Circle
              cx={element.width / 2}
              cy={element.height / 2}
              r={Math.min(element.width, element.height) / 2}
              paint={strokePaint}
            />
          )}
        </>
      )}

      {element.shapeType === 'ellipse' && (
        <>
          <Circle
            cx={element.width / 2}
            cy={element.height / 2}
            r={element.width / 2}
            color={element.fillColor}
            opacity={opacity}
            transform={[{ scaleY: element.height / element.width }]}
          />
        </>
      )}
    </Group>
  );
};

// ========== 描画レンダラー ==========

const DrawingRenderer: React.FC<{ element: DrawingElement }> = ({ element }) => {
  if (!element.points || element.points.length < 2) return null;

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(element.points[0].x, element.points[0].y);
    for (let i = 1; i < element.points.length; i++) {
      p.lineTo(element.points[i].x, element.points[i].y);
    }
    return p;
  }, [element.points]);

  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(element.color));
    p.setStyle(1); // Stroke
    p.setStrokeWidth(element.strokeWidth || 5);
    p.setStrokeCap(1); // Round
    p.setStrokeJoin(1); // Round
    
    let alpha = element.opacity ?? 1;
    if (element.brushType === 'marker') alpha *= 0.7;
    if (element.brushType === 'highlighter') alpha *= 0.4;
    p.setAlphaf(alpha);
    
    return p;
  }, [element.color, element.strokeWidth, element.brushType, element.opacity]);

  return <Path path={path} paint={paint} />;
};

// ========== 描画中のパス ==========

const DrawingPath: React.FC<{ drawing: any }> = ({ drawing }) => {
  if (!drawing.points || drawing.points.length < 2) return null;

  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(drawing.points[0].x, drawing.points[0].y);
    for (let i = 1; i < drawing.points.length; i++) {
      p.lineTo(drawing.points[i].x, drawing.points[i].y);
    }
    return p;
  }, [drawing.points]);

  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(drawing.color));
    p.setStyle(1);
    p.setStrokeWidth(drawing.strokeWidth || 5);
    p.setStrokeCap(1);
    p.setStrokeJoin(1);
    
    let alpha = 1;
    if (drawing.brushType === 'marker') alpha = 0.7;
    if (drawing.brushType === 'highlighter') alpha = 0.4;
    p.setAlphaf(alpha);
    
    return p;
  }, [drawing.color, drawing.strokeWidth, drawing.brushType]);

  return <Path path={path} paint={paint} />;
};

// ========== スタンプレンダラー ==========

const StickerRenderer: React.FC<{ element: any }> = ({ element }) => {
  // スタンプ実装（絵文字やカスタム画像）
  return null;
};

// ========== 背景画像 ==========

const BackgroundImage: React.FC<{ uri: string; width: number; height: number }> = ({
  uri,
  width,
  height,
}) => {
  const image = useImage(uri);
  
  if (!image) return null;

  return <SkImage image={image} x={0} y={0} width={width} height={height} fit="cover" />;
};

// ========== 選択ボックス ==========

const SelectionBox: React.FC<{ element: EditorElement }> = ({ element }) => {
  const { x, y, scale: s } = element.transform;
  
  let width = 0;
  let height = 0;
  
  if (element.type === 'text') {
    width = ((element.text?.length || 0) * element.fontSize * 0.6) * s;
    height = element.fontSize * 1.2 * s;
  } else if (element.type === 'image' || element.type === 'shape') {
    width = element.width * s;
    height = element.height * s;
  }

  const paint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#2563EB'));
    p.setStyle(1); // Stroke
    p.setStrokeWidth(2);
    return p;
  }, []);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      paint={paint}
    />
  );
};
