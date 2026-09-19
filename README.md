# Site de précommande 2TIJEN

Site one-page (mobile d'abord) pour le premier drop 2TIJEN : 2 designs de t-shirts oversize, 50 pièces par design, numérotées.

**Stack** : Next.js (App Router) + TypeScript + Tailwind, hébergé sur Vercel · paiement Stripe Checkout · base Supabase (PostgreSQL) · e-mails Resend.

> Ce guide est écrit pour quelqu'un qui n'est pas développeur. Suis les étapes dans l'ordre.

---

## 1. Voir le site sur ton ordinateur (5 minutes)

1. Installe **Node.js** (version LTS) : <https://nodejs.org> et **Git** : <https://git-scm.com>.
2. Ouvre un terminal dans le dossier du projet et lance :
   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```
3. Ouvre <http://localhost:3000>.

Sans compte Supabase, le site s'affiche mais **l'achat est désactivé** (bandeau jaune « Mode démo »). Pour voir le site comme s'il était ouvert, sans rien configurer, ajoute ces deux lignes dans `.env.local` :

```
DEMO_NO_DB=1
NOW_OVERRIDE=2026-10-13T10:00:00-04:00
```

- `DEMO_NO_DB=1` : utilise le stock de la config au lieu de la base (le paiement, lui, ne fonctionne pas).
- `NOW_OVERRIDE` : simule une date. Essaie `2026-10-01T12:00:00-04:00` (avant), `2026-10-12T00:00:00-04:00` (24 h avant : accès anticipé), `2026-10-13T10:00:00-04:00` (ouvert, early bird), `2026-10-15T12:00:00-04:00` (ouvert, plein tarif), `2026-10-22T12:00:00-04:00` (clos).
- Pour tester l'accès anticipé en démo : ajoute `?acces=` suivi de 64 fois la lettre `a` à l'adresse.

Ces deux réglages sont **ignorés en production** : personne ne peut les utiliser pour tricher.

---

## 2. Créer les comptes

### 2.1 Supabase (base de données)

1. Crée un compte sur <https://supabase.com>, puis **New project** (choisis une région proche, par exemple Europe).
2. Menu **SQL Editor** → **New query** → colle **tout** le contenu de `supabase/schema.sql` → **Run**.
3. Menu **Project Settings → API** : copie
   - **Project URL** → variable `SUPABASE_URL`
   - **service_role key** → variable `SUPABASE_SERVICE_ROLE_KEY` (**secrète**, ne la partage jamais).
4. Remplis `.env.local`, puis crée les designs et les stocks :
   ```bash
   npm run seed
   ```
   Tu peux relancer cette commande sans risque : elle ne touche jamais aux ventes déjà enregistrées.

### 2.2 Stripe (paiement)

1. Crée un compte sur <https://stripe.com>. **Reste en mode test** (interrupteur « Mode test » activé).
2. **Developers → API keys** : copie la **clé secrète** `sk_test_…` → `STRIPE_SECRET_KEY`.
3. Le webhook (Stripe prévient le site quand un paiement réussit) :
   - **En local** : installe la [Stripe CLI](https://docs.stripe.com/stripe-cli), puis lance `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Elle affiche un secret `whsec_…` → `STRIPE_WEBHOOK_SECRET`.
   - **En ligne** : **Developers → Webhooks → Add endpoint**, adresse `https://TON-SITE/api/webhooks/stripe`, événements : `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`. Copie le **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
4. Apple Pay / Google Pay : **Settings → Payment methods**, active-les (ils apparaissent automatiquement quand l'appareil les gère). Pour Apple Pay sur ton domaine, Stripe demande d'enregistrer le domaine dans la même page.

### 2.3 Resend (e-mails)

1. Crée un compte sur <https://resend.com>.
2. **Domains → Add domain** : ajoute ton nom de domaine et copie les enregistrements DNS chez ton registrar (Resend explique lesquels). Sans domaine validé, Resend n'envoie qu'à toi-même.
3. **API Keys → Create** → variable `RESEND_API_KEY`.
4. Dans `config/drop.ts`, mets ton adresse d'expédition dans `contact.emailFrom` (ex. `2TIJEN <commande@ton-domaine.com>`).

### 2.4 Vercel (hébergement)

1. Mets le projet sur GitHub (compte gratuit sur <https://github.com>).
2. Crée un compte sur <https://vercel.com>, **Add New → Project**, choisis le dépôt.
3. Avant de valider, ajoute **toutes** les variables du tableau ci-dessous dans **Environment Variables**.
4. **Deploy**. Ton site est en ligne sur une adresse `.vercel.app`. Pour un vrai nom de domaine : **Settings → Domains**.
5. Mets à jour `NEXT_PUBLIC_SITE_URL` avec l'adresse finale, puis redéploie.

---

## 3. Variables d'environnement

Le modèle est dans `.env.example`. **Ne jamais** committer `.env.local` ni partager ces valeurs.

| Variable | À quoi ça sert |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Adresse du site (liens des e-mails, retour de paiement) |
| `SUPABASE_URL` | Adresse du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète Supabase (serveur uniquement) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (`sk_test_…` puis `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook (`whsec_…`) |
| `RESEND_API_KEY` | Clé Resend |
| `ADMIN_PASSWORD` | Mot de passe de `/admin` (8 caractères minimum, choisis-en un long) |
| `ADMIN_SESSION_SECRET` | Longue chaîne aléatoire (32+ caractères) qui signe la connexion admin |

Aucune clé secrète n'est dans le code ni envoyée au navigateur.

---

## 4. Modifier les règles du drop

**Tout est dans `config/drop.ts`** : dates d'ouverture et de clôture, prix, early bird, pack, stocks par taille, frais d'envoi, seuils de production, liens Instagram/TikTok/WhatsApp, e-mail de contact, tableau des tailles, textes des pièces. Les montants sont en **centimes** (35 € = `3500`). Les dates sont au format `2026-10-12T18:00:00-04:00` (le `-04:00` est l'heure de la Guadeloupe).

Après une modification : `git commit` + `git push` et Vercel republie le site tout seul.

> Si tu changes un **stock total** après le lancement, relance `npm run seed`.

### Valeurs provisoires à remplacer (cherche « PLACEHOLDER » ou `[À COMPLÉTER]`)

- Heures d'ouverture (18 h 00) et de clôture (23 h 59), frais d'envoi métropole (5,90 €), tableau des tailles, e-mail, numéro WhatsApp, liens Instagram et TikTok.
- Textes `[TEXTE À FOURNIR]` : histoire du nom (`app/page.tsx`), description des pièces (`config/drop.ts`).
- Pages légales (`app/cgv`, `app/mentions-legales`, `app/confidentialite`, `app/retours`) : modèles à compléter et **à faire valider par un professionnel** avant la mise en ligne (une bannière le rappelle sur chaque page ; retire-la de `components/LegalLayout.tsx` une fois validées).

---

## 5. Tester en mode test Stripe

Cartes de test (n'importe quelle date future et n'importe quel CVC) :

| Carte | Résultat |
|---|---|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0000 0000 0002` | Paiement refusé |

Un achat réussi doit : créer la commande, décrémenter le stock, attribuer un numéro (ex. 001/050) et envoyer l'e-mail. Vérifie dans `/admin`.

Un paiement refusé ne crée aucune commande. Les pièces sont réservées 15 minutes pendant le paiement, puis libérées automatiquement si personne ne paie.

---

## 6. Espace admin

Adresse : `https://TON-SITE/admin` (mot de passe = `ADMIN_PASSWORD`). Il affiche les commandes, le stock, le seuil de fabrication (45 commandes, 20 par design), le compteur early bird, la liste d'attente, et permet d'exporter les commandes et la liste d'attente en CSV.

**Accès anticipé** : quand tu veux (dans les 24 h avant l'ouverture), clique sur « Envoyer les liens d'accès anticipé ». Chaque inscrit reçoit un lien personnel qui ne fonctionne que pendant ces 24 h.

Si une commande apparaît en **« À REMBOURSER »**, c'est un paiement arrivé trop tard alors que la dernière pièce était vendue : le site tente de rembourser automatiquement ; vérifie dans Stripe.

---

## 7. Passer en mode réel (à ne faire qu'une fois tout testé)

1. Termine l'activation de ton compte Stripe (identité, IBAN).
2. Passe Stripe en **mode réel**, récupère la clé `sk_live_…` et crée un **nouveau webhook** (le secret `whsec_…` est différent du mode test).
3. Dans Vercel, remplace `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`, puis redéploie.
4. Vérifie que le domaine Resend est validé et que les pages légales sont complétées et validées.
5. Fais un vrai achat de quelques euros pour vérifier, puis rembourse-le dans Stripe. Supprime la commande de test (ou remets `sold` à zéro dans Supabase) et relance `npm run seed` si besoin.

---

## 8. Ajouter un drop 2

1. Dans `config/drop.ts`, remplace les `designs` par les nouveaux (avec de **nouveaux `id`**), change `name` (ex. « Drop 2 »), les dates et les prix.
2. Ajoute les images dans `public/products/`.
3. Lance `npm run seed`.
4. Publie. Le compteur early bird, le stock et les seuils de l'admin ne comptent que le drop en cours ; les commandes du drop 1 restent visibles dans la liste et les exports.

---

## 9. Vérifications automatiques

```bash
npm test
```

Vérifie le calcul des prix (early bird, pack), les états par date, et directement sur le schéma SQL : impossible de survendre la dernière pièce, réservations qui expirent, commande idempotente, numéros de pièces, liste d'attente sans doublon.

---

## 10. Choses à savoir

- **Early bird** : les 15 premières pièces (tous designs) ou les 48 premières heures, la première condition atteinte. Le prix est calculé par le serveur au moment de la réservation. Deux pièces en early bird (2 × 32 € = 64 €) coûtent moins que le pack (65 €) : le site applique toujours le prix le plus bas.
- **Seuil de fabrication** : l'admin compte les *commandes payées* (45 au total, 20 par design). Si tu préfères compter des *pièces*, dis-le, c'est un petit changement dans `lib/admin-data.ts`.
- **Réservation** : 15 minutes. Stripe impose 30 minutes minimum pour la page de paiement ; un paiement tardif est accepté si le stock est encore là, sinon remboursé automatiquement.
- **Erreur d'écriture sur le visuel Guadeloupe** : le mockup affiche « GUADLOUPEAN » (sans E). À vérifier avant la production.
- **Images** : les visuels de `public/products/` sont recadrés depuis les mockups fournis. Remplace-les par des photos ou rendus haute définition quand tu les as (même nom de fichier, ou change les chemins dans `config/drop.ts`).
