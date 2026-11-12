import { useRef, type ComponentRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Logo } from '@/components/ui/Logo';
import { Wordmark } from '@/components/ui/Wordmark';
import { HeroBackground } from '@/components/ui/HeroBackground';
import { colors, font, levelCard, radius } from '@/theme';

/**
 * The colour page the sign-in and create-account screens share: the cobalt wash with its contours,
 * the mark, the wordmark and the tagline, a white card for the form, and the switch-screen line under it.
 */
export function AuthFrame({ title, intro, footerLead, footerAction, onFooter, scrollToEnd = false, children }: {
  title: string;
  intro: string;
  footerLead: string;
  footerAction: string;
  onFooter: () => void;
  /** While true the page keeps scrolled to the foot (the form has grown and its last field and button must stay in view). */
  scrollToEnd?: boolean;
  children: ReactNode;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  return (
    <SafeAreaView style={styles.safe}>
      <HeroBackground level="intermediate" testID="auth-background" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => { if (scrollToEnd) scroll.current?.scrollToEnd({ animated: true }); }}
        >
          <View style={styles.brand}>
            <Logo size={62} />
            <Wordmark height={35} />
            <Text style={styles.tagline}>A little every day</Text>
          </View>

          <View testID="auth-card" style={styles.card}>
            <View style={styles.head}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Text style={styles.intro}>{intro}</Text>
            </View>
            {children}
          </View>

          <Pressable onPress={onFooter} accessibilityRole="button" style={styles.footer}>
            <Text style={styles.footerText}>
              {`${footerLead} `}
              <Text style={styles.footerAction}>{footerAction}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: levelCard.intermediate.base },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  brand:  { alignItems: 'center', gap: 14 },
  tagline: { fontFamily: font.medium, fontSize: 16, color: colors.brandSoft },
  card: {
    marginTop:       28,
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    paddingTop:      24,
    paddingHorizontal: 22,
    paddingBottom:   24,
    gap:             16,
    shadowColor:     '#0A1E6E',
    shadowOffset:    { width: 0, height: 18 },
    shadowOpacity:   0.3,
    shadowRadius:    40,
    elevation:       12,
  },
  head:  { gap: 6 },
  title: { fontFamily: font.black, fontSize: 28, lineHeight: 28 * 1.05, letterSpacing: -0.035 * 28, color: colors.textStrong },
  intro: { fontFamily: font.regular, fontSize: 15, lineHeight: 15 * 1.45, color: colors.textBody },
  footer: { paddingTop: 20, alignItems: 'center' },
  footerText:   { fontFamily: font.medium, fontSize: 15, color: colors.brandSoft, textAlign: 'center' },
  footerAction: { fontFamily: font.extrabold, color: colors.white },
});
