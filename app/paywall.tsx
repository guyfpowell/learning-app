import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OFFERINGS_LOAD_ERROR } from '@learning/shared';
import { Text } from '@/components/ui/Text';
import { Spinner } from '@/components/ui/Spinner';
import { PlanPicker } from '@/components/paywall/PlanPicker';
import { PaywallFooter } from '@/components/paywall/PaywallFooter';
import { paywallStyles } from '@/components/paywall/paywallStyles';
import { colors, font, fontSize, radius, spacing, shadow } from '@/theme';
import { useOfferings, usePurchase } from '@/hooks/useIAP';
import { DEFAULT_PLAN, type PlanKey } from '@/lib/paywallPlans';
import { writeError } from '@/lib/errors';

// Payment errors show fixed copy, never the server's words; a signal drop says it was the signal (ADR-021).
const PURCHASE_FAILED_COPY = 'Something went wrong. Please try again.';

const FEATURES = [
  'Unlimited lessons across all tracks',
  'AI-generated lessons tailored to you',
  'Personalised Albert learning paths',
];

/** The plans while the offering loads, when it failed, and once it is here. */
function PlanSection({ selected, onSelect }: { selected: PlanKey; onSelect: (key: PlanKey) => void }) {
  const { data: offering, isLoading, isError } = useOfferings();
  if (isLoading) {
    return (
      <View testID="paywall-loading" style={styles.loadingContainer}>
        <Spinner />
      </View>
    );
  }
  if (isError) return <Text testID="offerings-load-error" style={paywallStyles.errorText}>{OFFERINGS_LOAD_ERROR}</Text>;
  return <PlanPicker offering={offering} selected={selected} onSelect={onSelect} />;
}

export default function PaywallScreen() {
  const router = useRouter();
  const { data: offering } = useOfferings();
  const purchase = usePurchase();
  const [selected, setSelected] = useState<PlanKey>(DEFAULT_PLAN);
  const selectedPkg = offering?.[selected] ?? null;

  function handleSubscribe() {
    if (!selectedPkg || purchase.isPending) return;
    purchase.mutate(selectedPkg, { onSuccess: () => router.back() });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <Pressable testID="paywall-close" style={styles.closeBtn} onPress={() => router.back()} accessibilityLabel="Close">
        <Ionicons name="close" size={24} color={colors.textBody} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text testID="paywall-title" style={styles.title}>Go Premium</Text>
          <Text style={styles.subtitle}>Unlock unlimited access to every lesson, track, and AI feature.</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <PlanSection selected={selected} onSelect={setSelected} />

        <Pressable
          testID="subscribe-btn"
          style={[styles.subscribeBtn, purchase.isPending && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={purchase.isPending}
          accessibilityState={{ disabled: purchase.isPending }}
        >
          <Text style={styles.subscribeBtnText}>{purchase.isPending ? 'Processing…' : 'Subscribe'}</Text>
        </Pressable>

        {purchase.isError && <Text style={paywallStyles.errorText}>{writeError(purchase.error, PURCHASE_FAILED_COPY)}</Text>}

        <PaywallFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.paper,
  },
  closeBtn: {
    position:     'absolute',
    top:          spacing.md,
    right:        spacing.md,
    zIndex:       10,
    padding:      spacing.xs,
    borderRadius: radius.pill,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.xxl,
    paddingBottom:     spacing.xl,
    gap:               spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap:        spacing.sm,
  },
  title: {
    fontFamily: font.bold,
    fontSize:   fontSize.xl,
    color:      colors.textStrong,
    textAlign:  'center',
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textMuted,
    textAlign:  'center',
    lineHeight: fontSize.base * 1.5,
  },
  features: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  featureText: {
    fontFamily: font.regular,
    fontSize:   fontSize.base,
    color:      colors.textBody,
    flex:       1,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems:      'center',
  },
  subscribeBtn: {
    backgroundColor: colors.brand,
    borderRadius:    radius.pill,
    paddingVertical: spacing.md,
    alignItems:      'center',
    ...shadow.md,
  },
  subscribeBtnDisabled: {
    backgroundColor: colors.borderSubtle,
  },
  subscribeBtnText: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textOnBrand,
  },
});
