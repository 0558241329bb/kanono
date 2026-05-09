import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.avocatdz.app',
  appName: 'LGS',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId:
        '795327942220-h1qgtcic82n3fj8teedpil1mtlafmnqb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
