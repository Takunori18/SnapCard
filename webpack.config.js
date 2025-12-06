const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          '@expo/vector-icons',
          '@shopify/react-native-skia'
        ],
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

  if (env.platform === 'web') {
    config.resolve.alias['@shopify/react-native-skia'] =
      require.resolve('@shopify/react-native-skia/lib/module/web');
  }

  // WebAssemblyサポートを追加
  config.experiments = {
    ...config.experiments,
    asyncWebAssembly: true,
    syncWebAssembly: true,
    layers: true,
  };

  // WASMファイルの読み込み設定
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  return config;
};
