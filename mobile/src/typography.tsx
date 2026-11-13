import { StyleSheet, Text as NativeText, type TextProps } from "react-native";

export const fontNames = { light: "RobotoLight", regular: "Roboto", medium: "RobotoMedium", semibold: "RobotoBold", bold: "RobotoBold", heading: "RobotoBold" };
export const fontAssets = {
  RobotoLight: require("../assets/fonts/Roboto-Light.ttf"),
  Roboto: require("../assets/fonts/Roboto-Regular.ttf"),
  RobotoMedium: require("../assets/fonts/Roboto-Medium.ttf"),
  RobotoBold: require("../assets/fonts/Roboto-Bold.ttf"),
};

/** @param {TextProps} props - Текст, оформление и доступность. @returns {React.JSX.Element} Общая типографика с настоящими начертаниями и системным масштабом текста. */
export function Text({ style, ...props }: TextProps): React.JSX.Element {
  const flat = StyleSheet.flatten(style);
  const weight = flat?.fontWeight === "bold" ? 700 : Number(flat?.fontWeight) || 400;
  const family = flat?.fontFamily && flat.fontFamily !== fontNames.regular
    ? flat.fontFamily
    : weight >= 700 ? fontNames.bold : weight >= 600 ? fontNames.semibold : weight >= 500 ? fontNames.medium : weight <= 300 ? fontNames.light : fontNames.regular;
  const bundled = Object.values(fontNames).includes(family);
  return <NativeText {...props} style={[style, { fontFamily: family }, bundled && { fontWeight: "normal" }]} />;
}
