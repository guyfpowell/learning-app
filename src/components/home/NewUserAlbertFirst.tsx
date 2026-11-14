import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { HeroBackground } from '@/components/ui/HeroBackground';
import { AlbertMark } from '@/components/albert/AlbertMark';
import { Wordmark } from '@/components/ui/Wordmark';
import { NewUserBadge, NewUserTracks, useFirstName } from '@/components/home/NewUserParts';
import { BUILD_ROUTE } from '@/lib/routes';
import { TRACK_STATEMENT_MAX } from '@learning/shared';
import { colors, font, levelCard, radius } from '@/theme';

const PLACEHOLDER = 'Your role, where you work, and what you want to get better at…';

/** Starting points for people who do not know what to type: one for each kind of person who shows up. */
const STARTERS = [
  'Designer moving into product',
  'New PM at a bank',
  'Engineer who wants to build',
  'Head of Product, going AI-native',
];

/** What the first path might look like for the first starter. An illustration, not the person's own path. */
const SAMPLE_PATH: { title: string; level: 'beginner' | 'intermediate' }[] = [
  { title: 'Why discovery matters before building', level: 'beginner' },
  { title: 'Writing a compelling product vision', level: 'beginner' },
  { title: 'Making the case to leadership', level: 'intermediate' },
  { title: 'Prototyping product ideas with AI', level: 'intermediate' },
];

const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate' } as const;

/**
 * Home for someone with no path yet, "Albert first" (board 22, 1b): the box to tell Albert about
 * yourself is the first thing on the page, with starter chips; then what a path looks like, a few
 * ready-made tracks, and the first badge. The statement goes to the builder, which has not yet sent it.
 */
export function NewUserAlbertFirst() {
  const router = useRouter();
  const firstName = useFirstName();
  const [statement, setStatement] = useState('');

  return (
    <View testID="new-user-home">
      <View testID="new-user-albert" style={styles.hero}>
        <HeroBackground level="intermediate" />
        <Wordmark height={34} />

        <View style={styles.greeting}>
          <AlbertMark size={40} variant="onBrand" />
          <View style={styles.greetingText}>
            <Text testID="new-user-welcome" style={styles.greetingTitle}>{firstName ? `Welcome to Ascent, ${firstName}` : 'Welcome to Ascent'}</Text>
            <Text style={styles.greetingLine}>I'm Albert, your guide. Tell me about you.</Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.headline}>Tell me where you are. I'll map the way up.</Text>

        <View style={styles.inputCard}>
          <TextInput
            testID="new-user-statement"
            style={styles.input}
            value={statement}
            onChangeText={setStatement}
            maxLength={TRACK_STATEMENT_MAX}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.textSubtle}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.buildRow}>
            <View style={styles.build}>
              <EdgeButton
                testID="new-user-build-btn"
                look={{ face: colors.brand, label: colors.onBrand, edge: levelCard.intermediate.edge }}
                label="Build my path"
                icon="next"
                faceHeight={44}
                onPress={() => router.push({ pathname: BUILD_ROUTE, params: statement.trim() ? { statement } : {} })}
              />
            </View>
          </View>
        </View>

        <View style={styles.starters}>
          <Text style={styles.startersLabel}>OR START FROM</Text>
          <View style={styles.chips}>
            {STARTERS.map(starter => (
              <Pressable key={starter} testID={`new-user-starter-${starter}`} onPress={() => setStatement(starter)} accessibilityRole="button" style={styles.chip}>
                <Text style={styles.chipLabel}>{starter}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.free}>Your first path is free.</Text>
      </View>

      <View style={styles.page}>
        <View testID="new-user-sample" style={styles.block}>
          <Text style={styles.heading}>Not a course. Your course.</Text>
          <Text style={styles.body}>
            Albert picks from Ascent's 400+ topics and orders them for you. For "designer moving into product", the start might look like this:
          </Text>
          <View>
            {SAMPLE_PATH.map(step => (
              <View key={step.title} style={styles.sampleRow}>
                <View style={[styles.square, { backgroundColor: levelCard[step.level].base }]} />
                <Text style={styles.sampleTitle}>{step.title}</Text>
                <Text style={styles.sampleLevel}>{LEVEL_LABEL[step.level]}</Text>
              </View>
            ))}
          </View>
        </View>

        <NewUserTracks heading="Prefer a set route?" />

        <NewUserBadge />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The colour block runs edge to edge with a straight foot (the board has no curve), with the page's own padding inside it.
  hero: {
    paddingTop:              22,
    paddingHorizontal:       24,
    paddingBottom:           30,
    gap:                     18,
    backgroundColor:         levelCard.intermediate.base,
    overflow:                'hidden',
  },
  greeting:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greetingText: { flex: 1, gap: 1 },
  greetingTitle: { fontFamily: font.extrabold, fontSize: 15, color: colors.white },
  greetingLine:  { fontFamily: font.semibold, fontSize: 13, color: colors.brandSoft },
  headline: { fontFamily: font.black, fontSize: 38, lineHeight: 38, letterSpacing: -0.045 * 38, color: colors.white },
  inputCard: {
    backgroundColor: colors.white,
    borderRadius:    20,
    paddingTop:      16,
    paddingHorizontal: 16,
    paddingBottom:   14,
    gap:             14,
  },
  input:    { minHeight: 70, fontFamily: font.regular, fontSize: 16, lineHeight: 16 * 1.45, color: colors.textStrong, padding: 0 },
  buildRow: { alignItems: 'flex-end' },
  build:    { minWidth: 150 },
  starters:      { gap: 8 },
  startersLabel: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12, color: colors.brandSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical:   10,
    paddingHorizontal: 14,
    borderRadius:      radius.pill,
    backgroundColor:   'rgba(255,255,255,0.14)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.22)',
  },
  chipLabel: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  free:      { fontFamily: font.semibold, fontSize: 13, color: colors.brandSoft },

  page:  { paddingTop: 30, paddingHorizontal: 24, gap: 34 },
  block: { gap: 12 },
  heading: { fontFamily: font.black, fontSize: 24, letterSpacing: -0.03 * 24, color: colors.textStrong },
  body:    { fontFamily: font.regular, fontSize: 15, lineHeight: 15 * 1.5, color: colors.textBody },
  sampleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  square:      { width: 10, height: 10, borderRadius: 3 },
  sampleTitle: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.textStrong },
  sampleLevel: { fontFamily: font.bold, fontSize: 12, color: colors.textMuted },
});
