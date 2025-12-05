import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Stage, Layer, Rect, Image as KonvaImage, Text as KonvaText } from 'react-konva';
import { useTheme, Theme } from '../../theme';

 type TextLayer = {
   id: string;
   text: string;
   color: string;
   fontSize: number;
   fontFamily?: string;
   backgroundColor?: string;
   xRatio: number;
   yRatio: number;
 };

 export interface StoryKonvaEditorValues {
   text: string;
   textColor: string;
   textSize: 'small' | 'medium' | 'large';
   backgroundColor: string;
   tags: string[];
   textPosition: { x: number; y: number };
   overlays: TextLayer[];
 }

 interface StoryKonvaEditorProps {
   imageUri: string;
   saving?: boolean;
   onSave: (values: StoryKonvaEditorValues) => void;
   onCancel: () => void;
 }

 const FONT_OPTIONS = [16, 28, 36, 48, 60];

 export const StoryKonvaEditor: React.FC<StoryKonvaEditorProps> = ({ imageUri, saving = false, onSave, onCancel }) => {
   const theme = useTheme();
   const styles = useMemo(() => createStyles(theme), [theme]);
   const { width } = useWindowDimensions();
   const canvasWidth = Math.min(width - theme.spacing.lg * 2, 560);
   const canvasHeight = canvasWidth * (4 / 3);

   const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
   const [layers, setLayers] = useState<TextLayer[]>([
     {
       id: 'layer-1',
       text: '新しいテキスト',
       color: theme.colors.secondary,
       fontSize: 36,
       backgroundColor: 'transparent',
       xRatio: 0.1,
       yRatio: 0.7,
     },
   ]);
   const [selectedLayerId, setSelectedLayerId] = useState('layer-1');
   const [tags, setTags] = useState<string[]>([]);
   const [tagInput, setTagInput] = useState('');

   const selectedLayer = layers.find(layer => layer.id === selectedLayerId);

   useEffect(() => {
     if (!imageUri) return;
     const img = new window.Image();
     img.crossOrigin = 'anonymous';
     img.src = imageUri;
     img.onload = () => setImageElement(img);
     img.onerror = () => setImageElement(null);
     return () => setImageElement(null);
   }, [imageUri]);

   const imageBounds = useMemo(() => {
     if (!imageElement) return { width: canvasWidth, height: canvasHeight, x: 0, y: 0 };
     const scale = Math.max(canvasWidth / imageElement.width, canvasHeight / imageElement.height);
     const widthScaled = imageElement.width * scale;
     const heightScaled = imageElement.height * scale;
     return {
       width: widthScaled,
       height: heightScaled,
       x: (canvasWidth - widthScaled) / 2,
       y: (canvasHeight - heightScaled) / 2,
     };
   }, [imageElement, canvasWidth, canvasHeight]);

   const updateLayer = (id: string, updates: Partial<TextLayer>) => {
     setLayers(prev => prev.map(layer => (layer.id === id ? { ...layer, ...updates } : layer)));
   };

   const addLayer = () => {
     const id = `layer-${Date.now()}`;
     const newLayer: TextLayer = {
       id,
       text: '新しいテキスト',
       color: theme.colors.secondary,
       fontSize: 32,
       backgroundColor: 'transparent',
       xRatio: 0.2,
       yRatio: 0.5,
     };
     setLayers(prev => [...prev, newLayer]);
     setSelectedLayerId(id);
   };

   const deleteLayer = () => {
     setLayers(prev => {
       const filtered = prev.filter(layer => layer.id !== selectedLayerId);
       if (!filtered.length) {
         const defaultLayer = { ...prev[0], id: `layer-${Date.now()}`, text: 'テキスト', xRatio: 0.1, yRatio: 0.7 };
         setSelectedLayerId(defaultLayer.id);
         return [defaultLayer];
       }
       setSelectedLayerId(filtered[0].id);
       return filtered;
     });
   };

   const addTag = () => {
     const trimmed = tagInput.trim();
     if (trimmed && !tags.includes(trimmed)) {
       setTags(prev => [...prev, trimmed]);
     }
     setTagInput('');
   };

   const handleSave = () => {
     const primary = layers[0];
     const toSize = (size: number): 'small' | 'medium' | 'large' => {
       if (size <= 28) return 'small';
       if (size >= 48) return 'large';
       return 'medium';
     };
     onSave({
       text: primary?.text ?? '',
       textColor: primary?.color ?? theme.colors.secondary,
       textSize: toSize(primary?.fontSize ?? 32),
       backgroundColor: primary?.backgroundColor ?? 'transparent',
       tags,
       textPosition: {
         x: primary?.xRatio ?? 0.5,
         y: primary?.yRatio ?? 0.6,
       },
       overlays: layers,
     });
   };

   const colorPalette = [
     theme.colors.secondary,
     '#FFFFFF',
     '#000000',
     theme.colors.primary,
     theme.colors.accent,
     theme.colors.accentGreen,
   ];

   const backgroundOptions = ['transparent', 'rgba(0,0,0,0.5)', 'rgba(255,255,255,0.55)', 'rgba(0,0,0,0.85)'];

   return (
     <View style={styles.container}>
       <View style={styles.header}>
         <Text style={styles.title}>ストーリーを編集</Text>
       </View>

       <ScrollView 
         style={styles.scrollView}
         contentContainerStyle={styles.scrollContent}
         showsVerticalScrollIndicator={true}
       >
         <View style={styles.stageWrapper}>
           <Stage width={canvasWidth} height={canvasHeight}>
             <Layer>
               <Rect width={canvasWidth} height={canvasHeight} fill="#111" cornerRadius={24} />
               {imageElement && (
                 <KonvaImage
                   image={imageElement}
                   width={imageBounds.width}
                   height={imageBounds.height}
                   x={imageBounds.x}
                   y={imageBounds.y}
                   listening={false}
                 />
               )}
               {layers.map(layer => {
                 const x = layer.xRatio * canvasWidth;
                 const y = layer.yRatio * canvasHeight;
                 return (
                   <KonvaText
                     key={layer.id}
                     text={layer.text}
                     x={x}
                     y={y}
                     fill={layer.color}
                     fontSize={layer.fontSize}
                     fontFamily={layer.fontFamily}
                     draggable
                     width={canvasWidth - 80}
                     align="center"
                     opacity={layer.id === selectedLayerId ? 1 : 0.8}
                     onDragEnd={event =>
                       updateLayer(layer.id, {
                         xRatio: event.target.x() / canvasWidth,
                         yRatio: event.target.y() / canvasHeight,
                       })
                     }
                     onClick={() => setSelectedLayerId(layer.id)}
                   />
                 );
               })}
             </Layer>
           </Stage>
         </View>

         <View style={styles.layerBar}>
           {layers.map(layer => (
             <TouchableOpacity
               key={layer.id}
               style={[styles.layerChip, selectedLayerId === layer.id && styles.layerChipActive]}
               onPress={() => setSelectedLayerId(layer.id)}
             >
               <Text style={styles.layerChipText}>{layer.text.slice(0, 8) || 'テキスト'}</Text>
             </TouchableOpacity>
           ))}
           <TouchableOpacity style={styles.addLayerButton} onPress={addLayer}>
             <Text style={styles.addLayerText}>＋ テキスト</Text>
           </TouchableOpacity>
           {layers.length > 1 && (
             <TouchableOpacity style={styles.deleteLayerButton} onPress={deleteLayer}>
               <Text style={styles.deleteLayerText}>削除</Text>
             </TouchableOpacity>
           )}
         </View>

         {selectedLayer && (
           <View style={styles.controls}>
             <View style={styles.controlGroup}>
               <Text style={styles.label}>テキスト</Text>
               <TextInput
                 style={styles.input}
                 value={selectedLayer.text}
                 onChangeText={text => updateLayer(selectedLayer.id, { text })}
                 placeholder="テキストを入力"
                 placeholderTextColor={theme.colors.textTertiary}
               />
             </View>

             <View style={styles.controlGroup}>
               <Text style={styles.label}>文字色</Text>
               <View style={styles.row}>
                 {colorPalette.map(color => (
                   <TouchableOpacity
                     key={color}
                     style={[
                       styles.colorSwatch,
                       {
                         backgroundColor: color,
                         borderColor: selectedLayer.color === color ? theme.colors.accent : 'transparent',
                       },
                     ]}
                     onPress={() => updateLayer(selectedLayer.id, { color })}
                   />
                 ))}
               </View>
             </View>

             <View style={styles.controlGroup}>
               <Text style={styles.label}>背景</Text>
               <View style={styles.row}>
                 {backgroundOptions.map(option => (
                   <TouchableOpacity
                     key={option}
                     style={[
                       styles.backgroundSwatch,
                       {
                         backgroundColor: option === 'transparent' ? 'transparent' : option,
                         borderColor:
                           selectedLayer.backgroundColor === option ? theme.colors.accent : theme.colors.border,
                       },
                     ]}
                     onPress={() => updateLayer(selectedLayer.id, { backgroundColor: option })}
                   >
                     {option === 'transparent' && <Text style={styles.transparentLabel}>透過</Text>}
                   </TouchableOpacity>
                 ))}
               </View>
             </View>

             <View style={styles.controlGroup}>
               <Text style={styles.label}>サイズ</Text>
               <View style={styles.row}>
                 {FONT_OPTIONS.map(size => (
                   <TouchableOpacity
                     key={size}
                     style={[styles.sizeButton, selectedLayer.fontSize === size && styles.sizeButtonActive]}
                     onPress={() => updateLayer(selectedLayer.id, { fontSize: size })}
                   >
                     <Text
                       style={[
                         styles.sizeButtonText,
                         { color: selectedLayer.fontSize === size ? theme.colors.secondary : theme.colors.textPrimary },
                       ]}
                     >
                       {size}px
                     </Text>
                   </TouchableOpacity>
                 ))}
               </View>
             </View>
           </View>
         )}

         <View style={styles.controlGroup}>
           <Text style={styles.label}>タグ</Text>
           <View style={styles.tagRow}>
             <TextInput
               style={[styles.input, { flex: 1 }]}
               value={tagInput}
               onChangeText={setTagInput}
               placeholder="タグを入力"
               placeholderTextColor={theme.colors.textTertiary}
               onSubmitEditing={addTag}
             />
             <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
               <Text style={styles.addTagText}>追加</Text>
             </TouchableOpacity>
           </View>
           <View style={styles.tagList}>
             {tags.map(tag => (
               <TouchableOpacity key={tag} style={styles.tag} onPress={() => setTags(prev => prev.filter(t => t !== tag))}>
                 <Text style={styles.tagText}>#{tag}</Text>
                 <Text style={styles.removeTag}>×</Text>
               </TouchableOpacity>
             ))}
           </View>
         </View>

         <View style={styles.actionRow}>
           <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
             <Text style={styles.cancelText}>キャンセル</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving || !layers.length}>
             <Text style={styles.saveText}>{saving ? '保存中…' : '保存'}</Text>
           </TouchableOpacity>
         </View>
       </ScrollView>
     </View>
   );
 };

 const createStyles = (theme: Theme) =>
   StyleSheet.create({
     container: {
       flex: 1,
       backgroundColor: theme.colors.background,
     },
     header: {
       paddingHorizontal: theme.spacing.lg,
       paddingVertical: theme.spacing.md,
       borderBottomWidth: 1,
       borderBottomColor: theme.colors.border,
       backgroundColor: theme.colors.secondary,
     },
     title: {
       fontSize: theme.fontSize.lg,
       fontWeight: theme.fontWeight.bold,
       color: theme.colors.textPrimary,
     },
     scrollView: {
       flex: 1,
     },
     scrollContent: {
       padding: theme.spacing.lg,
       gap: theme.spacing.md,
     },
     stageWrapper: {
       alignItems: 'center',
       padding: theme.spacing.md,
       borderRadius: theme.borderRadius.lg,
       backgroundColor: theme.colors.secondary,
       shadowColor: '#000',
       shadowOpacity: 0.1,
       shadowRadius: 8,
     },
     layerBar: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       gap: theme.spacing.sm,
       alignItems: 'center',
     },
     layerChip: {
       paddingHorizontal: theme.spacing.sm,
       paddingVertical: theme.spacing.xs,
       borderRadius: theme.borderRadius.full,
       backgroundColor: theme.colors.cardBackground,
     },
     layerChipActive: {
       backgroundColor: theme.colors.accent,
     },
     layerChipText: {
       color: theme.colors.textPrimary,
     },
     addLayerButton: {
       paddingHorizontal: theme.spacing.md,
       paddingVertical: theme.spacing.xs,
       borderRadius: theme.borderRadius.full,
       borderWidth: 1,
       borderColor: theme.colors.accent,
     },
     addLayerText: {
       color: theme.colors.accent,
       fontWeight: theme.fontWeight.semibold,
     },
     deleteLayerButton: {
       paddingHorizontal: theme.spacing.md,
       paddingVertical: theme.spacing.xs,
       borderRadius: theme.borderRadius.full,
       borderWidth: 1,
       borderColor: theme.colors.error,
     },
     deleteLayerText: {
       color: theme.colors.error,
     },
     controls: {
       gap: theme.spacing.md,
     },
     controlGroup: {
       padding: theme.spacing.md,
       backgroundColor: theme.colors.secondary,
       borderRadius: theme.borderRadius.lg,
       gap: theme.spacing.sm,
     },
     label: {
       fontSize: theme.fontSize.sm,
       color: theme.colors.textSecondary,
     },
     input: {
       backgroundColor: theme.colors.cardBackground,
       borderRadius: theme.borderRadius.md,
       padding: theme.spacing.sm,
       color: theme.colors.textPrimary,
     },
     row: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       gap: theme.spacing.sm,
     },
     colorSwatch: {
       width: 32,
       height: 32,
       borderRadius: theme.borderRadius.full,
       borderWidth: 2,
     },
     backgroundSwatch: {
       width: 60,
       height: 32,
       borderRadius: theme.borderRadius.md,
       borderWidth: 2,
       alignItems: 'center',
       justifyContent: 'center',
     },
     transparentLabel: {
       fontSize: theme.fontSize.xs,
       color: theme.colors.textPrimary,
     },
     sizeButton: {
       paddingHorizontal: theme.spacing.md,
       paddingVertical: theme.spacing.xs,
       borderRadius: theme.borderRadius.full,
       backgroundColor: theme.colors.cardBackground,
     },
     sizeButtonActive: {
       backgroundColor: theme.colors.accent,
     },
     sizeButtonText: {
       fontWeight: theme.fontWeight.semibold,
     },
     tagRow: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: theme.spacing.sm,
     },
     addTagButton: {
       paddingHorizontal: theme.spacing.md,
       paddingVertical: theme.spacing.sm,
       borderRadius: theme.borderRadius.full,
       backgroundColor: theme.colors.accent,
     },
     addTagText: {
       color: theme.colors.secondary,
       fontWeight: theme.fontWeight.bold,
     },
     tagList: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       gap: theme.spacing.sm,
     },
     tag: {
       flexDirection: 'row',
       alignItems: 'center',
       backgroundColor: theme.colors.cardBackground,
       paddingHorizontal: theme.spacing.sm,
       paddingVertical: theme.spacing.xs,
       borderRadius: theme.borderRadius.full,
       gap: 4,
     },
     tagText: {
       color: theme.colors.textPrimary,
     },
     removeTag: {
       color: theme.colors.textSecondary,
     },
     actionRow: {
       flexDirection: 'row',
       justifyContent: 'space-between',
       gap: theme.spacing.sm,
       paddingBottom: theme.spacing.lg,
     },
     cancelButton: {
       flex: 1,
       paddingVertical: theme.spacing.sm,
       borderRadius: theme.borderRadius.full,
       borderWidth: 1,
       borderColor: theme.colors.border,
       alignItems: 'center',
     },
     cancelText: {
       color: theme.colors.textPrimary,
     },
     saveButton: {
       flex: 1,
       paddingVertical: theme.spacing.sm,
       borderRadius: theme.borderRadius.full,
       backgroundColor: theme.colors.accent,
       alignItems: 'center',
     },
     saveText: {
       color: theme.colors.secondary,
       fontWeight: theme.fontWeight.bold,
     },
   });
