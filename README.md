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

Sans compte Supabase, le site s'affiche mais **l'achat est désactivé** (bandeau jaune « Mode démo »).

### Tester un achat tout de suite (sans compte)

```bash
npm run demo
```

Ouvre <http://localhost:3000> : le site est « ouvert » (date simulée au 13 octobre 2026). Choisis une taille, ajoute au panier, clique sur « Payer » : tu arrives sur une **fausse page de paiement** (bandeau jaune « SIMULATION »), puis sur la page « Merci » avec ton numéro de pièce (ex. 001/050). Le stock diminue et les numéros avancent à chaque achat. Rien n'est envoyé à Stripe, aucun e-mail n'est envoyé, et tout est remis à zéro quand tu relances le serveur. Ce mode est **ignoré en production**.

### Tester avec la vraie page Stripe (mode test), sans base de données

Il suffit d'un compte Stripe (partie 2.2) et de sa clé **de test** :

1. Crée `.env.local` (copie de `.env.example`) et remplis seulement `STRIPE_SECRET_KEY=sk_test_…`.
2. Lance `npm run demo`.
3. Achète une pièce : tu arrives sur la **vraie page Stripe** (bandeau « mode test »). Paie avec la carte `4242 4242 4242 4242`, n'importe quelle date future et n'importe quel CVC.
4. Tu reviens sur « Merci » avec ton numéro de pièce. Le paiement apparaît dans Stripe (Developers → mode test → Payments).

Ce raccourci n'utilise pas la base ni le webhook : le site vérifie lui-même auprès de Stripe que le paiement est passé. Il ne fonctionne qu'avec une clé `sk_test_` et est **ignoré en production**.

Pour tester le **parcours complet** (webhook, base Supabase, e-mail, commande dans `/admin`), crée aussi les comptes 2.1 et 2.3 puis suis la partie 5.

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

### 2.5 Stripe Tax (TVA automatique) : facultatif, désactivé par défaut

Le site envoie déjà à Stripe tout ce qu'il faut (prix TTC, code fiscal « Clothing & Footwear » `txcd_30011000`, code « Shipping » `txcd_92010001`, réglables dans `config/drop.ts`), mais **rien n'est activé tant que tu ne mets pas `STRIPE_AUTOMATIC_TAX=1`**. Avant de l'activer :

1. **Demande à ton comptable si tu dois facturer de la TVA.** Une micro-entreprise en franchise en base de TVA n'en facture pas : Stripe Tax est alors inutile. La Guadeloupe a aussi sa propre TVA (différente de la métropole) : je n'ai trouvé aucune mention de la Guadeloupe dans la documentation Stripe Tax, vérifie auprès de Stripe ou de ton comptable que le territoire est géré.
2. Dans Stripe : **Tax → Paramètres**, renseigne l'adresse du siège (sans elle, le statut reste « pending » et aucune taxe n'est calculée).
3. **Tax → Enregistrements** : ajoute chaque zone où tu dois collecter la TVA. **Sans enregistrement actif, Stripe ne calcule et ne perçoit aucune taxe, sans afficher d'erreur.**
4. Fais un achat de test et vérifie sur le paiement (Dashboard) que la ligne « TVA » apparaît avec le bon montant.

Les prix du site restent TTC : la TVA est comprise dans le prix affiché.

### 2.6 Codes de réduction

Les codes se créent **dans Stripe** (mode test d'abord) : **Catalogue de produits → Coupons → Nouveau coupon** (pourcentage ou montant en euros), puis **Ajouter un code promotionnel** (le texte que les clients tapent, par exemple `BIENVENUE10`). Tu peux limiter le nombre d'utilisations, la date de fin ou un montant minimum de commande. Rien à modifier dans le site.

Le client tape son code dans le panier : le site le vérifie auprès de Stripe, affiche la remise, puis Stripe l'applique au paiement. La remise porte sur les pièces (pas sur la livraison). Le code utilisé et le montant de la remise apparaissent dans `/admin` et dans l'export CSV.

Deux codes de test existent dans ton compte Stripe de test : `BIENVENUE10` (-10 %) et `MERCI5` (-5 €). **Si tu avais déjà créé la base Supabase**, relance `supabase/schema.sql` dans le SQL Editor (il ajoute les colonnes du code promo sans rien effacer).

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

**Option B, branchée en direct sur Instagram** : le site peut afficher automatiquement tes dernières publications. Il faut un compte Instagram **professionnel** et un jeton d'accès (Meta for Developers → créer une app → produit « Instagram » → générer un jeton d'accès) à mettre dans la variable `INSTAGRAM_ACCESS_TOKEN`. Le jeton expire au bout de 60 jours : il faut le renouveler (Meta le permet tant qu'il n'est pas expiré). Si le jeton est absent ou expiré, le site retombe sur les photos de l'option A. Cette option n'a pas pu être testée avec un vrai compte : à vérifier à la première mise en place. TikTok n'a pas d'équivalent simple : ses vidéos se relient une à une avec `href`.

