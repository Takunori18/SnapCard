const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  fs: require.resolve('./src/shims/fsStub.js'),
  path: require.resolve('./src/shims/pathStub.js'),
};

// Skia用の設定追加
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];

// Windowsでnode:seaエラーを回避
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('node:')) {
    return {
      type: 'empty',
    };
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;