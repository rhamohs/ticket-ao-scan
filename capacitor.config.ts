import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f466f7a315c346ccb9d796aa6d654e44',
  appName: 'Ticket.ao Pro',
  webDir: 'dist',
  server: {
    url: "https://f466f7a3-15c3-46cc-b9d7-96aa6d654e44.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    BarcodeScanner: {
      android: {
        supportTorch: true
      }
    }
  }
};

export default config;