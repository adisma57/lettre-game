import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.quadra.game",
  appName: "Quadra",
  webDir: "dist",
  android: {
    backgroundColor: "#0c0b09",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#0c0b09",
    },
  },
};

export default config;
