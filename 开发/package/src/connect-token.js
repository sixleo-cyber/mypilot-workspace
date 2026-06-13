import crypto from "node:crypto";

const LINK_TOKEN_ISSUER = "clawpilot-server";
const LINK_TOKEN_AUDIENCE = "clawpilot-link";
const APP_CONNECT_TOKEN_TYPE = "clawpilot_link_app_connect";

export class LinkConnectTokenVerificationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "LinkConnectTokenVerificationError";
    this.code = normalizeNonEmptyString(options.code) ?? "invalid";
  }
}

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function base64UrlToBuffer(value) {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    throw new LinkConnectTokenVerificationError("Link token is malformed.", {
      code: "invalid",
    });
  }
  const padded = normalized.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(`${padded}${"=".repeat(padLength)}`, "base64");
}

function decodeBase64UrlJson(value) {
  try {
    return JSON.parse(base64UrlToBuffer(value).toString("utf8"));
  } catch {
    throw new LinkConnectTokenVerificationError("Link token is malformed.", {
      code: "invalid",
    });
  }
}

function signHs256(signingInput, secret) {
  return crypto.createHmac("sha256", secret).update(signingInput).digest("base64url");
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyLinkAppConnectTokenLocally(params) {
  const token = normalizeNonEmptyString(params?.token);
  const linkId = normalizeNonEmptyString(params?.linkId);
  const secret = normalizeNonEmptyString(params?.secret);
  const nowMs =
    typeof params?.nowMs === "number" && Number.isFinite(params.nowMs)
      ? params.nowMs
      : Date.now();

  if (!token || !linkId || !secret) {
    throw new LinkConnectTokenVerificationError("Link token is unavailable.", {
      code: "missing",
    });
  }

  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new LinkConnectTokenVerificationError("Link token is malformed.", {
      code: "invalid",
    });
  }

  const [encodedHeader, encodedPayload, signature] = segments;
  const header = decodeBase64UrlJson(encodedHeader);
  const payload = decodeBase64UrlJson(encodedPayload);
  if (header?.alg !== "HS256" || header?.typ !== "JWT") {
    throw new LinkConnectTokenVerificationError("Link token is malformed.", {
      code: "invalid",
    });
  }

  const expectedSignature = signHs256(`${encodedHeader}.${encodedPayload}`, secret);
  if (!constantTimeEqual(signature, expectedSignature)) {
    throw new LinkConnectTokenVerificationError("Link token is invalid.", {
      code: "invalid",
    });
  }

  const tokenType = normalizeNonEmptyString(payload?.token_type);
  const issuer = normalizeNonEmptyString(payload?.iss);
  const audience = normalizeNonEmptyString(payload?.aud);
  const payloadLinkId = normalizeNonEmptyString(payload?.link_id);
  const gatewayClientId = normalizeNonEmptyString(payload?.gateway_client_id);
  const expiresAtSeconds = Number(payload?.exp);
  const appUserId = Number.parseInt(String(payload?.sub ?? ""), 10);

  if (
    tokenType !== APP_CONNECT_TOKEN_TYPE ||
    issuer !== LINK_TOKEN_ISSUER ||
    audience !== LINK_TOKEN_AUDIENCE ||
    payloadLinkId !== linkId ||
    !Number.isInteger(appUserId) ||
    appUserId <= 0 ||
    !Number.isFinite(expiresAtSeconds) ||
    expiresAtSeconds * 1000 <= nowMs
  ) {
    throw new LinkConnectTokenVerificationError(
      "Link token has expired or is invalid.",
      {
        code: "expired",
      },
    );
  }

  return {
    appUserId,
    gatewayClientId,
    expiresAtMs: expiresAtSeconds * 1000,
  };
}
