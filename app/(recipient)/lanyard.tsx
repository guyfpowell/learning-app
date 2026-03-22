import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Brightness from 'expo-brightness';
import QRCode from 'react-native-qrcode-svg';
import { useRecipientSelfProfile } from '@/hooks/useRecipientSelf';
import { colors, font, fontSize, spacing } from '@/theme';

function formatShortCode(code: string): string {
  const clean = code.replace(/-/g, '');
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
}

export default function LanyardScreen() {
  const { data: profile, isLoading } = useRecipientSelfProfile();
  const { width } = useWindowDimensions();
  const qrSize = Math.min(width - spacing.lg * 4, 280);

  // Boost brightness when this screen is shown
  useEffect(() => {
    let originalBrightness: number | null = null;

    async function boostBrightness() {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Brightness.requestPermissionsAsync();
          if (status === 'granted') {
            originalBrightness = await Brightness.getBrightnessAsync();
            await Brightness.setBrightnessAsync(1.0);
          }
        }
      } catch {
        // Brightness control is optional — silent fail
      }
    }

    boostBrightness();

    return () => {
      if (originalBrightness !== null) {
        Brightness.setBrightnessAsync(originalBrightness).catch(() => {});
      }
    };
  }, []);

  const displayName = profile
    ? profile.nickname ?? `${profile.firstName} ${profile.lastName}`
    : '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.heading}>MY CARD</Text>
        <Text style={styles.sub}>Show this to a donor to receive a donation</Text>

        {isLoading || !profile ? (
          <ActivityIndicator color={colors.teal} size="large" style={styles.loader} />
        ) : (
          <>
            <View style={styles.qrContainer}>
              <QRCode
                value={profile.qrToken}
                size={qrSize}
                color={colors.teal}
                backgroundColor={colors.white}
              />
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{displayName}</Text>
            </View>

            <View style={styles.codeRow}>
              <Text style={styles.codeLabel}>Short code</Text>
              <Text style={styles.code}>{formatShortCode(profile.shortCode)}</Text>
            </View>

            <Text style={styles.hint}>
              Tip: increase your screen brightness so the QR code scans easily
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  sub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing.xl,
  },
  qrContainer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  nameRow: {
    alignItems: 'center',
  },
  displayName: {
    fontFamily: font.bold,
    fontSize: fontSize.xl,
    color: colors.teal,
  },
  codeRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  codeLabel: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: font.bold,
    fontSize: 32,
    color: colors.teal,
    letterSpacing: 4,
  },
  hint: {
    fontFamily: font.regular,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
