import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { HeroBackground } from '@/components/ui/HeroBackground';
import { Wordmark } from '@/components/ui/Wordmark';
import { NewUserBadge, NewUserHeading, NewUserTracks, useFirstName } from '@/components/home/NewUserParts';
import { BUILD_ROUTE } from '@/lib/routes';
import { colors, font, levelCard } from '@/theme';

/** Four reasons it sticks, numbered. */
const REASONS = [
  { title: 'Small enough to start', body: 'Each lesson takes about three minutes. Stack as many as your day allows.' },
  { title: 'Skips what you know', body: 'Get it right first time and Albert moves you on. Your time goes on the gaps.' },
  { title: 'Built on real UK product work', body: 'Banks, the NHS, government, retail. Not just Silicon Valley.' },
  { title: 'Ready for AI', body: 'From using AI well to building products with it.' },
];

/**
 * New-user Home, "the pitch" (board 22, 1a): a big promise on cobalt with one button, then tracks and
 * four reasons on paper. Speaks to busy people who want real topics that fit round their day.
 */
export function NewUserPitch() {
  const router = useRouter();
  const firstName = useFirstName();

  return (
    <View testID="new-user-home">
      <View testID="new-user-pitch" style={styles.hero}>
        <HeroBackground level="intermediate" />
        <Wordmark height={34} />
        <Text testID="new-user-welcome" style={styles.eyebrow}>{firstName ? `WELCOME TO ASCENT, ${firstName.toUpperCase()}` : 'WELCOME TO ASCENT'}</Text>
        <Text accessibilityRole="header" style={styles.headline}>Get good at product. In the gaps of your day.</Text>
        <Text style={styles.lead}>
          Short, sharp lessons on the real work: strategy, discovery, pricing, AI. One on the bus, ten at lunch. Ascent builds the path around you.
        </Text>
        <View style={styles.action}>
          <EdgeButton
            testID="new-user-build-btn"
            look={{ face: colors.white, label: colors.brand, edge: levelCard.intermediate.edge }}
            label="Build my free path"
            icon="next"
            onPress={() => router.push(BUILD_ROUTE)}
          />
          <Text style={styles.caption}>Takes a minute. Tell Albert, your Ascent guide, your role and where you're heading.</Text>
        </View>
      </View>

      <View style={styles.page}>
        <NewUserTracks heading="Or start a track now" />

        <View testID="new-user-reasons">
          <View style={styles.reasonsHead}>
            <NewUserHeading>Why it sticks</NewUserHeading>
          </View>
          {REASONS.map((reason, i) => (
            <View key={reason.title} style={styles.reason}>
              <Text style={styles.reasonNumber}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={styles.reasonText}>
                <Text style={styles.reasonTitle}>{reason.title}</Text>
                <Text style={styles.reasonBody}>{reason.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <NewUserBadge />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop:        28,
    paddingHorizontal: 24,
    paddingBottom:     28,
    gap:               16,
    backgroundColor:   levelCard.intermediate.base,
    overflow:          'hidden',
  },
  eyebrow:  { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 0.1 * 12, color: colors.brandSoft },
  headline: { fontFamily: font.black, fontSize: 42, lineHeight: 42 * 0.98, letterSpacing: -0.045 * 42, color: colors.white },
  lead:     { fontFamily: font.regular, fontSize: 17, lineHeight: 17 * 1.5, color: colors.brandSoft },
  action:   { gap: 12, marginTop: 10 },
  caption:  { fontFamily: font.semibold, fontSize: 14, lineHeight: 14 * 1.4, color: colors.brandSoft, textAlign: 'center' },

  page: { paddingTop: 30, paddingHorizontal: 24, gap: 34 },
  reasonsHead: { paddingBottom: 12 },
  reason: {
    flexDirection:  'row',
    gap:            10,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reasonNumber: { width: 44, fontFamily: font.black, fontSize: 28, lineHeight: 28, letterSpacing: -0.04 * 28, color: colors.brand },
  reasonText:   { flex: 1, gap: 4 },
  reasonTitle:  { fontFamily: font.extrabold, fontSize: 18, letterSpacing: -0.015 * 18, color: colors.textStrong },
  reasonBody:   { fontFamily: font.regular, fontSize: 15, lineHeight: 15 * 1.45, color: colors.textBody },
});
