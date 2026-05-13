# Campagne Video Marketing - Izmir Metro Otobus (Remotion)

## Setup Remotion

```bash
# Creer le projet Remotion a cote de l'app
cd /home/user
npx create-video@latest izmir-metro-videos
# Choisir : TypeScript, TailwindCSS

cd izmir-metro-videos
npm install
npm start # Preview sur http://localhost:3000
```

## Structure du Projet

```
izmir-metro-videos/
  src/
    compositions/
      AppPromo.tsx          # Video principale (30s)
      FeatureHighlight.tsx  # Features individuelles (15s chacune)
      StorePreview.tsx      # Preview Play Store (10s)
      SocialStory.tsx       # Story Instagram/TikTok (9:16, 15s)
    components/
      PhoneMockup.tsx       # Cadre telephone avec screenshots
      TransitLine.tsx       # Animation ligne de metro
      MapAnimation.tsx      # Animation carte Izmir
      TextReveal.tsx        # Texte qui apparait lettre par lettre
      Badge.tsx             # Badge "Gratuit" / "Temps reel"
      LogoIntro.tsx         # Animation logo app
    assets/
      screenshots/          # Screenshots de l'app (toutes les tailles)
      logo.png              # Logo de l'app
      icon.png              # Icone adaptive
      izmir-map.png         # Carte d'Izmir stylisee
      sounds/
        whoosh.mp3
        ding.mp3
        metro-sound.mp3
    styles/
      colors.ts             # Couleurs de l'app (#D50000, etc.)
      fonts.ts              # Polices
    Root.tsx
```

---

## Video 1 : App Promo (30s - Format 16:9)

**Objectif** : Video principale pour Play Store et YouTube

**Storyboard** :

| Temps | Scene | Animation |
|-------|-------|-----------|
| 0-3s | Logo Izmir Metro apparait avec effet metro | `spring()` sur scale + opacity |
| 3-7s | Carte d'Izmir avec lignes de metro qui se dessinent | `interpolate()` sur strokeDashoffset |
| 7-12s | Phone mockup : ecran Map avec arrets | `slide` depuis le bas + zoom sur carte |
| 12-17s | Phone : recherche d'itineraire en action | Texte qui se tape + resultats qui apparaissent |
| 17-22s | Phone : temps reel des departs | Compte a rebours anime |
| 22-26s | Split screen : 3 features (Favoris, Alertes, Hors ligne) | `stagger` animation des 3 cartes |
| 26-30s | Logo + "Telecharger sur Google Play" + QR code | Fade in + bouton pulse |

```tsx
// src/compositions/AppPromo.tsx
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { PhoneMockup } from '../components/PhoneMockup';
import { LogoIntro } from '../components/LogoIntro';
import { MapAnimation } from '../components/MapAnimation';

export const AppPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      {/* Scene 1: Logo (0-3s) */}
      <Sequence from={0} durationInFrames={3 * fps}>
        <LogoIntro />
      </Sequence>

      {/* Scene 2: Carte Izmir (3-7s) */}
      <Sequence from={3 * fps} durationInFrames={4 * fps}>
        <MapAnimation />
      </Sequence>

      {/* Scene 3: Phone Map (7-12s) */}
      <Sequence from={7 * fps} durationInFrames={5 * fps}>
        <PhoneMockup screenshot="map-screen.png" enterFrom="bottom" />
      </Sequence>

      {/* Scene 4: Recherche itineraire (12-17s) */}
      <Sequence from={12 * fps} durationInFrames={5 * fps}>
        <PhoneMockup screenshot="route-screen.png" enterFrom="right" />
      </Sequence>

      {/* Scene 5: Temps reel (17-22s) */}
      <Sequence from={17 * fps} durationInFrames={5 * fps}>
        <PhoneMockup screenshot="stop-details.png" enterFrom="left" />
      </Sequence>

      {/* Scene 6: Features (22-26s) */}
      <Sequence from={22 * fps} durationInFrames={4 * fps}>
        <FeatureCards />
      </Sequence>

      {/* Scene 7: CTA (26-30s) */}
      <Sequence from={26 * fps} durationInFrames={4 * fps}>
        <CallToAction />
      </Sequence>
    </AbsoluteFill>
  );
};
```

---

## Video 2 : Feature Highlights (15s chacune - Format 9:16)

**Pour Instagram Reels / TikTok / YouTube Shorts**

### 2a - "Temps Reel" (15s)

| Temps | Scene |
|-------|-------|
| 0-2s | Texte: "Ton bus arrive dans..." |
| 2-5s | Countdown anime 5:00 → 4:59 → 4:58 |
| 5-10s | Phone avec ecran Stop Details |
| 10-13s | Zoom sur les departs en temps reel |
| 13-15s | Logo + "Telecharge maintenant" |

