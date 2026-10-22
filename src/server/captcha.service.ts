import "server-only";

const DEFAULT_HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";
const HCAPTCHA_TIMEOUT_MS = 3_000;

type HcaptchaFailureReason =
  | "missing_token"
  | "not_configured"
  | "missing_input_secret"
  | "invalid_input_secret"
  | "missing_input_response"
  | "invalid_input_response"
  | "timeout_or_duplicate"
  | "hostname_mismatch"
  | "verification_failed"
  | "unavailable";

type HcaptchaVerificationSuccess = {
  ok: true;
  hostname?: string;
  challengeTs?: string;
};

type HcaptchaVerificationFailure = {
  ok: false;
  reason: HcaptchaFailureReason;
  errors?: string[];
};

export type HcaptchaVerificationResult = HcaptchaVerificationSuccess | HcaptchaVerificationFailure;

type HcaptchaSiteVerifyPayload = {
  success?: unknown;
  hostname?: unknown;
  challenge_ts?: unknown;
  "error-codes"?: unknown;
};

let warnedAboutSkippedHcaptcha = false;

function getVerifyUrl() {
  const configuredUrl = (process.env.HCAPTCHA_VERIFY_URL ?? "").trim();
  return configuredUrl.startsWith("https://") ? configuredUrl : DEFAULT_HCAPTCHA_VERIFY_URL;
}

function readErrorCodes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const errors = value.filter((item): item is string => typeof item === "string" && item.length > 0);
  return errors.length > 0 ? errors : undefined;
}

function getProviderFailureReason(errors: string[] | undefined): HcaptchaFailureReason {
  switch (errors?.[0]) {
    case "missing-input-secret":
      return "missing_input_secret";
    case "invalid-input-secret":
      return "invalid_input_secret";
    case "missing-input-response":
      return "missing_input_response";
    case "invalid-input-response":
      return "invalid_input_response";
    case "expired-input-response":
    case "already-seen-response":
    case "timeout-or-duplicate":
      return "timeout_or_duplicate";
    case "sitekey-secret-mismatch":
    case "hostname-mismatch":
      return "hostname_mismatch";
    default:
      return "verification_failed";
  }
}

function logVerificationFailure(input: {
  tokenPresent: boolean;
  reason: HcaptchaFailureReason;
  payload?: HcaptchaSiteVerifyPayload;
  errors?: string[];
}) {
  console.warn("hcaptcha_verification_failed", {
    tokenPresent: input.tokenPresent,
    success: typeof input.payload?.success === "boolean" ? input.payload.success : undefined,
    hostname: typeof input.payload?.hostname === "string" ? input.payload.hostname : undefined,
    errors: input.errors,
    reason: input.reason,
  });
}

function createFailure(input: {
  tokenPresent: boolean;
  reason: HcaptchaFailureReason;
  payload?: HcaptchaSiteVerifyPayload;
  errors?: string[];
}): HcaptchaVerificationFailure {
  logVerificationFailure(input);
  return {
    ok: false,
    reason: input.reason,
    ...(input.errors ? { errors: input.errors } : {}),
  };
}

export async function verifyHcaptchaToken(
  token: string | undefined,
  remoteIp?: string
): Promise<HcaptchaVerificationResult> {
  const secret = (process.env.HCAPTCHA_SECRET_KEY ?? "").trim();
  const sitekey = (process.env.HCAPTCHA_SITE_KEY ?? "").trim();
  const tokenToVerify = token?.trim();
  const tokenPresent = Boolean(tokenToVerify);

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return createFailure({ tokenPresent, reason: "not_configured" });
    }

    if (!warnedAboutSkippedHcaptcha) {
      warnedAboutSkippedHcaptcha = true;
      console.warn("hcaptcha_verification_skipped", {
        reason: "HCAPTCHA_SECRET_KEY is not configured outside production.",
      });
    }

    return { ok: true };
  }

  if (!tokenToVerify) {
    return createFailure({ tokenPresent, reason: "missing_token" });
  }

  const body = new URLSearchParams({
    secret,
    response: tokenToVerify,
  });
  if (remoteIp) body.set("remoteip", remoteIp);
  if (sitekey) body.set("sitekey", sitekey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HCAPTCHA_TIMEOUT_MS);
    const response = await (async () => {
      try {
        return await fetch(getVerifyUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    })();
    const payload = (await response.json()) as HcaptchaSiteVerifyPayload;
    const errors = readErrorCodes(payload["error-codes"]);

    if (!response.ok || payload.success !== true) {
      return createFailure({
        tokenPresent,
        reason: getProviderFailureReason(errors),
        payload,
        errors,
      });
    }

    const hostname = typeof payload.hostname === "string" ? payload.hostname : undefined;
    const challengeTs = typeof payload.challenge_ts === "string" ? payload.challenge_ts : undefined;

    return {
      ok: true,
      ...(hostname !== undefined ? { hostname } : {}),
      ...(challengeTs !== undefined ? { challengeTs } : {}),
    };
  } catch {
    return createFailure({ tokenPresent, reason: "unavailable" });
  }
}
