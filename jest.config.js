/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@learning/shared$': '<rootDir>/../learning/packages/shared/src/index.ts',
    '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.ts',
    '^expo-device$': '<rootDir>/__mocks__/expo-device.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@tanstack|zustand))',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
};
