import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, spacing } from '@/theme';

// Paragraphs are separated by a gap, not by the blank lines in the stored text.
function paragraphsOf(raw: string): string[] {
  return raw.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0);
}

/** A lesson's full text: its picture, if it has one, then its paragraphs. */
export function LessonReading({ content, mediaUrl }: { content: string; mediaUrl?: string }) {
  return (
    <>
      {!!mediaUrl && (
        <Image
          testID="lesson-media"
          source={{ uri: mediaUrl }}
          style={styles.media}
          resizeMode="cover"
          accessibilityLabel="Lesson media"
        />
      )}
      <View testID="lesson-content" style={styles.contentBlock}>
        {paragraphsOf(content).map((paragraph, i) => (
          <Text key={i} testID="lesson-paragraph" style={styles.contentText}>{paragraph}</Text>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  media: {
    width:        '100%',
    height:       180,
    borderRadius: 8,
  },
  contentBlock: {
    gap: spacing.sm3,
  },
  contentText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textDark,
    lineHeight: fontSize.base * 1.6,
  },
});
