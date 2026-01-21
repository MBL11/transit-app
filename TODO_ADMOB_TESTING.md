# 📝 TODO: Tester AdMob avec Dev Build

## ⚠️ État Actuel

Les publicités AdMob sont **temporairement désactivées** pour permettre l'utilisation d'Expo Go pendant le développement.

### Changements Effectués

1. **app.json**: Plugin AdMob commenté (lignes 37-49)
2. **src/config/ads.ts**: `shouldDisableAds()` retourne `true` en mode dev

### Pourquoi?

Expo Go ne supporte **pas** les modules natifs comme `react-native-google-mobile-ads`.
Pour tester AdMob, il faut créer un **development build** avec expo-dev-client.

---

## 🚀 Pour Tester AdMob Plus Tard

### Étape 1: Installer expo-dev-client

```bash
npx expo install expo-dev-client
```

### Étape 2: Réactiver le plugin AdMob

Dans `app.json`, décommente le plugin (lignes 37-45):

```json
{
  "expo": {
    "plugins": [
      "expo-sqlite",
      "expo-localization",
      "expo-location",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-3940256099942544~3347511713",
          "iosAppId": "ca-app-pub-3940256099942544~1458002511"
        }
      ]
    ]
  }
}
```

### Étape 3: Retirer le flag dev dans ads.ts

Dans `src/config/ads.ts`, enlève `|| isDevMode`:

```typescript
export function shouldDisableAds(): boolean {
  const isExpoGo = Constants.appOwnership === 'expo';
  // const isDevMode = IS_DEV; ← Commente cette ligne
  return isExpoGo; // ← Enlève || isDevMode
}
```

### Étape 4: Build dev client

**Pour iOS (Simulateur)**:
```bash
eas build --profile development --platform ios
```

**Pour Android (Appareil/Émulateur)**:
```bash
eas build --profile development --platform android
```

Attends 10-15 minutes que le build se termine.

### Étape 5: Installer le build

**iOS**:
- Télécharge le fichier `.tar.gz`
- Extrait et installe le `.app` sur ton simulateur
- Ou scanne le QR code pour installer sur un appareil physique

**Android**:
- Télécharge le fichier `.apk`
- Installe sur ton appareil: `adb install app.apk`
- Ou scanne le QR code

### Étape 6: Lancer l'app dev

```bash
npx expo start --dev-client
```

L'app s'ouvrira dans **ton dev build** (pas Expo Go), et tu pourras voir les pubs!

---

## ✅ Checklist de Test

Quand tu testes avec le dev build:

- [ ] Les bannières apparaissent en bas de MapScreen
- [ ] Les bannières apparaissent en bas de StopDetailsScreen
- [ ] Les bannières apparaissent en bas de RouteScreen
- [ ] L'interstitiel s'affiche après 3 calculs d'itinéraire
- [ ] Les pubs utilisent les IDs de test Google (dev mode)
- [ ] Pas d'erreur dans les logs
- [ ] Les pubs se chargent rapidement (< 3 secondes)
- [ ] L'UI n'est pas bloquée pendant le chargement

---

## 📚 Ressources

- [Expo Dev Client Guide](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [AdMob Integration Guide](ADMOB_SETUP.md)

---

**Priorité**: 🟡 Moyenne (fonctionne déjà en production, juste besoin de tester localement)

**Temps estimé**: 30-45 minutes (build + installation + tests)

**Quand tester**: Avant le déploiement en production ou quand tu veux voir les vraies pubs
