export const setNotificationHandler = jest.fn();
export const getPermissionsAsync = jest.fn(() => Promise.resolve({ status: 'granted' }));
export const requestPermissionsAsync = jest.fn(() => Promise.resolve({ status: 'granted' }));
export const getExpoPushTokenAsync = jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[mock]' }));
export const setNotificationChannelAsync = jest.fn(() => Promise.resolve());
export const addNotificationResponseReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
export const addNotificationReceivedListener = jest.fn(() => ({ remove: jest.fn() }));
export const AndroidImportance = { MAX: 5, DEFAULT: 3, LOW: 2, MIN: 1, NONE: 0 };
