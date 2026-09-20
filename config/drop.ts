/**
 * CONFIGURATION DU DROP — le seul fichier à modifier pour changer les règles.
 *
 * Tous les montants sont en CENTIMES (35 € = 3500) pour éviter les erreurs
 * d'arrondi. Toutes les dates sont au format ISO avec le fuseau de la
 * Guadeloupe (-04:00, pas d'heure d'été là-bas).
 *
 * Les valeurs marquées « PLACEHOLDER » sont des valeurs provisoires à remplacer.
 */

export const SIZES = ["S", "M", "L", "XL"] as const;
export type Size = (typeof SIZES)[number];

export type DesignConfig = {
  /** Identifiant technique stable (utilisé en base de données). Ne pas changer après le lancement. */
  id: string;
  name: string;
  images: { front: string; back: string };
  /** Texture madras propre au design (fichier de public/). */
  madras: string;
  /** Textes alternatifs (accessibilité). */
  alt: { front: string; back: string };
  /** Stock initial par taille pour ce design. */
  stock: Record<Size, number>;
};

export const drop = {
  brand: "2TIJEN",
  slogan: "Caribbean Represent",
  /** Nom du drop, affiché dans les e-mails et l'admin. */
  name: "Drop 1",

  // --- Fenêtre de préco (heures à confirmer : PLACEHOLDER 18h00 / 23h59) ---
  opensAt: "2026-10-12T18:00:00-04:00",
  closesAt: "2026-10-21T23:59:00-04:00",
  /** Accès anticipé pour la liste d'attente, en heures avant l'ouverture publique. */
  earlyAccessHours: 24,

  // --- Prix (en centimes) ---
  prices: {
    regular: 3500,
    /** Prix « early bird ». */
    earlyBird: 3200,
    /** Prix du pack : 1 pièce de chaque design. */
    pack: 6500,
  },
  earlyBird: {
    /** Désactivé pour l'instant : tout est vendu au prix normal. Mettre true pour le réactiver (prix `prices.earlyBird`). */
    enabled: false as boolean,
    /** Nombre de premières pièces vendues (tous designs confondus) au prix early bird. */
    maxPieces: 15,
    /** …ou durée depuis l'ouverture. La première condition atteinte met fin à l'early bird. */
    durationHours: 48,
  },

  /** Affiche « Plus que N en M » quand il reste N pièces ou moins d'une taille. */
  lowStockThreshold: 5,

  /** Nombre maximum de pièces par commande (limite les achats en masse). */
  maxPiecesPerOrder: 6,

  /** Réservation de stock pendant le paiement, en minutes. */
  reservationMinutes: 15,

  // --- Livraison ---
  shipping: {
    /** Retrait / remise en main propre en Guadeloupe. */
    pickupLabel: "Remise en main propre en Guadeloupe",
    pickupPrice: 0,
    /** Envoi vers la métropole. PLACEHOLDER : frais à confirmer. */
    metropoleLabel: "Envoi en métropole",
    metropolePrice: 590,
    /** Pays acceptés pour l'envoi (codes ISO). */
    metropoleCountries: ["FR"] as string[],
  },
  deliveryDelay: "4 à 6 semaines après la clôture",

  // --- Règle de production (gérée à la main, affichée dans /admin) ---
  production: {
    minOrders: 45,
    minOrdersPerDesign: 20,
  },

  // --- Contact & réseaux (PLACEHOLDERS) ---
  contact: {
    email: "contact@2tijen.example",
    instagram: "https://www.instagram.com/2tijen/",
    tiktok: "https://www.tiktok.com/@2tijen",
    /** Numéro au format international sans + ni espaces. */
    whatsapp: "590690000000",
    /** Adresse d'expédition des e-mails (domaine à valider chez Resend). */
    emailFrom: "2TIJEN <commande@2tijen.example>",
  },

  /**
   * Stripe Tax (désactivé par défaut : variable STRIPE_AUTOMATIC_TAX=1, voir le README).
   * Codes fiscaux pris dans la liste officielle de Stripe (API « Tax Codes ») ; à faire confirmer par le comptable.
   */
  tax: {
    /** « Clothing & Footwear » */
    productCode: "txcd_30011000",
    /** « Shipping » */
    shippingCode: "txcd_92010001",
  },

  /** Tableau des tailles, en cm. PLACEHOLDER : mesures à confirmer avec le fournisseur. */
  sizeGuide: [
    { size: "S", chest: 54, length: 70 },
    { size: "M", chest: 57, length: 72 },
    { size: "L", chest: 60, length: 74 },
    { size: "XL", chest: 63, length: 76 },
  ],

  designs: [
    {
      id: "guadeloupean",
      name: "Guadeloupean Represent",
      madras: "/madras.webp",
      images: {
        front: "/products/guadeloupean-front.webp",
        back: "/products/guadeloupean-back.webp",
      },
      alt: {
        front: "T-shirt oversize noir, petit logo 2T blanc sur la poitrine",
        back: "Dos du t-shirt noir avec « Guadeloupean Represent » en lettres découpées multicolores",
      },
      stock: { S: 8, M: 18, L: 16, XL: 8 },
    },
    {
      id: "martinican",
      name: "Martinican Represent",
      madras: "/madras-martinican.webp",
      images: {
        front: "/products/martinican-front.webp",
        back: "/products/martinican-back.webp",
      },
      alt: {
        front: "T-shirt oversize noir avec petit logo 2T bleu ciel",
        back: "T-shirt noir avec « Martinican Represent » en lettres découpées bleues",
      },
      stock: { S: 8, M: 18, L: 16, XL: 8 },
    },
  ] as DesignConfig[],
} as const;

export type Drop = typeof drop;

/** Nombre total de pièces par design (utilisé pour la numérotation « 012/050 »). */
export function totalPiecesFor(design: DesignConfig): number {
  return SIZES.reduce((sum, s) => sum + design.stock[s], 0);
}

export function getDesign(id: string): DesignConfig | undefined {
  return drop.designs.find((d) => d.id === id);
}
