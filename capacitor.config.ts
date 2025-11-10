import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pantherafitness.alburquerque',
  appName: 'Panthera Fitness Alburquerque',
  webDir: 'dist',
  android: {
    backgroundColor: '#000000',
    webContentsDebuggingEnabled: true,
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
