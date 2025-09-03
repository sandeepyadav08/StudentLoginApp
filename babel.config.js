module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          reanimated: false, // Disable auto-inclusion of react-native-reanimated/plugin
        },
      ],
    ],
    plugins: [
      'react-native-worklets/plugin', // Use the new worklets plugin
    ],
  };
};
  