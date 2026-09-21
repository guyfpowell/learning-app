import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, fontSize, radius, spacing, shadow } from '@/theme';
import { Spinner } from '@/components/ui/Spinner';
import { useOfferings, usePurchase, useRestorePurchases } from '@/hooks/useIAP';
import type { PurchasesPackage } from '@/hooks/useIAP';

// ── Legal URLs ────────────────────────────────────────────────────────────────
// TODO: replace with final hosted URLs before App Review submission
const TERMS_URL   = 'https://ascentlearning.app/terms';
const PRIVACY_URL = 'https://ascentlearning.app/privacy';

// ── Plan card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  label:     string;
  period:    string;
  price:     string;
  badge?:    string;
  selected:  boolean;
  testID:    string;
  onSelect:  () => void;
}

function PlanCard({
  label,
  period,
  price,
  badge,
  selected,
  testID,
  onSelect,
}: PlanCardProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onSelect}
      style={[styles.planCard, selected && styles.planCardSelected]}
    >
      <View style={styles.planCardLeft}>
        {selected
          ? <View testID={`${testID.replace('-card', '-selected')}`} style={styles.radioFilled} />
          : <View style={styles.radioEmpty} />
        }
        <View>
          <Text style={styles.planLabel}>{label}</Text>
          <Text style={styles.planPeriod}>{period}</Text>
        </View>
      </View>
      <View style={styles.planCardRight}>
        {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
        <Text testID={`${testID.replace('-card', '-price')}`} style={styles.planPrice}>
          {price}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router = useRouter();
  const { data: offering, isLoading } = useOfferings();
  const purchase = usePurchase();
  const restore  = useRestorePurchases();

  // Annual selected by default — best value for the user and for us.
  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');

  const selectedPkg: PurchasesPackage | null =
    selected === 'annual' ? (offering?.annual ?? null) : (offering?.monthly ?? null);

  function handleSubscribe() {
    if (!selectedPkg || purchase.isPending) return;
    purchase.mutate(selectedPkg, {
      onSuccess: () => router.back(),
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Close */}
      <Pressable
        testID="paywall-close"
        style={styles.closeBtn}
        onPress={() => router.back()}
        accessibilityLabel="Close"
      >
        <Ionicons name="close" size={24} color={colors.textBody} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text testID="paywall-title" style={styles.title}>Go Premium</Text>
          <Text style={styles.subtitle}>
            Unlock unlimited access to every lesson, track, and AI feature.
          </Text>
        </View>

        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Plan cards */}
        {isLoading ? (
          <View testID="paywall-loading" style={styles.loadingContainer}>
            <Spinner />
          </View>
        ) : (
          <View style={styles.plans}>
            <PlanCard
              label="Annual"
              period="per year"
              price={offering?.annual?.product.priceString ?? '—'}
              badge="Best value"
              selected={selected === 'annual'}
              testID="plan-annual-card"
              onSelect={() => setSelected('annual')}
            />
            <PlanCard
              label="Monthly"
              period="per month"
              price={offering?.monthly?.product.priceString ?? '—'}
              selected={selected === 'monthly'}
              testID="plan-monthly-card"
              onSelect={() => setSelected('monthly')}
            />
          </View>
        )}

        {/* Subscribe */}
        <Pressable
          testID="subscribe-btn"
          style={[styles.subscribeBtn, purchase.isPending && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={purchase.isPending}
          accessibilityState={{ disabled: purchase.isPending }}
        >
          <Text style={styles.subscribeBtnText}>
            {purchase.isPending ? 'Processing…' : 'Subscribe'}
          </Text>
        </Pressable>

        {/* Error */}
        {purchase.isError && (
          <Text style={styles.errorText}>
            Something went wrong. Please try again.
          </Text>
        )}

        {/* Auto-renew disclosure — required by App Review */}
        <Text testID="auto-renew-disclosure" style={styles.disclosure}>
          Subscription automatically renews unless cancelled at least 24 hours
          before the end of the current period. Manage or cancel in iOS Settings.
        </Text>

        {/* Legal links — required by App Review */}
        <View style={styles.legalLinks}>
          <Text
            testID="terms-link"
            style={styles.legalLink}
            onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
          >
            Terms of Use
          </Text>
          <Text style={styles.legalSep}>·</Text>
          <Text
            testID="privacy-link"
            style={styles.legalLink}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          >
            Privacy Policy
          </Text>
        </View>

        {/* Restore Purchases — required by App Review */}
        <Pressable
          testID="restore-purchases-btn"
          onPress={() => restore.mutate()}
          disabled={restore.isPending}
          accessibilityState={{ disabled: restore.isPending }}
          style={styles.restoreBtn}
        >
          <Text style={styles.restoreText}>
            {restore.isPending ? 'Restoring…' : 'Restore Purchases'}
          </Text>
        </Pressable>

        {restore.isError && (
          <Text testID="restore-error" style={styles.errorText}>
            Couldn't restore purchases. Please try again.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FEATURES = [
  'Unlimited lessons across all tracks',
  'AI-generated lessons tailored to you',
  'Personalised Albert learning paths',
  'AI coaching and quiz feedback',
];

// ── Styles ────────────────────────────────────────────────────────────────────

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
  plans: {
    gap: spacing.sm,
  },
  planCard: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         spacing.md,
    borderRadius:    radius.card,
    borderWidth:     2,
    borderColor:     colors.borderSubtle,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  planCardSelected: {
    borderColor:     colors.brand,
    backgroundColor: colors.brandSoft,
  },
  planCardLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  planCardRight: {
    alignItems: 'flex-end',
    gap:        spacing.xs,
  },
  radioEmpty: {
    width:        20,
    height:       20,
    borderRadius: radius.pill,
    borderWidth:  2,
    borderColor:  colors.border,
  },
  radioFilled: {
    width:           20,
    height:          20,
    borderRadius:    radius.pill,
    backgroundColor: colors.brand,
  },
  planLabel: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  planPeriod: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  planPrice: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  badge: {
    backgroundColor: colors.brand,
    borderRadius:    radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
  },
  badgeText: {
    fontFamily: font.medium,
    fontSize:   fontSize.xs,
    color:      colors.textOnBrand,
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
  errorText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.error,
    textAlign:  'center',
  },
  disclosure: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textSubtle,
    textAlign:  'center',
    lineHeight: fontSize.xs * 1.6,
  },
  legalLinks: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            spacing.xs,
  },
  legalLink: {
    fontFamily:          font.regular,
    fontSize:            fontSize.xs,
    color:               colors.textLink,
    textDecorationLine:  'underline',
  },
  legalSep: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textSubtle,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  restoreText: {
    fontFamily: font.regular,
    fontSize:   fontSize.xs,
    color:      colors.textLink,
  },
});
