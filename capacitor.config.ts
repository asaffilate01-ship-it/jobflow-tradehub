import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.craftvaro.app',
  appName: 'Craftvaro',
  webDir: 'dist',
  // Production mobile builds package the audited `dist` output. Do not point
  // release binaries at a mutable preview URL or permit clear-text traffic.
};

export default config;
