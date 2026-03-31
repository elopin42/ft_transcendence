# 🏓 ft_transcendence — Roadmap Officielle (14 Points)

> **Projet** : Web Application Multijoueur en ligne
> **Équipe** : 4 personnes | **Stack** : Next.js · NestJS · PostgreSQL · Docker · Nginx

---

## 🚨 RÈGLES D'OR — Échec immédiat si non respectées

- [ ] **Docker** : Un seul `docker compose up --build` doit tout lancer.
- [ ] **HTTPS** : Port 443 obligatoire + certificat SSL (Reverse Proxy Nginx).
- [ ] **Légal** : Pages **Privacy Policy** et **Terms of Service** visibles.
- [ ] **Baseline Auth** : Inscription Email/Mdp obligatoire avant tout module OAuth.
- [ ] **Support Multi-utilisateur** : Plusieurs utilisateurs actifs sans erreurs.

---

## 🧱 Architecture globale

```
[Navigateur]
     │ HTTPS (443)
     ▼
  [Nginx]  ← reverse proxy
  ┌──┴──────────────┐
  ▼                 ▼
[Next.js]       [NestJS API]
(Frontend)      (Backend)
                    │
                    ▼
              [PostgreSQL]
```

---

## 📦 Modules choisis (à valider ensemble)

Le sujet impose d'accumuler **14 points**. Voici notre sélection 100% conforme :

> **Légende** :
> - `[Obligatoire]` = exigé par le sujet (0 point, base du projet)
> - `[Majeur] (2pts)` = module choisi dans la liste (2 points)
> - `[Mineur] (1pt)` = module choisi dans la liste (1 point)
> - `[Notre implémentation]` = le sujet exige le résultat, on choisit la forme librement

### ✅ Modules Majeurs (2 pts chacun)
| # | Module | Origine |
|---|--------|---------|
| 1 | **Backend & Frontend Frameworks** (Next.js + NestJS) | Module majeur du sujet |
| 2 | **WebSockets** (Temps réel pour jeu + chat) | Module majeur du sujet |
| 3 | **User Interaction** (Basic chat + Profile + Friends) | Module majeur du sujet |
| 4 | **Remote players** (Jeu à distance via réseau) | Module majeur du sujet |
| 5 | **AI Opponent** (IA capable de jouer/gagner) | Module majeur du sujet |

### ✅ Modules Mineurs (1 pt chacun)
| # | Module | Origine |
|---|--------|---------|
| 6 | **Remote authentication** (OAuth 2.0 via 42 API) | Module mineur du sujet |
| 7 | **Two-Factor Authentication** (2FA / Google Auth) | Module mineur du sujet |
| 8 | **Tournament system** (brackets + registration) | Module mineur du sujet |
| 9 | **Internationalization Support** (3 langues mini) | Module mineur du sujet |

---

## 👥 Répartition des Blocs de Travail

### 🔵 Bloc de travail 1 — Infra / DevOps / BDD
**Objectif** : Tout ce qui permet de faire tourner le projet proprement.

- [ ] Dockerfiles & `docker-compose.yml` complet — `[Obligatoire]`
- [ ] Nginx : reverse proxy + SSL (HTTPS port 443) — `[Obligatoire]`
- [ ] Configuration PostgreSQL & .env sécurisé — `[Majeur #1]`
- [ ] Pages Privacy Policy & Terms of Service — `[Légal - Obligatoire]`
- [ ] Schéma BDD (tables users, games, tournaments, friends) — `[Notre implémentation]`

---

### 🟣 Bloc de travail 2 — Backend / Authentification / API
**Objectif** : Cerveau du projet et sécurité des données.

- [ ] Inscription / Connexion (Email/Password) — `[Obligatoire]`
- [ ] **OAuth 42 API** integration — `[Mineur #6]` (1 pt)
- [ ] **2FA** (Google Authenticator / TOTP) — `[Mineur #7]` (1 pt)
- [ ] JWT : Tokens de session et protection des routes — `[Majeur #1]`
- [ ] **API Interaction** : Gérer les amis (bloquer/ajouter) — `[Majeur #3]` (2 pts)

---

### 🟢 Bloc de travail 3 — Game / Logique de jeu
**Objectif** : Le cœur du projet, le jeu temps réel.

- [ ] Logique Pong (ball, paddles, collisions, score) — `[Obligatoire]`
- [ ] **WebSockets Gateway** (synchro des rooms serveur) — `[Majeur #2]` (2 pts)
- [ ] **Multijoueur en ligne** (gestion latence/reconnexion) — `[Majeur #4]` (2 pts)
- [ ] **IA adversaire** (comportement humain, peut gagner) — `[Majeur #5]` (2 pts)
- [ ] **Tournois** : Gérer les brackets et les matchs — `[Mineur #8]` (1 pt)

---

### 🟡 Bloc de travail 4 — Frontend / UI / UX
**Objectif** : Ce que les évaluateurs voient et utilisent.

- [ ] SPA fluide en Next.js (zéro rechargement de page) — `[Majeur #1]`
- [ ] **Chat en temps réel** (envois, réception, MP) — `[Majeur #3]`
- [ ] Page profil (avatar, stats, historique des matchs) — `[Obligatoire]`
- [ ] **Support Multi-langue** (3 langues + switcher) — `[Mineur #9]` (1 pt)
- [ ] Interface des Tournois (bracket visuel) — `[Notre implémentation]`

---

## 📅 Timeline recommandée

```
Semaine 1  → Docker + BDD + Login/Mdp + Pong local (Phase Alpha)
Semaine 2  → WebSockets + Chat + OAuth 42 + Pages légales
Semaine 3  → Multijoueur réseau + Reconnexion + API Amis
Semaine 4  → Tournoi + IA + 2FA + Traduction (Phase Beta)
Semaine 5  → Sécurité, Correctifs bugs, Polish UI finale
Semaine 6  → Préparation pour l'évaluation !
```

---

## 🔒 Checklist Sécurité (Avant Évaluation)

- [ ] **Mots de passe** : Toujours hashés (Bcrypt/Argon2), jamais de mdp en clair.
- [ ] **Inputs** : Validation stricte côté Backend (contre Injection SQL / XSS).
- [ ] **Variables d'env** : Jamais de `.env` sur Git, utiliser `.env.example`.
- [ ] **Authentification** : Tokens JWT expirables et sécurisés (HttpOnly cookies).
- [ ] **Audit** : Aucun warning ou erreur dans la console Chrome du client.
- [ ] **HTTPS** : Trafic chiffré partout via le reverse proxy.

---

## 🗄️ Schéma BDD — Structure Prévisionnelle

```sql
-- users: id, username, email, password_hash, avatar, 2fa_secret, online_status
-- friendships: user_id, friend_id, status (PENDING, ACCEPTED, BLOCKED)
-- games: id, p1_id, p2_id, score1, score2, winner_id, played_at
-- tournaments: id, name, created_by, status (WAITING, ONGOING, FINISHED)
-- tournament_participants: tournament_id, user_id, eliminated_at
```

---

## ⚙️ Setup Local pour l'équipe

```bash
# 1. Cloner le repo
git clone https://github.com/elopin42/ft_transcendence.git
cd ft_transcendence

# 2. Configurer les variables d'env
cp .env.example .env  # → Remplir les secrets ensuite

# 3. Lancer tout le projet d'un coup
docker compose up --build
```

---

*Mis à jour selon le sujet ft_transcendence v20.*
