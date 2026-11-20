/**
 * Expo config plugin that ensures android:usesCleartextTraffic="true"
 * is set in the main AndroidManifest.xml.
 *
 * Expo SDK 54's prebuild only adds this to the debug manifest overlay,
 * but EAS preview/production builds use release variants that only read
 * the main manifest. Without this, Android 9+ blocks all HTTP traffic.
 */
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (manifest.application && manifest.application[0]) {
      manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    }
    return config;
  });
};
