import React, { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { font } from '@/theme';

const ROW_GAP = 18;
const WORD_SIZE = 15;
const WORD_TOUCH_HEIGHT = 44;
const WORD_PADDING = 6;

/**
 * A card's one main button with a small bold word to its left (Home beside Next lesson, Skip beside Start lesson).
 * With no `word` it is the button alone. `loading` swaps the word for a spinner.
 */
export function SideWordAction({ word, color, onWordPress, wordTestID, loading = false, children }: {
  word?: string;
  color: string;
  onWordPress: () => void;
  wordTestID?: string;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      {word !== undefined && (
        <Pressable testID={wordTestID} accessibilityRole="button" onPress={onWordPress} disabled={loading} style={styles.touch}>
          {loading ? <ActivityIndicator color={color} /> : <Text style={[styles.word, { color }]}>{word}</Text>}
        </Pressable>
      )}
      <View style={styles.main}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: ROW_GAP },
  main:  { flex: 1 },
  touch: { minHeight: WORD_TOUCH_HEIGHT, justifyContent: 'center', paddingHorizontal: WORD_PADDING },
  word:  { fontFamily: font.bold, fontSize: WORD_SIZE },
});
