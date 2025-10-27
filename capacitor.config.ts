import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pantherafitness.alburquerque',
  appName: 'Panthera Fitness Alburquerque',
  webDir: 'dist',
  server: {
    url: 'https://2e7e286f-8d87-458f-b8b6-d8c58a91db2a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
