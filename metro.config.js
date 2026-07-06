const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

const config = getSentryExpoConfig(__dirname);

config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, "../learning/packages/shared"),
  path.resolve(__dirname, "../learning/node_modules"),
];

module.exports = config;