/**
 * Automatic trust checks, chosen with the VERIFICATION env var:
 *
 * - "off":  profile photos are only checked for being a real image; selfie
 *           verification is unavailable.
 * - "mock": a stand-in for the real service, so the whole flow (camera,
 *           retries, badge) can be built and tested without an AWS account.
 *           MOCK_VERIFICATION_OUTCOME=pass | fail | unsure picks the result.
 *           The default when VERIFICATION isn't set.
 *
 * Planned: "aws" — Amazon Rekognition: DetectFaces + DetectModerationLabels
 * for photos, Face Liveness + CompareFaces for verification.
 *
 * No provider is ever asked to guess gender: gender stays self-declared.
 */
export const TRUST_PROVIDERS = ["off", "mock"] as const;
export type TrustProviderName = (typeof TRUST_PROVIDERS)[number];

export type PhotoCheck = { ok: true } | { ok: false; reason: string };

/** Scores from a live selfie check, each 0–100. */
export interface LivenessResult {
  /** How sure the service is that a real, live person was in front of the camera. */
  liveness: number;
  /** How closely the live face matches the profile photo. */
  similarity: number;
}

export interface TrustProvider {
  name: TrustProviderName;
  /** Profile photo rules: exactly one clear face, no nudity or violence, doesn't look under 18. */
  checkProfilePhoto(image: Buffer): Promise<PhotoCheck>;
  /** Whether selfie verification can run at all. */
  verificationAvailable: boolean;
  /** Runs the live selfie check against the user's current profile photo. */
  verifySelfie(profilePhoto: Buffer): Promise<LivenessResult>;
}

/**
 * Industry-style thresholds: clear passes are verified automatically, clear
 * fails are rejected, and the unsure middle asks the user to retry (better
 * light, face the camera). Nobody reviews selfies by hand.
 */
export const VERIFY_THRESHOLDS = {
  pass: { liveness: 90, similarity: 95 },
  fail: { liveness: 50, similarity: 70 },
} as const;

export type VerificationDecision = "verified" | "rejected" | "retry";

export function decide({ liveness, similarity }: LivenessResult): VerificationDecision {
  if (liveness >= VERIFY_THRESHOLDS.pass.liveness && similarity >= VERIFY_THRESHOLDS.pass.similarity) return "verified";
  if (liveness < VERIFY_THRESHOLDS.fail.liveness || similarity < VERIFY_THRESHOLDS.fail.similarity) return "rejected";
  return "retry";
}
