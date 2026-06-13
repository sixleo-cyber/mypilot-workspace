import crypto from "node:crypto";
import fsp from "node:fs/promises";
import nacl from "tweetnacl";
import { ensureRuntimeLayout, runtimePaths } from "./runtime.js";

const DEVICE_IDENTITY_VERSION = 1;
const DEVICE_AUTH_PAYLOAD_VERSION = "v3";

function bytesToBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlToBytes(value) {
  return new Uint8Array(Buffer.from(String(value ?? ""), "base64url"));
}

function normalizeDeviceMetadataForAuth(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/[A-Z]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 32),
  );
}

function buildGatewayDeviceAuthPayload(params) {
  const scopes = params.scopes.join(",");
  const token = params.token ?? "";
  return [
    DEVICE_AUTH_PAYLOAD_VERSION,
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
    params.nonce,
    normalizeDeviceMetadataForAuth(params.platform),
    normalizeDeviceMetadataForAuth(params.deviceFamily),
  ].join("|");
}

async function writeDeviceIdentityFile(identity) {
  await ensureRuntimeLayout();
  const tempPath = `${runtimePaths.deviceIdentityFile}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tempPath, `${JSON.stringify(identity, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await fsp.rename(tempPath, runtimePaths.deviceIdentityFile);
  await fsp.chmod(runtimePaths.deviceIdentityFile, 0o600).catch(() => undefined);
}

function deriveDeviceId(publicKeyBytes) {
  return crypto.createHash("sha256").update(Buffer.from(publicKeyBytes)).digest("hex");
}

function isValidIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  if (
    value.version !== DEVICE_IDENTITY_VERSION ||
    typeof value.deviceId !== "string" ||
    typeof value.publicKey !== "string" ||
    typeof value.secretKey !== "string" ||
    typeof value.createdAtMs !== "number"
  ) {
    return false;
  }

  const publicKeyBytes = base64UrlToBytes(value.publicKey);
  const secretKeyBytes = base64UrlToBytes(value.secretKey);
  return publicKeyBytes.length === 32 && secretKeyBytes.length === 64;
}

async function createDeviceIdentity() {
  const keyPair = nacl.sign.keyPair();
  return {
    version: DEVICE_IDENTITY_VERSION,
    deviceId: deriveDeviceId(keyPair.publicKey),
    publicKey: bytesToBase64Url(keyPair.publicKey),
    secretKey: bytesToBase64Url(keyPair.secretKey),
    createdAtMs: Date.now(),
  };
}

export async function loadOrCreateDeviceIdentity() {
  await ensureRuntimeLayout();
  try {
    const raw = await fsp.readFile(runtimePaths.deviceIdentityFile, "utf8");
    const parsed = JSON.parse(raw);
    if (isValidIdentity(parsed)) {
      const publicKeyBytes = base64UrlToBytes(parsed.publicKey);
      const normalized = {
        version: DEVICE_IDENTITY_VERSION,
        deviceId: deriveDeviceId(publicKeyBytes),
        publicKey: parsed.publicKey,
        secretKey: parsed.secretKey,
        createdAtMs: parsed.createdAtMs,
      };
      if (normalized.deviceId !== parsed.deviceId) {
        await writeDeviceIdentityFile(normalized);
      }
      return normalized;
    }
  } catch (error) {
    if (!error || typeof error !== "object" || error.code !== "ENOENT") {
      // Ignore malformed identity files and replace them below.
    }
  }

  const created = await createDeviceIdentity();
  await writeDeviceIdentityFile(created);
  return created;
}

export async function buildSignedGatewayDeviceIdentity(params) {
  const identity = await loadOrCreateDeviceIdentity();
  const secretKeyBytes = base64UrlToBytes(identity.secretKey);
  const signedAtMs = Date.now();
  const payload = buildGatewayDeviceAuthPayload({
    deviceId: identity.deviceId,
    clientId: params.clientId,
    clientMode: params.clientMode,
    role: params.role,
    scopes: params.scopes,
    signedAtMs,
    token: params.token,
    nonce: params.nonce,
    platform: params.platform,
    deviceFamily: params.deviceFamily,
  });
  const signature = nacl.sign.detached(Buffer.from(payload, "utf8"), secretKeyBytes);

  return {
    id: identity.deviceId,
    publicKey: identity.publicKey,
    signature: bytesToBase64Url(signature),
    signedAt: signedAtMs,
    nonce: params.nonce,
  };
}