## 3. Variables d'environnement

Le modèle est dans `.env.example`. **Ne jamais** committer `.env.local` ni partager ces valeurs.

| Variable | À quoi ça sert |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Adresse du site (liens des e-mails, retour de paiement) |
| `SUPABASE_URL` | Adresse du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète Supabase (serveur uniquement) |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (`sk_test_…` puis `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook (`whsec_…`) |
| `INSTAGRAM_ACCESS_TOKEN` | Facultatif : affiche automatiquement tes dernières publications Instagram dans la galerie (voir 2.7) |
| `STRIPE_AUTOMATIC_TAX` | Facultatif : `1` pour activer Stripe Tax (voir 2.5). Vide = désactivé |
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

- **Early bird** : **désactivé pour l'instant** (`earlyBird.enabled: false` dans `config/drop.ts`) : tout est vendu au prix normal, et rien ne s'affiche sur le site. Pour le réactiver : mettre `true` (les 15 premières pièces ou les 48 premières heures, au prix `prices.earlyBird`). Le calcul reste testé.
- **Codes de réduction** : voir la partie 2.6.
- **Seuil de fabrication** : l'admin compte les *commandes payées* (45 au total, 20 par design). Si tu préfères compter des *pièces*, dis-le, c'est un petit changement dans `lib/admin-data.ts`.
- **Réservation** : 15 minutes. Stripe impose 30 minutes minimum pour la page de paiement ; un paiement tardif est accepté si le stock est encore là, sinon remboursé automatiquement.
- **Erreur d'écriture sur le visuel Guadeloupe** : le mockup affiche « GUADLOUPEAN » (sans E). À vérifier avant la production.
- **Images** : les visuels de `public/products/` sont détourés depuis les mockups fournis (fond transparent, format WebP). Le site est noir : un t-shirt noir se lit grâce au halo de couleur et au léger contour ajoutés par le site. Remplace-les par des photos ou rendus haute définition quand tu les as, **toujours avec un fond transparent** (même nom de fichier, ou change les chemins dans `config/drop.ts`).
- **Panier** : volet latéral (bouton sac dans le header), mémorisé dans le navigateur (il survit à un rechargement, sans compte). Le prix affiché vient toujours du serveur ; le panier est vidé après un paiement réussi. Code : `components/CartProvider.tsx` et `components/CartDrawer.tsx`.
- **Page de confirmation** (`/merci`) : coche animée, confettis, tickets avec numéros de pièces, récapitulatif, prochaines étapes. Si le webhook Stripe n'a pas encore enregistré la commande, la page se recharge toute seule quelques secondes.
- **Face / dos** : sur ordinateur le t-shirt se retourne au survol de la souris ; sur téléphone, un tap le retourne (le bouton ↻ l'indique). Au clavier : Tab puis Entrée.
- **Animations** : volontairement rares. À l'arrivée, chaque lettre de « CARIBBEAN REPRESENT » est un papier découpé dont la forme, la police, la couleur et la bordure changent au hasard en boucle, puis se fixe lettre par lettre sur son style final, **toujours le même**, aux couleurs du t-shirt Guadeloupean Represent. Ce style final se règle dans le tableau `FINAL_STYLES` en haut de `components/Ransom.tsx` (avec les durées et les listes de polices/couleurs du hasard). Le t-shirt se retourne au survol. Tout se coupe (le titre s'affiche directement fini) pour les personnes qui ont activé « réduire les animations ».
- **Madras** : la photo `assets/madras.jpg` donne les fichiers du site. `public/madras.webp` (rouge, Guadeloupean, mot « 2TIJEN » du footer) et `public/madras-martinican.webp` (version bleue). Chaque design choisit sa texture avec le champ `madras` dans `config/drop.ts` (petite pastille sous chaque t-shirt). `public/madras-band.webp` est la bande fine du footer (bande de la photo retournée en miroir pour boucler). Pour une autre couleur : recolore la photo (teinte) et enregistre-la en WebP d'environ 640 px de large.
- **Titre du hero** : le texte « CARIBBEAN REPRESENT » est dans `app/page.tsx` (composant `Ransom`) ; le slogan du site (titre de l'onglet, e-mails, pied de page) est `slogan` dans `config/drop.ts`.
