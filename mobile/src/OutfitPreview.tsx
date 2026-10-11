import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop } from "react-native-svg";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";

/** @param {object} props - Погодный комплект, вариант одежды и стиль. @returns {React.JSX.Element} Лёгкая композиция вещей без сети и генерации. */
export function OutfitPreview({ advice, gender, occasion }: { advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion }): React.JSX.Element {
  const layered = Boolean(advice.pieces.outer);
  const winter = ["cold", "frost"].includes(advice.style);
  const skirt = advice.pieces.lower.toLocaleLowerCase("ru").includes("юбка");
  const shorts = advice.pieces.lower.toLocaleLowerCase("ru").includes("шорты");
  const fitted = gender === "woman";
  const top = winter ? "#587179" : layered ? "#90a28d" : "#f4ead5";
  const trousers = occasion === "office" ? "#52636b" : occasion === "sport" ? "#697c80" : fitted ? "#9ba88d" : "#81918a";
  return (
    <Svg width="100%" height="100%" viewBox="0 0 190 184" accessibilityLabel={`${gender === "woman" ? "Женский" : "Мужской"} комплект: ${advice.items.join(", ")}`}>
      <Defs>
        <LinearGradient id="fabric" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#fff" /><Stop offset="0.35" stopColor={top} /><Stop offset="1" stopColor={winter ? "#314c55" : layered ? "#6c816b" : "#d5c8ad"} /></LinearGradient>
        <LinearGradient id="pants" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor={trousers} /><Stop offset="0.5" stopColor="#b1bba8" /><Stop offset="1" stopColor={trousers} /></LinearGradient>
        <LinearGradient id="shoe" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={winter ? "#7a7166" : "#fffdf4"} /><Stop offset="1" stopColor={winter ? "#3a413f" : "#d9d8cc"} /></LinearGradient>
      </Defs>
      <Circle cx="100" cy="88" r="77" fill="#d8e3cd" />
      <Ellipse cx="104" cy="159" rx="69" ry="9" fill="#344d3c" opacity="0.09" />
      <G transform="rotate(13 132 98)">
        <Path d={skirt ? "M115 47H150L171 133Q133 150 95 133Z" : shorts ? "M111 47L155 47L163 108L140 111L132 78L130 110L108 111Z" : "M111 47L155 47L163 144L141 147L132 78L130 147L108 146Z"} fill="url(#pants)" stroke="#73856f" strokeWidth="0.8" />
        <Path d={skirt ? "M116 53H149M123 55L113 135M135 55V140M145 55L157 135" : "M113 53H154M133 53V77M116 56Q118 67 110 71M149 56Q147 68 158 70"} fill="none" stroke="#586d59" opacity="0.5" />
        {!skirt && <Path d={shorts ? "M118 76L120 103M147 78L153 103" : "M118 76L119 138M147 78L153 138"} stroke="#e2e5d7" opacity="0.45" />}
        <Circle cx="135" cy="52" r="1.7" fill="#53684f" />
      </G>
      <G transform="rotate(-10 70 68)">
        <Path d={layered ? "M52 23L37 29L18 64L35 75L44 53L42 113Q70 120 98 113L97 53L108 75L124 63L106 29L90 23Q71 36 52 23Z" : `M52 23L36 29L22 49L40 62L48 47L${fitted ? "51" : "46"} 76L44 109Q70 116 96 109L${fitted ? "90" : "97"} 76L93 47L101 62L119 49L105 29L90 23Q71 36 52 23Z`} fill="url(#fabric)" stroke={layered ? "#70856e" : "#d2c6ae"} strokeWidth="0.8" />
        <Path d="M52 23Q70 43 90 23M54 25Q71 40 88 25" fill="none" stroke={layered ? "#566e56" : "#c1b59e"} strokeWidth="1.3" />
        <Path d="M47 48Q56 65 51 94M94 48Q87 66 91 95M48 105Q71 111 92 105" fill="none" stroke={layered ? "#e1e8d8" : "#fffdf5"} strokeWidth="2" opacity="0.65" />
        {layered && <G><Path d="M70 35V114M51 70H63V82H51M79 70H91V82H79" fill="none" stroke="#576e5b" opacity="0.6" />{fitted && <Path d="M44 81Q70 88 98 81M66 83L77 89L83 98" stroke="#506c5a" fill="none" strokeWidth="2" />}{winter && <Path d="M45 56H97M44 69H98M44 84H98M44 98H98" stroke="#354f55" opacity="0.3" />}</G>}
        {occasion === "office" && <Path d="M52 23L63 44L71 33L80 44L90 23" fill="none" stroke="#a8b2a0" />}
      </G>
      <G transform="rotate(-19 90 146)">
        <Path d="M45 132Q57 123 70 131L89 145Q97 151 91 158L47 158Q34 157 36 149Z" fill="url(#shoe)" stroke="#babdaf" />
        <Path d="M36 151Q59 159 94 151L92 159H43Q35 158 36 151Z" fill="#f9f7ec" stroke="#cacabc" />
        <Path d="M70 137L56 143M75 141L61 147M80 145L67 151" stroke={winter ? "#b3ab92" : "#aaa99a"} strokeWidth="1.8" />
        <Path d="M85 113Q97 105 109 113L127 128Q137 133 130 140L88 140Q75 139 76 132Z" fill="url(#shoe)" stroke="#babdaf" />
        <Path d="M76 133Q100 142 132 134L130 142H84Q76 140 76 133Z" fill="#f9f7ec" stroke="#cacabc" />
        <Path d="M108 120L95 125M113 124L101 129M118 128L107 133" stroke={winter ? "#b3ab92" : "#aaa99a"} strokeWidth="1.8" />
      </G>
      {advice.rain && !winter && <G transform="rotate(12 160 33)"><Path d="M142 34Q159 6 178 34Q169 27 163 34Q154 27 142 34Z" fill="#395c61" /><Path d="M160 32V61Q160 69 153 66" fill="none" stroke="#395c61" strokeWidth="2.5" /></G>}
      {winter && <G><Path d="M143 30Q142 12 155 12Q169 13 169 31Z" fill="#dbc799" /><Path d="M141 29H171V36H141Z" fill="#c0ac7d" /></G>}
    </Svg>
  );
}