### 2b - "Itineraire" (15s)

| Temps | Scene |
|-------|-------|
| 0-2s | Pin A anime sur carte |
| 2-4s | Pin B anime sur carte |
| 4-9s | Ligne qui se trace entre A et B avec arrets |
| 9-13s | Phone avec resultat d'itineraire |
| 13-15s | Logo + CTA |

### 2c - "Mode Hors Ligne" (15s)

| Temps | Scene |
|-------|-------|
| 0-3s | Icone WiFi qui se barre (animation) |
| 3-5s | Texte: "Pas de connexion ?" |
| 5-10s | Phone qui montre l'app fonctionnelle offline |
| 10-13s | Texte: "Ca marche quand meme" |
| 13-15s | Logo + CTA |

```tsx
// src/compositions/FeatureHighlight.tsx
import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface Props {
  feature: 'realtime' | 'routing' | 'offline';
}

export const FeatureHighlight: React.FC<Props> = ({ feature }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const configs = {
    realtime: {
      title: 'Seferler Gercek Zamanli',
      titleTR: 'Gercek zamanli takip',
      color: '#4CAF50',
      screenshot: 'stop-details.png',
    },
    routing: {
      title: 'A\'dan B\'ye',
      titleTR: 'Rota hesapla',
      color: '#2196F3',
      screenshot: 'route-screen.png',
    },
    offline: {
      title: 'Internet Olmadan',
      titleTR: 'Cevrimdisi mod',
      color: '#FF9800',
      screenshot: 'offline-mode.png',
    },
  };

  const config = configs[feature];
  // ... animation logic
};
```

---

## Video 3 : Play Store Preview (10s - Format 16:9)

Pour la video de l'onglet Store Listing sur Google Play.

| Temps | Scene |
|-------|-------|
| 0-2s | "Izmir Metro Otobus" avec logo |
| 2-4s | Carte avec animation |
| 4-6s | 3 screenshots cote a cote |
| 6-8s | Feature list animee |
| 8-10s | "Ucretsiz Indir" (Telecharge gratuitement) |

---

## Composants Reutilisables

### PhoneMockup.tsx

```tsx
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { staticFile } from 'remotion';

interface Props {
  screenshot: string;
  enterFrom?: 'bottom' | 'left' | 'right';
}

export const PhoneMockup: React.FC<Props> = ({ screenshot, enterFrom = 'bottom' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 12 } });

  const translateY = enterFrom === 'bottom'
    ? interpolate(entrance, [0, 1], [600, 0])
    : 0;
  const translateX = enterFrom === 'left'
    ? interpolate(entrance, [0, 1], [-400, 0])
    : enterFrom === 'right'
    ? interpolate(entrance, [0, 1], [400, 0])
    : 0;

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{
        transform: `translateX(${translateX}px) translateY(${translateY}px)`,
        width: 280,
        height: 580,
        borderRadius: 36,
        border: '8px solid #333',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        backgroundColor: '#000',
      }}>
        <Img src={staticFile(`screenshots/${screenshot}`)} style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }} />
      </div>
    </AbsoluteFill>
  );
};
```

### TransitLine.tsx

```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface Props {
  color: string;
  stops: { x: number; y: number; name: string }[];
}

export const TransitLine: React.FC<Props> = ({ color, stops }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame, [0, 2 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // SVG path qui se dessine progressivement
  const pathLength = 1000;
  const dashOffset = pathLength * (1 - progress);

  return (
    <svg viewBox="0 0 400 600" style={{ width: '100%', height: '100%' }}>
      <path
        d={stopsToPath(stops)}
        stroke={color}
        strokeWidth={6}
        fill="none"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
      {stops.map((stop, i) => {
        const stopProgress = interpolate(
          frame,
          [i * (2 * fps / stops.length), (i + 1) * (2 * fps / stops.length)],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        return (
          <circle
            key={i}
            cx={stop.x}
            cy={stop.y}
            r={8 * stopProgress}
            fill="white"
            stroke={color}
            strokeWidth={3}
          />
        );
      })}
    </svg>
  );
};
```

### TextReveal.tsx

```tsx
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface Props {
  text: string;
  color?: string;
  fontSize?: number;
}

export const TextReveal: React.FC<Props> = ({ text, color = 'white', fontSize = 48 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const charsShown = Math.floor(
    interpolate(frame, [0, fps * 1.5], [0, text.length], {
      extrapolateRight: 'clamp',
    })
  );

  return (
    <div style={{
      fontSize,
      fontWeight: 'bold',
      color,
      fontFamily: 'Inter, sans-serif',
    }}>
      {text.slice(0, charsShown)}
      {charsShown < text.length && (
        <span style={{ opacity: frame % 15 < 8 ? 1 : 0 }}>|</span>
      )}
    </div>
  );
};
```

---

## Couleurs & Branding

