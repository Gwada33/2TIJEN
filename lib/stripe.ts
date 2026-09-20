import "server-only";
import Stripe from "stripe";
import { requireEnv } from "@/lib/env";

let client: Stripe | null = null;

/** Client Stripe (clé secrète : sk_test_… en test, sk_live_… en réel). */
export function stripe(): Stripe {
  if (!client) {
    // Développement uniquement : STRIPE_API_URL permet de viser un faux serveur Stripe local (tests).
    const mock = process.env.NODE_ENV !== "production" && process.env.STRIPE_API_URL ? new URL(process.env.STRIPE_API_URL) : null;
    client = new Stripe(
      requireEnv("STRIPE_SECRET_KEY"),
      mock ? { host: mock.hostname, port: mock.port, protocol: mock.protocol.replace(":", "") as "http" | "https" } : undefined,
    );
  }
  return client;
}
