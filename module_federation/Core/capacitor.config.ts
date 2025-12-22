import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.core',
  appName: 'CoreApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Toggle this for Remote Deployment (Scenario A)
    // url: 'https://gateway-url/handy-terminal/core',
    // cleartext: true
  }
};

export default config;