```ts
// src/styles/colors.ts
export const BRAND = {
  primary: '#D50000',       // Rouge Izmir Metro
  primaryDark: '#9B0000',
  background: '#1a1a2e',    // Fond sombre pour les videos
  backgroundLight: '#16213e',
  accent: '#e94560',
  white: '#FFFFFF',
  text: '#F5F5F5',
  textMuted: '#A0A0A0',

  // Couleurs par mode de transport
  metro: '#D50000',
  bus: '#1565C0',
  izban: '#2E7D32',
  tram: '#F57F17',
  ferry: '#0097A7',
};
```

---

## Registration (Root.tsx)

```tsx
import { Composition } from 'remotion';
import { AppPromo } from './compositions/AppPromo';
import { FeatureHighlight } from './compositions/FeatureHighlight';
import { StorePreview } from './compositions/StorePreview';
import { SocialStory } from './compositions/SocialStory';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Video principale - 30s, 1080p */}
      <Composition
        id="AppPromo"
        component={AppPromo}
        durationInFrames={30 * 30}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Feature highlights - 15s, 9:16 pour Stories */}
      <Composition
        id="FeatureRealtime"
        component={FeatureHighlight}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ feature: 'realtime' as const }}
      />
      <Composition
        id="FeatureRouting"
        component={FeatureHighlight}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ feature: 'routing' as const }}
      />
      <Composition
        id="FeatureOffline"
        component={FeatureHighlight}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ feature: 'offline' as const }}
      />

      {/* Play Store preview - 10s */}
      <Composition
        id="StorePreview"
        component={StorePreview}
        durationInFrames={10 * 30}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Social Story - 15s, 9:16 */}
      <Composition
        id="SocialStory"
        component={SocialStory}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
```

---

## Screenshots Necessaires

Avant de coder les videos, prends ces screenshots de l'app :

1. **map-screen.png** - Carte avec arrets visibles
2. **stop-details.png** - Details d'un arret avec departs
3. **route-screen.png** - Resultat d'itineraire
4. **lines-list.png** - Liste des lignes
5. **search-screen.png** - Recherche en cours
6. **favorites-screen.png** - Favoris avec arrets
7. **offline-mode.png** - App en mode hors ligne (banniere orange)
8. **dark-mode.png** - App en dark mode
9. **alerts-screen.png** - Ecran alertes

Place-les dans `public/screenshots/` du projet Remotion.

---

## Commandes de Rendu

```bash
# Preview dans le navigateur
npm start

# Render une video specifique
npx remotion render AppPromo out/app-promo.mp4

# Render en haute qualite
npx remotion render AppPromo out/app-promo.mp4 --codec h264 --crf 18

# Render toutes les videos
npx remotion render AppPromo out/app-promo.mp4
npx remotion render FeatureRealtime out/feature-realtime.mp4
npx remotion render FeatureRouting out/feature-routing.mp4
npx remotion render FeatureOffline out/feature-offline.mp4
npx remotion render StorePreview out/store-preview.mp4
npx remotion render SocialStory out/social-story.mp4

# Format GIF pour les stores
npx remotion render AppPromo out/app-promo.gif --codec gif
```

---

## Textes Marketing (TR / EN / FR)

### Turc (audience principale)
- "Izmir'de ulasim artik cok kolay!"
- "Gercek zamanli sefer takibi"
- "Metro, Otobus, IZBAN - tek uygulamada"
- "Ucretsiz indir"
- "Internet olmadan da calisir"

### Anglais
- "Izmir transit made simple"
- "Real-time departures at your fingertips"
- "Metro, Bus, IZBAN - all in one app"
- "Download free"
- "Works offline too"

### Francais
- "Les transports d'Izmir simplifies"
- "Departs en temps reel"
- "Metro, Bus, IZBAN - tout en une app"

---

## Checklist de Production

- [ ] Installer Remotion (`npx create-video@latest`)
- [ ] Prendre tous les screenshots de l'app
- [ ] Coder les composants reutilisables (PhoneMockup, TextReveal, TransitLine)
- [ ] Coder la video AppPromo (30s)
- [ ] Coder les 3 FeatureHighlights (15s chacune)
- [ ] Coder le StorePreview (10s)
- [ ] Coder le SocialStory (15s)
- [ ] Ajouter la musique de fond (libre de droits)
- [ ] Render toutes les videos
- [ ] Upload StorePreview sur Google Play Console
- [ ] Upload les Reels sur Instagram/TikTok
- [ ] Upload AppPromo sur YouTube

---

## Ressources Musique Libre de Droits

- [Pixabay Music](https://pixabay.com/music/) - Gratuit
- [Uppbeat](https://uppbeat.io/) - Gratuit avec attribution
- Chercher : "upbeat technology" ou "modern app promo" ou "urban transport"
