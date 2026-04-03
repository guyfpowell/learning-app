import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { colors, font, fontSize, spacing } from '@/theme';

interface QRScannerProps {
  /** Called once when a QR code is successfully read. Won't fire again until reset(). */
  onScan: (value: string) => void;
  /** Set to true while the parent is processing the scanned value. Shows overlay spinner. */
  isProcessing?: boolean;
  /** Set to true to allow scanning again after a previous scan. */
  active?: boolean;
}

/** Corner marker for the viewfinder frame */
function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

export function QRScanner({ onScan, isProcessing = false, active = true }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  // Reset the debounce lock when `active` flips back to true
  useEffect(() => {
    if (active) scannedRef.current = false;
  }, [active]);

  if (!permission) {
    return (
      <View style={styles.centred}>
        <Spinner />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centred}>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSub}>
          PocketChange needs your camera to scan recipient QR codes.
        </Text>
        <Button label="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  function handleBarcode({ data }: { data: string }) {
    if (scannedRef.current || !active) return;
    scannedRef.current = true;
    onScan(data);
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={handleBarcode}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Dark vignette overlay with cut-out hint */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Viewfinder frame */}
        <View style={styles.frame}>
          <Corner style={styles.cornerTL} />
          <Corner style={styles.cornerTR} />
          <Corner style={styles.cornerBL} />
          <Corner style={styles.cornerBR} />
        </View>
      </View>

      {/* Processing spinner */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <Spinner size="large" color={colors.teal} />
            <Text style={styles.processingText}>Looking up recipient…</Text>
          </View>
        </View>
      )}

      {/* Instruction label */}
      {!isProcessing && (
        <View style={styles.labelContainer} pointerEvents="none">
          <Text style={styles.label}>
            Point camera at a recipient QR code
          </Text>
        </View>
      )}
    </View>
  );
}

const FRAME_SIZE = 220;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: 12,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  permTitle: {
    fontFamily: font.bold,
    fontSize: fontSize.md,
    color: colors.teal,
    textAlign: 'center',
  },
  permSub: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
    // Clear the dark tint inside the frame
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.blue,
    borderWidth: CORNER_THICKNESS,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  labelContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  label: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    overflow: 'hidden',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 180,
  },
  processingText: {
    fontFamily: font.medium,
    fontSize: fontSize.sm,
    color: colors.teal,
  },
});
