import { TRUST_PROVIDERS, type LivenessResult, type TrustProvider, type TrustProviderName } from "./types";

const offProvider: TrustProvider = {
  name: "off",
  async checkProfilePhoto() {
    return { ok: true };
  },
  verificationAvailable: false,
  async verifySelfie() {
    throw new Error("Verification is turned off (VERIFICATION=off)");
  },
};

const MOCK_SCORES: Record<string, LivenessResult> = {
  pass: { liveness: 99, similarity: 98 },
  unsure: { liveness: 80, similarity: 88 },
  fail: { liveness: 30, similarity: 40 },
};

/** Behaves like the real service with fixed scores. Never use in production with real users. */
const mockProvider: TrustProvider = {
  name: "mock",
  async checkProfilePhoto() {
    return { ok: true };
  },
  verificationAvailable: true,
  async verifySelfie() {
    const outcome = (process.env.MOCK_VERIFICATION_OUTCOME ?? "pass").trim().toLowerCase();
    return MOCK_SCORES[outcome] ?? MOCK_SCORES.pass;
  },
};

let provider: TrustProvider | null = null;

/** The configured trust provider; an unknown VERIFICATION value falls back to "off" with a warning. */
export function trustProvider(): TrustProvider {
  if (provider) return provider;
  const raw = (process.env.VERIFICATION ?? "mock").trim().toLowerCase();
  if (!TRUST_PROVIDERS.includes(raw as TrustProviderName)) {
    console.warn(`VERIFICATION="${raw}" is not one of ${TRUST_PROVIDERS.join(", ")} — using "off".`);
    provider = offProvider;
  } else {
    provider = raw === "mock" ? mockProvider : offProvider;
  }
  if (provider.name === "mock" && process.env.NODE_ENV === "production") {
    console.warn('VERIFICATION="mock": verification badges are not real. Switch to a real provider before launch.');
  }
  return provider;
}
