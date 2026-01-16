module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // NOTE: react-native-reanimated@3.16.7 works with Expo Go without babel plugin
    // plugins: [
    //   'react-native-reanimated/plugin',
    // ],
  };
};
