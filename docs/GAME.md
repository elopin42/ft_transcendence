# Plan Jeu — Style Movie Star Planet

## Stack utilisée
- **Phaser** -> moteur de jeu (affichage, déplacement, animations)
- **Tiled** -> outil pour dessiner la map (export JSON)
- **Next.js** -> intègre Phaser dans une page
- **NestJS** -> backend (login, users, logique)
- **WebSocket** -> synchronise les joueurs en temps réel
- **PostgreSQL** -> stocke users, stats, amis

## Assets gratuits
- itch.io -> cherche "free 2D character sprites"
- kenney.nl -> assets top qualité gratuits

## Architecture
```
frontend (Next.js + Phaser)
        ↓
WebSocket
        ↓
backend (NestJS)
        ↓
base de données (PostgreSQL)
```

## Ordre de travail
1. Afficher un personnage qui bouge (Phaser seul)
2. Ajouter une map (Tiled -> JSON -> Phaser)
3. Ajouter 2 joueurs (positions simulées)
4. Brancher WebSocket (positions en temps réel)
5. Brancher le login (vrai user connecté)
6. Ajouter mini-jeu

## Prochaine étape concrète
Installer Phaser dans le frontend :
```bash
npm install phaser
```
Créer `frontend/app/dashboard/page.tsx` avec un canvas Phaser qui affiche un personnage.
