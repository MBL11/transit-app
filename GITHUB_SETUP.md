# Instructions pour Pusher sur GitHub

Le repository local est prêt ! Voici comment le pusher sur GitHub :

## Option 1 : Via l'Interface Web GitHub

1. Va sur https://github.com/new
2. Crée un nouveau repository nommé `transit-app`
3. **NE PAS** initialiser avec README, .gitignore ou licence (on les a déjà)
4. Une fois créé, GitHub te donnera des instructions. Utilise la section "push an existing repository" :

```bash
cd /home/claude/transit-app
git remote add origin https://github.com/[ton-username]/transit-app.git
git branch -M main
git push -u origin main
```

## Option 2 : Via GitHub CLI (si installé)

```bash
cd /home/claude/transit-app
gh repo create transit-app --public --source=. --remote=origin
git branch -M main
git push -u origin main
```

## Fichiers Créés

✅ `.gitignore` - Ignore node_modules, .env, data GTFS, etc.
✅ `README.md` - Documentation principale du projet
✅ `CLAUDE.md` - Plan de développement avec 18 prompts pour Claude Code
✅ `CONTRIBUTING.md` - Guide de contribution
✅ `.env.example` - Template des variables d'environnement
✅ `package.json` - Dépendances de base
✅ `docs/ARCHITECTURE.md` - Architecture détaillée avec adapter pattern
✅ `docs/ADAPTERS.md` - Guide pour créer un nouvel adapter
✅ `src/adapters/README.md` - Documentation du dossier adapters
✅ `src/adapters/paris/README.md` - Documentation spécifique Paris/IDFM

## Structure des Dossiers

```
transit-app/
├── .git/                   # Repository git initialisé ✅
├── src/
│   ├── core/               # Créé (vide pour l'instant)
│   ├── adapters/
│   │   ├── paris/          # Créé (vide pour l'instant)
│   │   └── README.md       # Documentation ✅
│   ├── components/
│   │   ├── ui/             # Créé (vide pour l'instant)
│   │   ├── transit/        # Créé (vide pour l'instant)
│   │   └── map/            # Créé (vide pour l'instant)
│   └── locales/            # Créé (vide pour l'instant)
├── docs/                   # Documentation complète ✅
├── data/                   # Créé (pour les données GTFS, gitignored)
├── .gitignore              # Fichiers à ignorer ✅
├── README.md               # Documentation principale ✅
├── CLAUDE.md               # Plan de développement ✅
├── CONTRIBUTING.md         # Guide de contribution ✅
├── .env.example            # Template env vars ✅
└── package.json            # Dépendances de base ✅
```

## Prochaines Étapes

Une fois le repo sur GitHub, tu peux commencer le développement :

1. **Cloner le repo** (ou rester dans ce dossier)
2. **Installer les dépendances** : `npm install`
3. **Suivre le plan dans CLAUDE.md** : Commencer par la fonctionnalité #1
4. **Utiliser Claude Code** pour implémenter chaque feature

## Fichier CLAUDE.md

Le fichier `CLAUDE.md` contient **18 prompts prêts à l'emploi** pour implémenter le projet étape par étape avec Claude Code :

1. Setup Expo + NativeWind
2. Composants UI de base
3. Parser GTFS statique
4. Base SQLite locale
5. Adapter Paris (interface)
6. Affichage carte avec arrêts
7. Liste des lignes
8. Détails d'un arrêt
9. Recherche d'arrêts
10. Temps réel SIRI-Lite
11. Bottom sheet de détails
12. Calcul d'itinéraire basique
13. Alertes et perturbations
14. Favoris (local storage)
15. Internationalisation (i18n)
16. Dark mode
17. Mode hors ligne
18. Adapter ville #2 (validation portabilité)

Chaque prompt est court et précis, parfait pour Claude Code !

## Notes Importantes

- Le repo est **prêt à être poussé** sur GitHub
- Aucun code n'a été écrit (comme demandé)
- Toute la documentation est en place
- La structure de dossiers est créée
- Le .gitignore exclut les fichiers sensibles (.env, data/, node_modules/)

Bon développement ! 🚀
