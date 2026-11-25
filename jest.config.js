/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@learning/shared$': '<rootDir>/../learning/packages/shared/src/index.ts',
    '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.ts',
    '^expo-device$': '<rootDir>/__mocks__/expo-device.ts',
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.tsx',
    '^react-native-reanimated$': '<rootDir>/__mocks__/react-native-reanimated.tsx',
    '^react-native-purchases$': '<rootDir>/__mocks__/react-native-purchases.ts',
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^@react-native-community/netinfo$': '@react-native-community/netinfo/jest/netinfo-mock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|@tanstack|zustand|standard-navigation))',
  ],
  // `/archived/` holds retired code kept for reading only — 068 Chunk 6.
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/archived/'],
};
