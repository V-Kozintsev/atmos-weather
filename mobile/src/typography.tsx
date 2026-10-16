import { StyleSheet, Text as NativeText, type TextProps } from "react-native";

export const fontNames = { regular: "Manrope", medium: "ManropeMedium", semibold: "ManropeSemiBold", bold: "ManropeBold", heading: "Lora" };
export const fontAssets = {
  Manrope: require("../assets/fonts/Manrope-Regular.ttf"),
  ManropeMedium: require("../assets/fonts/Manrope-Medium.ttf"),
  ManropeSemiBold: require("../assets/fonts/Manrope-SemiBold.ttf"),
  ManropeBold: require("../assets/fonts/Manrope-Bold.ttf"),
  Lora: require("../assets/fonts/Lora-SemiBold.ttf"),
};

/** @param {TextProps} props - Текст, оформление и доступность. @returns {React.JSX.Element} Общая типографика с настоящими начертаниями и системным масштабом текста. */
export function Text({ style, ...props }: TextProps): React.JSX.Element {
  const flat = StyleSheet.flatten(style);
  const weight = flat?.fontWeight === "bold" ? 700 : Number(flat?.fontWeight) || 400;
  const family = flat?.fontFamily && flat.fontFamily !== fontNames.regular
    ? flat.fontFamily
    : weight >= 700 ? fontNames.bold : weight >= 600 ? fontNames.semibold : weight >= 500 ? fontNames.medium : fontNames.regular;
  const bundled = Object.values(fontNames).includes(family);
  return <NativeText {...props} style={[style, { fontFamily: family }, bundled && { fontWeight: "normal" }]} />;
}
