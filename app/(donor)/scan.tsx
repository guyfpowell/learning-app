import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QRScanner } from '@/components/scan/QRScanner';
import { ShortCodeInput } from '@/components/scan/ShortCodeInput';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { recipientService } from '@/services/recipient.service';
import { colors, font, fontSize, radius, spacing, tracking } from '@/theme';

type Tab = 'qr' | 'code';
type ScanState = 'idle' | 'identifying' | 'error';

function extractError(err: unknown): string {
  const typed = err as { response?: { data?: { error?: string }; status?: number } };
  if (typed?.response?.status === 404) return 'Recipient not found. Check the code and try again.';
  return typed?.response?.data?.error ?? 'Something went wrong. Please try again.';
}

export default function ScanScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('qr');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset scanner when the user returns to this tab
  useFocusEffect(
    useCallback(() => {
      setScanState('idle');
      setErrorMsg('');
    }, [])
  );

  async function handleToken(token: string) {
    setScanState('identifying');
    setErrorMsg('');
    try {
      const recipient = await recipientService.lookupByToken(token);
      router.push({ pathname: '/recipient/[id]', params: { id: recipient.id, token } });
    } catch (err) {
      setErrorMsg(extractError(err));
      setScanState('error');
    }
  }

  async function handleShortCode(code: string) {
    setScanState('identifying');
    setErrorMsg('');
    try {
      const recipient = await recipientService.lookupByShortCode(code);
      router.push({ pathname: '/recipient/[id]', params: { id: recipient.id } });
    } catch (err) {
      setErrorMsg(extractError(err));
      setScanState('error');
    }
  }

  function retry() {
    setScanState('idle');
    setErrorMsg('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.heading}>SCAN TO DONATE</Text>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'qr' && styles.tabActive]}
            onPress={() => { setTab('qr'); retry(); }}
          >
            <Text style={[styles.tabText, tab === 'qr' && styles.tabTextActive]}>
              Scan QR
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'code' && styles.tabActive]}
            onPress={() => { setTab('code'); retry(); }}
          >
            <Text style={[styles.tabText, tab === 'code' && styles.tabTextActive]}>
              Enter Code
            </Text>
          </Pressable>
        </View>

        {/* Error banner (shown above both tabs when applicable) */}
        {scanState === 'error' && (
          <Card style={styles.errorCard} padding={spacing.md}>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Button label="Try Again" onPress={retry} style={styles.retryBtn} />
          </Card>
        )}

        {/* QR tab */}
        {tab === 'qr' && scanState !== 'error' && (
          <View style={styles.cameraContainer}>
            <QRScanner
              onScan={handleToken}
              isProcessing={scanState === 'identifying'}
              active={scanState === 'idle'}
            />
          </View>
        )}

        {/* Short code tab */}
        {tab === 'code' && scanState !== 'error' && (
          <ScrollView
            contentContainerStyle={styles.codeScroll}
            keyboardShouldPersistTaps="handled"
          >
            <Card style={styles.codeCard}>
              <ShortCodeInput
                onSubmit={handleShortCode}
                isLoading={scanState === 'identifying'}
                error={null}
              />
            </Card>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: fontSize.lg,
    color: colors.teal,
    letterSpacing: tracking.heading,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.btn,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.btn - 2,
  },
  tabActive: {
    backgroundColor: colors.teal,
  },
  tabText: {
    fontFamily: font.bold,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.white,
  },
  cameraContainer: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  codeScroll: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  codeCard: {
    gap: spacing.md,
  },
  errorCard: {
    backgroundColor: colors.errorBg,
    borderRadius: 12,
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
});
