# Guide de Contribution

Merci de contribuer à Transit App ! 🚀

## 🎯 Comment contribuer

### 1. Signaler un Bug

Ouvre une issue avec :
- Description claire du problème
- Steps to reproduce
- Comportement attendu vs observé
- Screenshots (si applicable)
- Ville/adapter concerné

### 2. Proposer une Nouvelle Fonctionnalité

Ouvre une issue avec :
- Description de la fonctionnalité
- Use case et bénéfices
- Estimation de complexité (si possible)

### 3. Ajouter une Nouvelle Ville

Voir le guide détaillé : [docs/ADAPTERS.md](./docs/ADAPTERS.md)

**TL;DR** :
1. Vérifie que la ville a des données GTFS disponibles
2. Crée un nouvel adapter dans `src/adapters/[ville]/`
3. Implémente l'interface `TransitAdapter`
4. Ajoute des tests
5. Documente les spécificités

### 4. Améliorer le Code

Pull requests bienvenues pour :
- Optimisations de performance
- Corrections de bugs
- Amélioration de l'UX
- Refactoring (avec justification)

## 📝 Workflow Git

```bash
# 1. Fork le repo
# 2. Clone ton fork
git clone https://github.com/[ton-username]/transit-app.git

# 3. Crée une branche
git checkout -b feature/ma-fonctionnalite

# 4. Commit tes changements
git add .
git commit -m "feat: description concise"

# 5. Push sur ton fork
git push origin feature/ma-fonctionnalite

# 6. Ouvre une Pull Request
```

## ✍️ Convention de Commits

On utilise [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: ajoute recherche d'itinéraire
fix: corrige crash au clic sur marker
docs: met à jour le guide des adapters
style: formate le code selon prettier
refactor: restructure le parser GTFS
test: ajoute tests pour ParisAdapter
chore: met à jour les dépendances
```

## 🧪 Tests

Avant de soumettre une PR :

```bash
# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run type-check

# Format code
npm run format
```

## 📐 Standards de Code

### TypeScript

- Utilise `interface` pour les types publics
- Utilise `type` pour les unions/intersections
- Toujours typer les retours de fonctions
- Évite `any`, préfère `unknown`

```typescript
// ✅ Good
interface Stop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

async function loadStops(): Promise<Stop[]> {
  // ...
}

// ❌ Bad
async function loadStops() {
  // Pas de typage du retour
}
```

### React/React Native

- Composants fonctionnels + hooks
- Préfère `const` pour les composants
- Utilise TypeScript pour les props

```tsx
// ✅ Good
interface StopCardProps {
  stop: Stop;
  onPress: () => void;
}

export const StopCard: React.FC<StopCardProps> = ({ stop, onPress }) => {
  return <Card onPress={onPress}>...</Card>;
};

// ❌ Bad
export function StopCard(props) {
  return <Card>...</Card>;
}
```

### Styling

- Utilise NativeWind (Tailwind classes)
- Évite les styles inline
- Groupe les classes logiquement

```tsx
// ✅ Good
<View className="flex-row items-center gap-3 p-4 bg-card rounded-lg">

// ❌ Bad
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
```

### Naming

- **Composants** : PascalCase (`StopCard.tsx`)
- **Fonctions** : camelCase (`loadStops()`)
- **Constants** : UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Fichiers** : kebab-case (`gtfs-parser.ts`)

## 🏗️ Architecture

### Principes

1. **Adapter Pattern** : Toute ville a son adapter
2. **Separation of Concerns** : Core agnostique de la ville
3. **Offline First** : GTFS statique doit fonctionner sans réseau
4. **Type Safety** : TypeScript strict mode

### Où mettre le code ?

| Type de code | Emplacement |
|--------------|-------------|
| Logique métier agnostique | `src/core/` |
| Adapter ville | `src/adapters/[ville]/` |
| Composant UI réutilisable | `src/components/ui/` |
| Composant métier transit | `src/components/transit/` |
| Écran | `src/screens/` |
| Traduction | `src/locales/` |
| Utilitaire générique | `src/utils/` |

### Ne pas over-engineer

- Pas de Redux si pas nécessaire (React Context suffit)
- Pas d'abstraction prématurée
- YAGNI (You Aren't Gonna Need It)

## 🌍 Internationalisation

- Tous les textes UI doivent être traduits
- Utilise `useTranslation()` hook
- Les noms GTFS restent dans leur langue d'origine

```tsx
// ✅ Good
const { t } = useTranslation();
<Text>{t('transit.nextDeparture')}</Text>

// ❌ Bad
<Text>Prochain passage</Text>
```

## 📱 Accessibilité

- Ajoute `accessibilityLabel` sur les éléments interactifs
- Teste avec VoiceOver (iOS) et TalkBack (Android)
- Assure un bon contraste des couleurs

```tsx
<TouchableOpacity
  accessibilityLabel={t('common.search')}
  accessibilityRole="button"
>
  <Icon name="search" />
</TouchableOpacity>
```

## 🐛 Debug

### React Native Debugger

```bash
# Installer
brew install --cask react-native-debugger

# Lancer
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

### Logs

```typescript
// Development
console.log('Debug info');

// Production (à éviter)
if (__DEV__) {
  console.log('Debug only in dev');
}
```

## 📚 Ressources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev)
- [NativeWind Docs](https://www.nativewind.dev)
- [GTFS Spec](https://gtfs.org)

## ✅ Pull Request Checklist

Avant de soumettre :

- [ ] Code fonctionne (testé sur iOS et Android)
- [ ] Tests ajoutés/mis à jour
- [ ] Linter passe (`npm run lint`)
- [ ] Type check passe (`npm run type-check`)
- [ ] Code formatté (`npm run format`)
- [ ] Documentation mise à jour (si nécessaire)
- [ ] Commit messages suivent la convention
- [ ] PR description claire et concise

## 💬 Questions ?

- Ouvre une issue
- Rejoint les discussions GitHub
- Contacte les mainteneurs

Merci de contribuer ! 🙏
