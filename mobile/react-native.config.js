module.exports = {
  dependencies: process.env.EXPO_PUBLIC_APP_STORE === "google-play"
    ? { "react-native-rustore-update": { platforms: { android: null } } }
    : {},
};
