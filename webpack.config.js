const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons'],
      },
    },
    argv
  );

  // Webpack 5 用の Node.js ポリフィル
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    path: false,
    fs: false,
  };

  config.resolve.alias = {
    ...config.resolve.alias,
    'expo-modules-core$': path.resolve(__dirname, 'src/web-shims/expo-modules-core-shim.js'),
  };

  return config;
};
