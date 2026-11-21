import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * The store page for this device, from the app config (`ios.appStoreUrl`, `android.playStoreUrl`), or
 * null when the config has none. The update screen's button does nothing without one.
 */
export function storeUrlOf(): string | null {
  const config = Constants.expoConfig;
  const url = Platform.OS === 'ios' ? config?.ios?.appStoreUrl : config?.android?.playStoreUrl;
  return url ?? null;
}
