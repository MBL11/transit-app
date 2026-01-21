# 📱 AdMob Setup Guide

Guide complet pour configurer Google AdMob dans l'application Transit App.

## ✅ État Actuel

L'intégration AdMob est **entièrement fonctionnelle** avec:

- ✅ Package `react-native-google-mobile-ads` installé
- ✅ Configuration dans `src/config/ads.ts`
- ✅ Composant `BannerAdComponent` pour bannières
- ✅ Hook `useInterstitialAd` pour interstitiels
- ✅ IDs de test Google configurés
- ✅ Bannières affichées sur 3 écrans: Map, StopDetails, Route
- ✅ Interstitiel affiché tous les 3 calculs d'itinéraire
- ✅ Context `AdsProvider` pour gérer le premium (future)

## 📋 Configuration par Défaut (Mode Test)

En **mode développement** (`__DEV__ = true`), l'app utilise automatiquement les **IDs de test Google**:

```typescript
// IDs de test (pas de revenus, safe pour dev)
Banner iOS: ca-app-pub-3940256099942544/2934735716
Banner Android: ca-app-pub-3940256099942544/6300978111
Interstitial iOS: ca-app-pub-3940256099942544/4411468910
Interstitial Android: ca-app-pub-3940256099942544/1033173712
```

Ces IDs sont **sûrs** et **doivent être utilisés** pendant le développement pour éviter des clics invalides.

## 🚀 Passer en Production

### 1. Créer un Compte AdMob

1. Va sur [https://admob.google.com](https://admob.google.com)
2. Connecte-toi avec ton compte Google
3. Crée une nouvelle app pour **Android**
4. Crée une nouvelle app pour **iOS**

### 2. Créer les Unités Publicitaires

Pour **chaque app** (Android + iOS), crée:

#### Banner Ad
- Type: **Banner**
- Nom: "Transit App - Banner"
- Note l'ID généré: `ca-app-pub-XXXXXXXX/YYYYYYYY`

#### Interstitial Ad
- Type: **Interstitial**
- Nom: "Transit App - Interstitial"
- Note l'ID généré: `ca-app-pub-XXXXXXXX/ZZZZZZZZ`

### 3. Configurer les Variables d'Environnement

Crée un fichier `.env` à la racine:

```env
# AdMob App IDs (from AdMob dashboard)
EXPO_PUBLIC_ADMOB_APP_ID_IOS=ca-app-pub-XXXXXXXX~YYYYYYYY
EXPO_PUBLIC_ADMOB_APP_ID_ANDROID=ca-app-pub-XXXXXXXX~ZZZZZZZZ

# AdMob Ad Unit IDs - Banner
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-XXXXXXXX/AAAAAAAA
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-XXXXXXXX/BBBBBBBB

# AdMob Ad Unit IDs - Interstitial
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-XXXXXXXX/CCCCCCCC
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-XXXXXXXX/DDDDDDDD
```

### 4. Mettre à Jour app.json

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXX~ZZZZZZZZ",
          "iosAppId": "ca-app-pub-XXXXXXXX~YYYYYYYY"
        }
      ]
    ]
  }
}
```

### 5. Build de Production

```bash
# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production
```

## 📊 Comment ça Marche

### Bannières (Bottom Banner Ads)

Affichées en bas de 3 écrans:

```typescript
// MapScreen, StopDetailsScreen, RouteScreen
import { BannerAdComponent } from '../components/ads/BannerAd';

<BannerAdComponent />
```

- Taille: `BannerAdSize.BANNER` (320x50)
- Placement: En bas de l'écran
- Gestion erreur: Se cache automatiquement si échec de chargement

### Interstitiels (Full-Screen Ads)

Affiché **tous les 3 calculs d'itinéraire**:

```typescript
import { useInterstitialAd } from '../hooks/useInterstitialAd';

const { showAdIfNeeded } = useInterstitialAd();

const handleCalculateRoute = async () => {
  // ... calcul d'itinéraire ...

  // Affiche une pub si conditions remplies
  await showAdIfNeeded();
};
```

Le compteur est sauvegardé dans AsyncStorage: `@route_calculations_count`

## 💰 Fonctionnalité Premium (Future)

Le context `AdsProvider` permet de gérer le premium:

```typescript
import { useAds } from '../contexts/AdsContext';

const { adsEnabled, isPremium, disableAds } = useAds();

// Après un achat in-app
await disableAds(); // Les pubs disparaissent
```

Pour implémenter le premium:
1. Intégrer expo-in-app-purchases ou RevenueCat
2. Appeler `disableAds()` après achat validé
3. Les composants vérifient automatiquement `adsEnabled`

## 🧪 Tests

### Mode Développement
- Les IDs de test sont utilisés automatiquement
- Pas de revenus générés
- Clics illimités sans risque de ban

### Mode Production
- Utilise les vrais IDs depuis .env
- **NE JAMAIS CLIQUER SUR TES PROPRES PUBS**
- Google te bannira si trop de clics invalides

### Tester sur Appareil Réel

```bash
# Expo Go ne supporte PAS AdMob
# Tu dois faire un build de développement:

npx expo install expo-dev-client
eas build --profile development --platform android
# Installe le .apk sur ton appareil
```

## ⚠️ Warnings Importants

1. **Ne pas cliquer sur tes pubs** en production (risque de ban Google)
2. **Utiliser les IDs de test** pendant le développement
3. **Tester sur appareil réel** (pas de pubs sur simulateur)
4. **Expo Go ne supporte pas AdMob** (faire un build)
5. **Attendre 24-48h** après config pour voir les vraies pubs

## 📖 Ressources

- [Documentation react-native-google-mobile-ads](https://docs.page/invertase/react-native-google-mobile-ads)
- [AdMob Console](https://admob.google.com)
- [Policies AdMob](https://support.google.com/admob/answer/6128543)
- [Test IDs Google](https://developers.google.com/admob/android/test-ads#sample_ad_units)

## 🔍 Debug

### Les pubs ne s'affichent pas

1. Vérifie que tu es **sur un appareil réel** (pas simulateur)
2. Vérifie que tu **n'es pas** sur Expo Go
3. Vérifie les IDs dans `.env` et `app.json`
4. Check les logs: `console.log` dans BannerAd et useInterstitialAd
5. Attends 5-10 min (les pubs peuvent prendre du temps à charger)

### Erreur "Ad failed to load"

C'est normal en mode test. Les IDs de test:
- Ne s'affichent pas toujours immédiatement
- Peuvent avoir un fill rate < 100%
- Ne génèrent pas de revenus

En production avec vrais IDs:
- Le fill rate est meilleur
- Les pubs s'affichent plus régulièrement

### "Invalid App ID"

Vérifie que dans `app.json`, tu as les **App IDs** (avec `~`), pas les **Ad Unit IDs** (avec `/`):

```json
{
  "androidAppId": "ca-app-pub-XXXXXXXX~ZZZZZZZZ",  ← Correct (avec ~)
  "iosAppId": "ca-app-pub-XXXXXXXX~YYYYYYYY"      ← Correct (avec ~)
}
```

## 💡 Best Practices

1. **Placement des bannières**: En bas, non-intrusif
2. **Fréquence interstitiels**: Pas plus de 1 toutes les 3-5 actions
3. **UX**: Ne pas bloquer les features critiques
4. **Performance**: Les pubs sont lazy-loaded
5. **Privacy**: Respecter GDPR/CCPA (TODO: ajouter consent)

---

**Status**: ✅ Prêt pour la production (après configuration des IDs)
**Dernière mise à jour**: Janvier 2026
