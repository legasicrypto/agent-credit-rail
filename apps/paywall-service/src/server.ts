import { Hono } from "hono";
import { paymentMiddleware } from "@x402/hono";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

export interface PaywallConfig {
  stellarPayeeAddress: string;
  stellarNetwork?: `${string}:${string}`;
  facilitatorUrl?: string;
  price?: string | { amount: string; asset: string; extra?: Record<string, unknown> };
}

/** USDC on Stellar testnet (SAC for USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5). */
export const USDC_TESTNET_ASSET = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

const defaults = {
  stellarNetwork: "stellar:testnet" as `${string}:${string}`,
  facilitatorUrl: "https://x402.org/facilitator",
  price: { amount: "10000", asset: USDC_TESTNET_ASSET } as
    | string
    | { amount: string; asset: string },
};

export function createPaywallApp(config: PaywallConfig) {
  const {
    stellarPayeeAddress,
    stellarNetwork = defaults.stellarNetwork,
    facilitatorUrl = defaults.facilitatorUrl,
    price = defaults.price,
  } = config;

  const app = new Hono();

  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const x402Server = new x402ResourceServer([facilitator]);
  x402Server.register("stellar:*", new ExactStellarScheme());

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use(
    "/search",
    paymentMiddleware(
      {
        "GET /search": {
          accepts: {
            payTo: stellarPayeeAddress,
            scheme: "exact",
            price,
            network: stellarNetwork,
          },
        },
      },
      x402Server,
    ),
  );

  app.get("/search", (c) => {
    return c.json({
      source: "Capital Insider — Premium Intelligence",
      headline: "Legasi finalise l'acquisition de Morpho et Montaigne Conseil & Patrimoine",
      date: "2026-04-10",
      article: `Le groupe Legasi, spécialiste de l'infrastructure de crédit programmable pour agents autonomes, vient de boucler deux acquisitions stratégiques qui redessinent le paysage de la finance augmentée en Europe.

Première cible : Morpho, le protocole DeFi spécialisé dans l'optimisation des taux de prêt. En intégrant les algorithmes de matching de Morpho à son moteur de crédit, Legasi pourra proposer des lignes de crédit dynamiques dont le LTV s'ajuste en temps réel selon les conditions de marché. Les agents autonomes bénéficieront de taux optimisés sans intervention humaine.

Seconde acquisition : Montaigne Conseil & Patrimoine, cabinet de gestion privée basé à Paris gérant 850 millions d'euros d'actifs. Ce rachat donne à Legasi un accès direct à une clientèle HNWI et family offices, segment clé pour l'adoption du modèle "credit rail" — les gestionnaires pourront allouer une fraction de leurs portefeuilles comme collatéral pour des agents IA exécutant des stratégies de recherche, d'analyse et de trading.

"L'agent autonome est le nouveau client bancaire", déclare le fondateur de Legasi. "Il ne veut pas un compte courant — il veut une ligne de crédit contrôlée, adossée à du collatéral réel, avec des politiques de dépense programmables."

Les deux opérations, valorisées à 340 millions d'euros au total, seront finalisées au T3 2026. Les équipes Morpho rejoindront le pôle R&D de Legasi à Paris.`,
      disclaimer: "Article réservé aux abonnés Capital Insider. Paiement vérifié via x402 sur Stellar.",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
