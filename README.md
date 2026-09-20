# Site de précommande 2TIJEN

Site one-page (mobile d'abord) pour le premier drop 2TIJEN : 2 designs de t-shirts oversize, 50 pièces par design, numérotées.

**Stack** : Next.js (App Router) + TypeScript + Tailwind, hébergé sur Vercel · paiement SumUp (page de paiement hébergée) · base Supabase (PostgreSQL) · e-mails Resend.

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

Sans compte Supabase, le site s'affiche mais **l'achat est désactivé** (bandeau jaune « Mode démo »).

### Tester un achat tout de suite (sans compte)

```bash
npm run demo
```

Ouvre <http://localhost:3000> : le site est « ouvert » (date simulée au 13 octobre 2026). Choisis une taille, ajoute au panier, clique sur « Payer » : tu arrives sur une **fausse page de paiement** (bandeau jaune « SIMULATION »), puis sur la page « Merci » avec ton numéro de pièce (ex. 001/050). Le stock diminue et les numéros avancent à chaque achat. Rien n'est envoyé à SumUp, aucun e-mail n'est envoyé, et tout est remis à zéro quand tu relances le serveur. Ce mode est **ignoré en production**.

Ce mode simule aussi le paiement : il n'utilise ni SumUp ni la base. Pour tester la **vraie** page de paiement SumUp, le webhook, la base Supabase, l'e-mail et `/admin`, crée les comptes 2.1, 2.2 et 2.3 puis suis la partie 5.

### Voir les autres états du site

Dans `.env.local`, ajoute :

```
DEMO_NO_DB=1
NOW_OVERRIDE=2026-10-13T10:00:00-04:00
```

(`npm run demo` fait déjà ces deux réglages pour toi.)

- `DEMO_NO_DB=1` : utilise le stock de la config au lieu de la base, et simule le paiement.
- `NOW_OVERRIDE` : simule une date. Essaie `2026-10-01T12:00:00-04:00` (avant), `2026-10-12T00:00:00-04:00` (24 h avant : accès anticipé), `2026-10-13T10:00:00-04:00` (ouvert, early bird), `2026-10-15T12:00:00-04:00` (ouvert, plein tarif), `2026-10-22T12:00:00-04:00` (clos).
- Pour tester l'accès anticipé en démo : ajoute `?acces=` suivi de 64 fois la lettre `a` à l'adresse.

Ces deux réglages sont **ignorés en production** : personne ne peut les utiliser pour tricher.

---

## 2. Créer les comptes

### 2.1 Supabase (base de données)

1. Crée un compte sur <https://supabase.com>, puis **New project** (choisis une région proche, par exemple Europe).
2. Menu **SQL Editor** → **New query** → colle **tout** le contenu de `supabase/schema.sql` → **Run**. (Base déjà créée avec l'ancien paiement Stripe ? Les colonnes ont changé : supprime les tables du projet de test et relance ce fichier, puis `npm run seed`.)
3. Menu **Project Settings → API** : copie
   - **Project URL** → variable `SUPABASE_URL`
   - **service_role key** → variable `SUPABASE_SERVICE_ROLE_KEY` (**secrète**, ne la partage jamais).
4. Remplis `.env.local`, puis crée les designs et les stocks :
   ```bash
   npm run seed
   ```
   Tu peux relancer cette commande sans risque : elle ne touche jamais aux ventes déjà enregistrées.

### 2.2 SumUp (paiement)

Le site utilise la **page de paiement hébergée de SumUp** : cartes bancaires, Apple Pay et Google Pay. SumUp ne demande ni e-mail ni adresse à ton client : le site les demande lui-même dans le panier (étape « Tes coordonnées ») et les garde avec la commande.

1. Utilise ton compte SumUp (celui de tes terminaux) et vérifie que le **paiement en ligne** est disponible sur ce compte (sinon, contacte SumUp).
2. Sur <https://developer.sumup.com>, crée une **clé API** (« API keys ») → `SUMUP_API_KEY`.
3. Ton **code marchand** (format `MH4H92C7`, visible dans ton profil SumUp ou dans la page des clés API) → `SUMUP_MERCHANT_CODE`.
4. Le site prévient SumUp de son adresse de notification à chaque paiement : rien à configurer dans SumUp. **Elle doit être publique** : en local, SumUp ne peut pas l'appeler, mais ce n'est pas grave : la page « Merci » demande elle-même à SumUp si le paiement est passé.
5. Les notifications de SumUp ne sont pas signées : le site ne s'y fie pas et redemande toujours l'état du paiement à SumUp avant de créer une commande.
6. Apple Pay : il apparaît automatiquement sur la page SumUp quand l'appareil le gère. Vérifie-le avec un vrai achat de quelques euros (partie 7).

**Ce qui change par rapport à un paiement « clé en main »** : pas de calcul de TVA automatique (les prix sont TTC, à valider avec ton comptable), pas de gestion de codes promo côté SumUp (ils sont dans `config/drop.ts`, partie 2.6).

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

### 2.5 TVA

Les prix du site sont **TTC** et le site ne calcule pas de TVA. Demande à ton comptable si tu dois en facturer (une micro-entreprise en franchise en base n'en facture pas ; la Guadeloupe a sa propre TVA), et ce qui doit figurer sur les factures.

### 2.6 Codes de réduction

Les codes sont dans `config/drop.ts`, liste `promoCodes` (vide au départ). Exemple :

```ts
promoCodes: [
  { code: "BIENVENUE", label: "−10 %", percentOff: 10 },
  { code: "MERCI5", amountOff: 500, minSubtotal: 6000, expiresAt: "2026-10-21T23:59:00-04:00" },
],
```

`percentOff` (pourcentage) **ou** `amountOff` (centimes) ; `minSubtotal` et `expiresAt` sont facultatifs. Le client tape son code dans le panier ; le serveur le vérifie et calcule la remise, qui porte sur les pièces (pas sur la livraison). Il n'y a **pas de limite d'utilisations** : un code reste valable jusqu'à sa date d'expiration (mets-en une). Le code utilisé et le montant de la remise apparaissent dans `/admin` et dans l'export CSV.

### 2.7 Galerie « porté » (photos de shooting)

La section « Porté » affiche tes photos de shooting, avec les boutons Instagram et TikTok. **Tant que tu n'as pas fourni de photos, elle affiche des tuiles « Photo shooting à venir » aux couleurs des madras.**

**Option A, la plus simple (recommandée pour commencer)** : mets tes photos dans `public/shooting/` (JPG ou WebP, format portrait ou carré, 1200 px de large suffisent), puis liste-les dans `config/drop.ts`, champ `gallery` :

```ts
gallery: [
  { src: "/shooting/01.jpg", alt: "Look Guadeloupean porté à Pointe-à-Pitre", href: "https://www.instagram.com/p/XXXX/" },
  { src: "/shooting/02.jpg", alt: "Look Martinican, plage", ratio: "1/1" },
],
```

Chaque photo mène à la publication (`href`), ou à ta page Instagram si tu n'en mets pas. `ratio` règle la forme de la tuile (`"4/5"` par défaut).

**Photos d'une pièce précise** : quand on clique sur un t-shirt, on arrive sur sa page (`/pieces/guadeloupean`, `/pieces/martinican`) avec face, dos et photos portées. Ces photos-là se listent dans le champ `photos` de **chaque design** dans `config/drop.ts` (même format que ci-dessus). Sans photo fournie, deux tuiles provisoires s'affichent. Sur l'accueil, la galerie « Porté » utilise `gallery`, ou à défaut les photos de toutes les pièces.

**Option B, branchée en direct sur Instagram** : le site peut afficher automatiquement tes dernières publications. Il faut un compte Instagram **professionnel** et un jeton d'accès (Meta for Developers → créer une app → produit « Instagram » → générer un jeton d'accès) à mettre dans la variable `INSTAGRAM_ACCESS_TOKEN`. Le jeton expire au bout de 60 jours : il faut le renouveler (Meta le permet tant qu'il n'est pas expiré). Si le jeton est absent ou expiré, le site retombe sur les photos de l'option A. Cette option n'a pas pu être testée avec un vrai compte : à vérifier à la première mise en place. TikTok n'a pas d'équivalent simple : ses vidéos se relient une à une avec `href`.

## 3. Variables d'environnement

Le modèle est dans `.env.example`. **Ne jamais** committer `.env.local` ni partager ces valeurs.

| Variable | À quoi ça sert |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Adresse du site (liens des e-mails, retour de paiement) |
| `SUPABASE_URL` | Adresse du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète Supabase (serveur uniquement) |
| `SUMUP_API_KEY` | Clé API SumUp (secrète, serveur uniquement) |
| `SUMUP_MERCHANT_CODE` | Code marchand SumUp (ex. `MH4H92C7`) |
| `INSTAGRAM_ACCESS_TOKEN` | Facultatif : affiche automatiquement tes dernières publications Instagram dans la galerie (voir 2.7) |
| `RESEND_API_KEY` | Clé Resend |
| `ADMIN_PASSWORD` | Mot de passe de `/admin` (8 caractères minimum, choisis-en un long) |
| `ADMIN_SESSION_SECRET` | Longue chaîne aléatoire (32+ caractères) qui signe la connexion admin |

Aucune clé secrète n'est dans le code ni envoyée au navigateur.

---

## 4. Modifier les règles du drop

**Tout est dans `config/drop.ts`** : dates d'ouverture et de clôture, prix, early bird, pack, stocks par taille, frais d'envoi, seuils de production, liens Instagram/TikTok/WhatsApp, e-mail de contact, tableau des tailles, noms et images des pièces. Les montants sont en **centimes** (35 € = `3500`). Les dates sont au format `2026-10-12T18:00:00-04:00` (le `-04:00` est l'heure de la Guadeloupe).

Après une modification : `git commit` + `git push` et Vercel republie le site tout seul.

> Si tu changes un **stock total** après le lancement, relance `npm run seed`.

### Valeurs provisoires à remplacer (cherche « PLACEHOLDER » ou `[À COMPLÉTER]`)

- Heures d'ouverture (18 h 00) et de clôture (23 h 59), frais d'envoi métropole (5,90 €), tableau des tailles, e-mail, numéro WhatsApp, liens Instagram et TikTok.
- Texte `[TEXTE À FOURNIR]` : histoire du nom (`app/page.tsx`).
- Pages légales (`app/cgv`, `app/mentions-legales`, `app/confidentialite`, `app/retours`) : modèles à compléter et **à faire valider par un professionnel** avant la mise en ligne (une bannière le rappelle sur chaque page ; retire-la de `components/LegalLayout.tsx` une fois validées).

---

## 5. Tester un vrai paiement SumUp

SumUp propose des comptes de test (« sandbox ») dans son espace développeur : voir <https://developer.sumup.com>. Utilise ceux-ci avec leurs cartes de test, ou fais un achat réel de quelques euros et rembourse-le dans l'application SumUp. **Je n'ai pas pu tester le paiement SumUp de bout en bout (pas de compte à ma disposition) : fais-le avant d'ouvrir la vente.**

Un achat réussi doit : créer la commande, décrémenter le stock, attribuer un numéro (ex. 001/050) et envoyer l'e-mail. Vérifie dans `/admin`.

Un paiement refusé ne crée aucune commande. Les pièces sont réservées 15 minutes pendant le paiement, puis libérées automatiquement si personne ne paie.

---

## 6. Espace admin

Adresse : `https://TON-SITE/admin` (mot de passe = `ADMIN_PASSWORD`). Il affiche les commandes, le stock, le seuil de fabrication (45 commandes, 20 par design), le compteur early bird, la liste d'attente, et permet d'exporter les commandes et la liste d'attente en CSV.

**Accès anticipé** : quand tu veux (dans les 24 h avant l'ouverture), clique sur « Envoyer les liens d'accès anticipé ». Chaque inscrit reçoit un lien personnel qui ne fonctionne que pendant ces 24 h.

Si une commande apparaît en **« À REMBOURSER »**, c'est un paiement arrivé trop tard alors que la dernière pièce était vendue : le site tente de rembourser automatiquement ; vérifie dans SumUp (le remboursement se fait dans l'application SumUp ou le tableau de bord).

---

## 7. Passer en mode réel (à ne faire qu'une fois tout testé)

1. Renseigne `SUMUP_API_KEY` et `SUMUP_MERCHANT_CODE` (compte réel) dans Vercel, puis redéploie.
2. Vérifie que `NEXT_PUBLIC_SITE_URL` est l'adresse publique du site (elle sert au retour de paiement et aux notifications).
3. Vérifie que le domaine Resend est validé et que les pages légales sont complétées et validées.
4. Fais un vrai achat de quelques euros (essaie Apple Pay), puis rembourse-le dans SumUp. Supprime la commande de test (ou remets `sold` à zéro dans Supabase) et relance `npm run seed` si besoin.

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

- **Early bird** : **désactivé pour l'instant** (`earlyBird.enabled: false` dans `config/drop.ts`) : tout est vendu au prix normal, et rien ne s'affiche sur le site. Pour le réactiver : mettre `true` (les 15 premières pièces ou les 48 premières heures, au prix `prices.earlyBird`). Le calcul reste testé.
- **Codes de réduction** : voir la partie 2.6.
- **Seuil de fabrication** : l'admin compte les *commandes payées* (45 au total, 20 par design). Si tu préfères compter des *pièces*, dis-le, c'est un petit changement dans `lib/admin-data.ts`.
- **Réservation** : 15 minutes. la page de paiement SumUp expire au bout de 15 minutes aussi ; un paiement tardif est accepté si le stock est encore là, sinon remboursé.
- **Erreur d'écriture sur le visuel Guadeloupe** : le mockup affiche « GUADLOUPEAN » (sans E). À vérifier avant la production.
- **Images** : les visuels de `public/products/` sont détourés depuis les mockups fournis (fond transparent, format WebP). Le site est noir : un t-shirt noir se lit grâce au halo de couleur et au léger contour ajoutés par le site. Remplace-les par des photos ou rendus haute définition quand tu les as, **toujours avec un fond transparent** (même nom de fichier, ou change les chemins dans `config/drop.ts`).
- **Panier** : volet latéral (bouton sac dans le header), mémorisé dans le navigateur (il survit à un rechargement, sans compte). Le prix affiché vient toujours du serveur ; le panier est vidé après un paiement réussi. Code : `components/CartProvider.tsx` et `components/CartDrawer.tsx`.
- **Page de confirmation** (`/merci`) : coche animée, confettis, tickets avec numéros de pièces, récapitulatif, prochaines étapes. Si SumUp n'a pas encore enregistré la commande, la page se recharge toute seule quelques secondes.
- **Face / dos** : sur ordinateur le t-shirt se retourne au survol ; sur téléphone ou au clavier, le bouton ↻ le retourne. Un clic (ou tap) sur le t-shirt ouvre sa page produit.
- **Animations** : volontairement rares. À l'arrivée, chaque lettre de « CARIBBEAN REPRESENT » est un papier découpé dont la forme, la police, la couleur et la bordure changent au hasard en boucle, puis se fixe lettre par lettre sur son style final, **toujours le même**, aux couleurs du t-shirt Guadeloupean Represent. Ce style final se règle dans le tableau `FINAL_STYLES` en haut de `components/Ransom.tsx` (avec les durées et les listes de polices/couleurs du hasard). Le t-shirt se retourne au survol. Tout se coupe (le titre s'affiche directement fini) pour les personnes qui ont activé « réduire les animations ».
- **Madras** : la photo `assets/madras.jpg` donne les fichiers du site. `public/madras.webp` (rouge, Guadeloupean, mot « 2TIJEN » du footer) et `public/madras-martinican.webp` (version bleue). Chaque design choisit sa texture avec le champ `madras` dans `config/drop.ts` (petite pastille sous chaque t-shirt). `public/madras-band.webp` est la bande fine du footer (bande de la photo retournée en miroir pour boucler). Pour une autre couleur : recolore la photo (teinte) et enregistre-la en WebP d'environ 640 px de large.
- **Titre du hero** : le texte « CARIBBEAN REPRESENT » est dans `app/page.tsx` (composant `Ransom`) ; le slogan du site (titre de l'onglet, e-mails, pied de page) est `slogan` dans `config/drop.ts`.
