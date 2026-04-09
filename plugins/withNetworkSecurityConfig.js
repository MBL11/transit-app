const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">izmirmetro.com.tr</domain>
        <domain includeSubdomains="true">tramizmir.com</domain>
        <domain includeSubdomains="true">izban.com.tr</domain>
        <domain includeSubdomains="true">izdeniz.com.tr</domain>
        <domain includeSubdomains="true">eshot.gov.tr</domain>
        <domain includeSubdomains="true">acikveri.bizizmir.com</domain>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </domain-config>
</network-security-config>`;

function withNetworkSecurityConfig(config) {
  // Step 1: Add networkSecurityConfig attribute to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return config;
  });

  // Step 2: Create the XML resource file
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );

      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(xmlDir, 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG
      );

      return config;
    },
  ]);

  return config;
}

module.exports = withNetworkSecurityConfig;
