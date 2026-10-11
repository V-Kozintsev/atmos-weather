const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const config = getDefaultConfig(__dirname);
config.watchFolders = [
  path.resolve(__dirname, "../src/lib"),
  path.resolve(__dirname, "../public"),
];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const shared = context.originModulePath.startsWith(
    path.resolve(__dirname, "../src/lib"),
  );
  const origin =
    shared && !moduleName.startsWith(".")
      ? { ...context, originModulePath: path.join(__dirname, "index.ts") }
      : context;
  return context.resolveRequest(origin, moduleName, platform);
};
module.exports = config;
