import { registerRootComponent } from "expo";
import { Platform } from "react-native";

import App from "./App";
import { registerWebUpdates } from "./src/web";
import { registerWidgetTaskHandler } from "react-native-android-widget";
import { widgetTaskHandler } from "./src/widget";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
if (Platform.OS === "web") registerWebUpdates();
if (Platform.OS === "android") registerWidgetTaskHandler(widgetTaskHandler);
