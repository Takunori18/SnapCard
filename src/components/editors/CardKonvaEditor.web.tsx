import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import { Stage, Layer, Rect, Image as KonvaImage, Text as KonvaText } from 'react-konva';
import { useTheme, Theme } from '../../theme';
import { SnapCard as StoredSnapCard } from '../../types/card';
import { SnapCard as MockSnapCard } from '../../types';

 type CardLike = StoredSnapCard | MockSnapCard;

 interface CardKonvaEditorProps {
   card: CardLike;
   onClose?: () => void;
   onSave?: (caption: string) => void;
 }

 export const CardKonvaEditor: React.FC<CardKonvaEditorProps> = ({ card, onClose, onSave }) => {
   const theme = useTheme();
   const styles = useMemo(() => createStyles(theme), [theme]);
   const { width } = useWindowDimensions();
   const stageWidth = Math.min(width - theme.spacing.lg * 2, 520);
   const stageHeight = stageWidth * (4 / 3);
 
   const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
   const [overlayText, setOverlayText] = useState(card.caption || 'テキストを追加');
   const [fontSize, setFontSize] = useState(32);
   const [textColor, setTextColor] = useState(theme.colors.secondary);
   const [textPosition, setTextPosition] = useState({ x: stageWidth / 2 - 80, y: stageHeight - 120 });
   const [saving, setSaving] = useState(false);
 
   const imageSource = (card as StoredSnapCard).imageUri || (card as MockSnapCard).imageUrl || '';
 
   useEffect(() => {
     if (!imageSource) return;
     const img = new window.Image();
     img.crossOrigin = 'anonymous';
     img.src = imageSource;
     img.onload = () => setImageElement(img);
     img.onerror = () => setImageElement(null);
     return () => setImageElement(null);
   }, [imageSource]);
 
   const imageBounds = useMemo(() => {
     if (!imageElement) return { width: stageWidth, height: stageHeight, x: 0, y: 0 };
     const scale = Math.max(stageWidth / imageElement.width, stageHeight / imageElement.height);
     const widthScaled = imageElement.width * scale;
     const heightScaled = imageElement.height * scale;
     return {
       width: widthScaled,
       height: heightScaled,
       x: (stageWidth - widthScaled) / 2,
       y: (stageHeight - heightScaled) / 2,
     };
   }, [imageElement, stageWidth, stageHeight]);
 
   const colorPalette = [
     theme.colors.secondary,
     theme.colors.primary,
     '#FFFFFF',
     '#000000',
     theme.colors.accent,
     theme.colors.accentGreen,
   ];
 
   const handleSave = () => {
     if (!onSave) return;
     setSaving(true);
     Promise.resolve(onSave(overlayText)).finally(() => setSaving(false));
   };
 
   return (
     <View style={styles.container}>
       <View style={styles.header}>
         <Text style={styles.headerTitle}>{card.caption || 'カード編集'}</Text>
         {onClose && (
           <TouchableOpacity style={styles.closeButton} onPress={onClose}>
             <Text style={styles.closeButtonText}>戻る</Text>
           </TouchableOpacity>
         )}
       </View>
 
       <ScrollView 
         style={styles.scrollView}
         contentContainerStyle={styles.scrollContent}
         showsVerticalScrollIndicator={true}
       >
         <View style={styles.stageWrapper}>
           <Stage width={stageWidth} height={stageHeight}>
             <Layer>
               <Rect width={stageWidth} height={stageHeight} fill="#111" cornerRadius={16} />
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
               <KonvaText
                 text={overlayText}
                 x={textPosition.x}
                 y={textPosition.y}
                 fill={textColor}
                 fontSize={fontSize}
                 fontStyle="bold"
                 draggable
                 width={stageWidth - 80}
                 align="center"
                 onDragEnd={event =>
                   setTextPosition({
                     x: event.target.x(),
                     y: event.target.y(),
                   })
                 }
               />
             </Layer>
           </Stage>
         </View>
 
         <View style={styles.controls}>
           <View style={styles.controlGroup}>
             <Text style={styles.label}>テキスト</Text>
             <TextInput
               value={overlayText}
               onChangeText={setOverlayText}
               placeholder="テキストを入力"
               style={styles.textInput}
               placeholderTextColor={theme.colors.textTertiary}
             />
           </View>
 
           <View style={styles.controlGroup}>
             <Text style={styles.label}>カラー</Text>
             <View style={styles.colorRow}>
               {colorPalette.map(color => (
                 <TouchableOpacity
                   key={color}
                   style={[
                     styles.colorSwatch,
                     {
                       backgroundColor: color,
                       borderColor: textColor === color ? theme.colors.accent : 'transparent',
                     },
                   ]}
                   onPress={() => setTextColor(color)}
                 />
               ))}
             </View>
           </View>
 
           <View style={styles.controlGroup}>
             <Text style={styles.label}>サイズ</Text>
             <View style={styles.fontRow}>
               <TouchableOpacity style={styles.fontButton} onPress={() => setFontSize(prev => Math.max(16, prev - 4))}>
                 <Text style={styles.fontButtonText}>−</Text>
               </TouchableOpacity>
               <Text style={styles.fontSizeValue}>{fontSize}px</Text>
               <TouchableOpacity style={styles.fontButton} onPress={() => setFontSize(prev => Math.min(80, prev + 4))}>
                 <Text style={styles.fontButtonText}>＋</Text>
               </TouchableOpacity>
             </View>
           </View>
         </View>
 
         <View style={styles.actions}>
           {onClose && (
             <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
               <Text style={styles.secondaryText}>キャンセル</Text>
             </TouchableOpacity>
           )}
           {onSave && (
             <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
               <Text style={styles.primaryText}>{saving ? '保存中…' : '保存'}</Text>
             </TouchableOpacity>
           )}
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
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
       paddingHorizontal: theme.spacing.md,
       paddingVertical: theme.spacing.md,
       borderBottomWidth: 1,
       borderBottomColor: theme.colors.border,
       backgroundColor: theme.colors.secondary,
     },
     headerTitle: {
       fontSize: theme.fontSize.lg,
       fontWeight: theme.fontWeight.bold,
       color: theme.colors.textPrimary,
     },
     closeButton: {
       paddingHorizontal: theme.spacing.md,
       paddingVertical: theme.spacing.xs,
       borderRadius: theme.borderRadius.full,
       borderWidth: 1,
       borderColor: theme.colors.border,
     },
     closeButtonText: {
       color: theme.colors.textSecondary,
       fontWeight: theme.fontWeight.medium,
     },
     scrollView: {
       flex: 1,
     },
     scrollContent: {
       padding: theme.spacing.md,
       gap: theme.spacing.md,
     },
     stageWrapper: {
       alignItems: 'center',
       justifyContent: 'center',
       backgroundColor: theme.colors.secondary,
       borderRadius: theme.borderRadius.lg,
       padding: theme.spacing.md,
       shadowColor: '#000',
       shadowOpacity: 0.1,
       shadowRadius: 8,
       elevation: 2,
     },
     controls: {
       gap: theme.spacing.md,
     },
     controlGroup: {
       backgroundColor: theme.colors.secondary,
       borderRadius: theme.borderRadius.lg,
       padding: theme.spacing.md,
       gap: theme.spacing.sm,
     },
     label: {
       fontSize: theme.fontSize.sm,
       color: theme.colors.textSecondary,
     },
     textInput: {
       backgroundColor: theme.colors.cardBackground,
       borderRadius: theme.borderRadius.md,
       padding: theme.spacing.sm,
       color: theme.colors.textPrimary,
     },
     colorRow: {
       flexDirection: 'row',
       gap: theme.spacing.sm,
     },
     colorSwatch: {
       width: 32,
       height: 32,
       borderRadius: theme.borderRadius.full,
       borderWidth: 2,
     },
     fontRow: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: theme.spacing.sm,
     },
     fontButton: {
       width: 36,
       height: 36,
       borderRadius: theme.borderRadius.full,
       backgroundColor: theme.colors.cardBackground,
       alignItems: 'center',
       justifyContent: 'center',
     },
     fontButtonText: {
       fontSize: theme.fontSize.lg,
       color: theme.colors.textPrimary,
     },
     fontSizeValue: {
       fontSize: theme.fontSize.md,
       color: theme.colors.textPrimary,
       minWidth: 60,
       textAlign: 'center',
     },
     actions: {
       flexDirection: 'row',
       justifyContent: 'flex-end',
       gap: theme.spacing.sm,
       paddingBottom: theme.spacing.lg,
     },
     primaryButton: {
       paddingHorizontal: theme.spacing.lg,
       paddingVertical: theme.spacing.sm,
       borderRadius: theme.borderRadius.full,
       backgroundColor: theme.colors.accent,
     },
     primaryText: {
       color: theme.colors.secondary,
       fontWeight: theme.fontWeight.bold,
     },
     secondaryButton: {
       paddingHorizontal: theme.spacing.lg,
       paddingVertical: theme.spacing.sm,
       borderRadius: theme.borderRadius.full,
       borderWidth: 1,
       borderColor: theme.colors.border,
     },
     secondaryText: {
       color: theme.colors.textPrimary,
       fontWeight: theme.fontWeight.medium,
     },
   });
