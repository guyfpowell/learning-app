export const isDevice = true;
export const modelName = 'Jest Test Device';
export const osName = 'iOS';
export const osVersion = '17.0';

/** The same values as `expo-device`'s enum. */
export const DeviceType = { UNKNOWN: 0, PHONE: 1, TABLET: 2, DESKTOP: 3, TV: 4 } as const;

export let deviceType: number | null = DeviceType.PHONE;

/** A test sets what kind of device it runs on before it loads the module under test. */
export function __setDeviceType(type: number | null): void {
  deviceType = type;
}
