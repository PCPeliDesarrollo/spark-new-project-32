import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pantherafitness.alburquerque',
  appName: 'Panthera Fitness Alburquerque',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#000000'
  }
};

export default config;
