import crypto from "node:crypto";
import dns from "node:dns";
import fsp from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import WebSocket, { WebSocketServer } from "ws";
import {
  buildStoppedStatePatch,
  clearCredentials,
  loadConfig,
  loadCredentials,
  loadState,
  logger,
  normalizeHttpsBaseUrl,
  normalizeNonEmptyString,
  parseTimestamp,
  patchState,
  readLinkLogSnapshot,
  runtimePaths,
  saveCredentials,
} from "./runtime.js";
import { disableAutostart } from "./autostart.js";
import {
  buildLocalGatewayRequestHeaders,
  detectOpenClawBackend,
  installSkill,
  writeBackendCache,
} from "./openclaw.js";
import { buildSignedGatewayDeviceIdentity } from "./device-identity.js";
import { inspectLanIpv4AddressDiscovery, LINK_DIRECT_PORT } from "./network.js";
import {
  createAccessToken,
  ServerApiError,
  updateLinkStatus,
} from "./server-api.js";
import { createTranslator, resolveLanguage } from "./i18n.js";
import {
  LINK_PACKAGE_NAME,
  LINK_VERSION,
  LINK_FLAVOR,
  OPENCLAW_GATEWAY_MAX_PROTOCOL_VERSION,
  OPENCLAW_GATEWAY_MIN_PROTOCOL_VERSION,
} from "./constants.js";
import {
  buildLinkClientCapabilities,
  buildUnsupportedVersionMessage,
  isUnsupportedLinkVersionClose,
  resolveVersionPolicy,
  shouldReuseAccessToken,
  shouldStopForVersionPolicy,
} from "./version-support.js";
import {
  LinkConnectTokenVerificationError,
  verifyLinkAppConnectTokenLocally,
} from "./connect-token.js";

const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 60_000;
const BACKEND_PROBE_INTERVAL_MS = 30_000;
const RELAY_RECONNECT_BASE_DELAY_MS = 3_000;
const RELAY_RECONNECT_MAX_DELAY_MS = 60_000;
const RELAY_PING_INTERVAL_MS = 25_000;
const RELAY_PONG_TIMEOUT_MS = 20_000;
const RELAY_RECONNECT_STORM_WINDOW_MS = 5 * 60_000;
const RELAY_RECONNECT_STORM_THRESHOLD = 8;
const RELAY_RECONNECT_COOLDOWN_MS = 3 * 60_000;
const RELAY_STABLE_CONNECTION_RESET_MS = 2 * 60_000;
const PUBLIC_DIRECT_AUTH_CACHE_TTL_MS = 60_000;
const PUBLIC_DIRECT_AUTH_MIN_VALID_MS = 5_000;
const PUBLIC_DIRECT_OBSERVE_TIMEOUT_MS = 5_000;
const LOCAL_CONNECT_TIMEOUT_MS = 8_000;
const LOCAL_APP_CONNECT_TIMEOUT_MS = 6_000;
const LOCAL_GATEWAY_CLIENT_ID = "gateway-client";
const LOCAL_GATEWAY_CLIENT_PLATFORM = "node";
const LOCAL_GATEWAY_ROLE = "operator";
const LOCAL_GATEWAY_SCOPES = ["operator.admin"];
const LOCAL_GATEWAY_CAPS = ["tool-events"];
const RELAY_BINARY_FRAME_HTTP_REQUEST_BODY = 1;
const RELAY_BINARY_FRAME_HTTP_RESPONSE_CHUNK = 2;
const execFileAsync = promisify(execFile);

const daemonLogger = logger("daemon");
const relaySocketCloseMetadata = new WeakMap();

const LINK_REFRESH_TOKEN_TERMINAL_ERROR_CODES = new Set([
  "LINK_REFRESH_TOKEN_INVALID",
  "LINK_REFRESH_TOKEN_REVOKED",
  "LINK_REFRESH_TOKEN_EXPIRED",
  "LINK_REVOKED",
]);

function buildRelayControlUrl(relayBaseUrl) {
  const parsed = new URL(relayBaseUrl.replace(/\/+$/, ""));
  parsed.protocol = "wss:";
  parsed.pathname = "/link/connect";
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function getCurrentCliPath() {
  return fileURLToPath(new URL("./cli.js", import.meta.url));
}

function resolveDaemonCliScriptCandidates() {
  const scriptPath = fileURLToPath(new URL("./cli.js", import.meta.url));
  return [scriptPath].map((candidate) => path.resolve(candidate));
}

async function getProcessCommand(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return null;
  }

  if (process.platform === "win32") {
    try {
      const { stdout } = await execFileAsync(
        "powershell",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object -ExpandProperty CommandLine)`,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
        },
      );
      return typeof stdout === "string" && stdout.trim() ? stdout.trim() : null;
    } catch {
      return null;
    }
  }

  try {
    const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
    });
    return typeof stdout === "string" && stdout.trim() ? stdout.trim() : null;
  } catch {
    return null;
  }
}

function looksLikeCurrentLinkDaemonCommand(command) {
  if (typeof command !== "string" || !command.trim()) {
    return false;
  }

  const scriptCandidates = resolveDaemonCliScriptCandidates();
  return command.includes(" daemon") && scriptCandidates.some((candidate) => command.includes(candidate));
}

function buildRelayPublicRouteObserveUrl(relayBaseUrl, family) {
  const parsed = new URL(relayBaseUrl.replace(/\/+$/, ""));
  parsed.protocol = "https:";
  parsed.pathname = "/link/public-route/observe";
  parsed.search = "";
  parsed.hash = "";
  if (family === 4 || family === 6) {
    parsed.searchParams.set("family", String(family));
  }
  return parsed;
}

function normalizePublicDirectHost(value) {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  return normalized.replace(/^\[|\]$/g, "");
}

function detectPublicDirectFamily(host) {
  const normalized = normalizePublicDirectHost(host);
  if (!normalized) {
    return null;
  }
  return normalized.includes(":") ? 6 : 4;
}

function normalizeLanIpv4Hosts(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim())
    .sort((left, right) => left.localeCompare(right));
}

function areStringListsEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function buildPublicDirectRouteCandidate(hostValue, portValue, observedAtValue) {
  const host = normalizePublicDirectHost(hostValue);
  if (!host) {
    return null;
  }

  return {
    host,
    port:
      typeof portValue === "number" && Number.isInteger(portValue) && portValue > 0
        ? portValue
        : LINK_DIRECT_PORT,
    observedAt:
      typeof observedAtValue === "string" && observedAtValue.trim()
        ? observedAtValue.trim()
        : null,
  };
}

function pickPreferredPublicDirectRoute(routes) {
  if (!routes || typeof routes !== "object") {
    return null;
  }
  return routes.ipv4 ?? routes.ipv6 ?? null;
}

function buildPublicDirectRoutesFromState(publicDirect) {
  const current =
    publicDirect && typeof publicDirect === "object" && !Array.isArray(publicDirect)
      ? publicDirect
      : {};
  let ipv4 = buildPublicDirectRouteCandidate(
    current.ipv4Host,
    current.port,
    current.ipv4ObservedAt,
  );
  let ipv6 = buildPublicDirectRouteCandidate(
    current.ipv6Host,
    current.port,
    current.ipv6ObservedAt,
  );

  if (!ipv4 && !ipv6) {
    return null;
  }

  return {
    ipv4,
    ipv6,
  };
}

function buildNextPublicDirectState(currentPublicDirect, patch = {}) {
  const current =
    currentPublicDirect && typeof currentPublicDirect === "object" && !Array.isArray(currentPublicDirect)
      ? currentPublicDirect
      : {};
  const baseRoutes = buildPublicDirectRoutesFromState(current);
  const nextPort =
    typeof patch.port === "number" && Number.isInteger(patch.port) && patch.port > 0
      ? patch.port
      : typeof current.port === "number" && Number.isInteger(current.port) && current.port > 0
        ? current.port
        : LINK_DIRECT_PORT;
  let nextIpv4 = baseRoutes?.ipv4
    ? buildPublicDirectRouteCandidate(baseRoutes.ipv4.host, nextPort, baseRoutes.ipv4.observedAt)
    : null;
  let nextIpv6 = baseRoutes?.ipv6
    ? buildPublicDirectRouteCandidate(baseRoutes.ipv6.host, nextPort, baseRoutes.ipv6.observedAt)
    : null;

  if (Object.prototype.hasOwnProperty.call(patch, "ipv4Host")) {
    nextIpv4 = buildPublicDirectRouteCandidate(
      patch.ipv4Host,
      nextPort,
      patch.ipv4ObservedAt ?? current.ipv4ObservedAt,
    );
  } else if (Object.prototype.hasOwnProperty.call(patch, "ipv4ObservedAt") && nextIpv4) {
    nextIpv4 = buildPublicDirectRouteCandidate(nextIpv4.host, nextPort, patch.ipv4ObservedAt);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "ipv6Host")) {
    nextIpv6 = buildPublicDirectRouteCandidate(
      patch.ipv6Host,
      nextPort,
      patch.ipv6ObservedAt ?? current.ipv6ObservedAt,
    );
  } else if (Object.prototype.hasOwnProperty.call(patch, "ipv6ObservedAt") && nextIpv6) {
    nextIpv6 = buildPublicDirectRouteCandidate(nextIpv6.host, nextPort, patch.ipv6ObservedAt);
  }

  const preferredRoute = pickPreferredPublicDirectRoute({
    ipv4: nextIpv4,
    ipv6: nextIpv6,
  });
  const hasCandidate = Boolean(nextIpv4 || nextIpv6);

  return {
    ...(current ?? {}),
    status:
      typeof patch.status === "string"
        ? patch.status
        : hasCandidate
          ? "candidate"
          : typeof current.status === "string"
            ? current.status
            : "unknown",
    port: nextPort,
    ipv4Host: nextIpv4?.host ?? null,
    ipv4ObservedAt: nextIpv4?.observedAt ?? null,
    ipv6Host: nextIpv6?.host ?? null,
    ipv6ObservedAt: nextIpv6?.observedAt ?? null,
    reason:
      Object.prototype.hasOwnProperty.call(patch, "reason")
        ? patch.reason ?? null
        : hasCandidate
          ? null
          : current.reason ?? null,
    message:
      Object.prototype.hasOwnProperty.call(patch, "message")
        ? patch.message ?? null
        : hasCandidate
          ? null
          : current.message ?? null,
    checkedAt:
      typeof patch.checkedAt === "string" && patch.checkedAt.trim()
        ? patch.checkedAt.trim()
        : new Date().toISOString(),
  };
}

function requestRelayPublicRouteObservation({ relayBaseUrl, accessToken, family }) {
  const url = buildRelayPublicRouteObserveUrl(relayBaseUrl, family);

  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
        family,
        lookup(hostname, options, callback) {
          dns.lookup(
            hostname,
            {
              ...options,
              family,
              all: false,
            },
            callback,
          );
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let payload = null;
          if (raw) {
            try {
              payload = JSON.parse(raw);
            } catch {
              payload = null;
            }
          }

          if ((response.statusCode ?? 0) >= 400) {
            const message =
              payload &&
              typeof payload === "object" &&
              payload.error &&
              typeof payload.error === "object" &&
              typeof payload.error.message === "string"
                ? payload.error.message
                : `Relay observation failed with HTTP ${response.statusCode ?? 500}`;
            reject(new Error(message));
            return;
          }

          const observedHost = normalizePublicDirectHost(payload?.observedHost);
          if (!observedHost) {
            resolve(null);
            return;
          }

          resolve({
            family:
              payload?.observedFamily === 4 || payload?.observedFamily === 6
                ? payload.observedFamily
                : family,
            host: observedHost,
            port: LINK_DIRECT_PORT,
            observedAt:
              typeof payload?.observedAt === "string" && payload.observedAt.trim()
                ? payload.observedAt.trim()
                : new Date().toISOString(),
          });
        });
      },
    );

    request.setTimeout(PUBLIC_DIRECT_OBSERVE_TIMEOUT_MS, () => {
      request.destroy(new Error(`Public route observation timed out (${family})`));
    });
    request.on("error", reject);
    request.end();
  });
}

function toBase64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = String(value ?? "").replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;
  return Buffer.from(normalized + (remainder === 0 ? "" : "=".repeat(4 - remainder)), "base64");
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildFrame(type, payload = {}) {
  return JSON.stringify({
    v: 1,
    type,
    payload,
  });
}

function buildRelayBinaryFrame(kind, requestId, payload) {
  const requestIdBytes = Buffer.from(String(requestId ?? ""), "utf8");
  const payloadBuffer = Buffer.isBuffer(payload)
    ? payload
    : payload instanceof Uint8Array
      ? Buffer.from(payload)
      : payload instanceof ArrayBuffer
        ? Buffer.from(payload)
        : ArrayBuffer.isView(payload)
          ? Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength)
          : Buffer.alloc(0);
  const header = Buffer.allocUnsafe(3);
  header[0] = kind;
  header.writeUInt16BE(requestIdBytes.byteLength, 1);
  return Buffer.concat([header, requestIdBytes, payloadBuffer]);
}

function parseRelayBinaryFrame(rawData) {
  if (typeof rawData === "string") {
    return null;
  }
  const buffer = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);
  if (buffer.byteLength < 3) {
    return null;
  }
  const requestIdLength = buffer.readUInt16BE(1);
  if (buffer.byteLength < 3 + requestIdLength) {
    return null;
  }
  return {
    kind: buffer[0],
    requestId: buffer.subarray(3, 3 + requestIdLength).toString("utf8"),
    payload: buffer.subarray(3 + requestIdLength),
  };
}

function createRequestId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createNonce(byteLength = 16) {
  return crypto.randomBytes(byteLength)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sanitizeCloseCode(code, fallback = 1011) {
  if (typeof code !== "number" || !Number.isInteger(code)) {
    return fallback;
  }
  if (code >= 1000 && code <= 4999) {
    return code;
  }
  return fallback;
}

function normalizeRelayCloseReason(reason) {
  if (typeof reason === "string" && reason.trim()) {
    return reason.trim();
  }
  if (Buffer.isBuffer(reason) && reason.byteLength > 0) {
    return reason.toString("utf8").trim() || null;
  }
  return null;
}

function normalizeNodeErrorCode(error) {
  return error && typeof error === "object" && typeof error.code === "string"
    ? error.code.trim()
    : null;
}

function normalizeRemoteAddress(value) {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }
  if (normalized === "::1") {
    return "127.0.0.1";
  }
  if (normalized.startsWith("::ffff:")) {
    return normalized.slice(7);
  }
  return normalized.replace(/^\[|\]$/g, "").replace(/%.+$/, "");
}

function isPrivateOrLoopbackAddress(value) {
  const normalized = normalizeRemoteAddress(value);
  if (!normalized) {
    return false;
  }
  const family = net.isIP(normalized);
  if (family === 4) {
    if (normalized.startsWith("10.")) {
      return true;
    }
    if (normalized.startsWith("127.")) {
      return true;
    }
    if (normalized.startsWith("192.168.")) {
      return true;
    }
    const match = normalized.match(/^172\.(\d{1,3})\./);
    if (match) {
      const secondOctet = Number.parseInt(match[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }
    if (normalized.startsWith("169.254.")) {
      return true;
    }
    return false;
  }
  if (family === 6) {
    const lowered = normalized.toLowerCase();
    return (
      lowered === "::1" ||
      lowered.startsWith("fc") ||
      lowered.startsWith("fd") ||
      lowered.startsWith("fe8") ||
      lowered.startsWith("fe9") ||
      lowered.startsWith("fea") ||
      lowered.startsWith("feb")
    );
  }
  return false;
}

function buildGatewayError(message, code = "gateway_error") {
  return {
    code,
    message: normalizeNonEmptyString(message) ?? "Request failed",
  };
}

function isTerminalLinkRefreshTokenError(error) {
  return (
    error instanceof ServerApiError &&
    (error.status === 401 || error.status === 403 || error.status === 410) &&
    LINK_REFRESH_TOKEN_TERMINAL_ERROR_CODES.has(error.errorCode ?? "")
  );
}

function isUnsupportedLinkVersionError(error) {
  return error instanceof ServerApiError && error.errorCode === "LINK_VERSION_UNSUPPORTED";
}

function isRelayCredentialBlockedState(value) {
  return value === "revoked" || value === "upgrade_required";
}

function resolveBackendRuntimeErrorMessage(backend, currentMessage = null) {
  if (!backend?.detected || !backend?.healthy || !backend?.supported) {
    return normalizeNonEmptyString(backend?.message) ?? currentMessage;
  }
  return currentMessage;
}

function parseGatewayFrame(raw) {
  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  return parsed;
}

function normalizeRequestPath(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    return "/";
  }

  try {
    const parsed = new URL(rawUrl, "http://clawpilot-link.local");
    const pathname = parsed.pathname || "/";
    const search = parsed.search || "";
    return `${pathname}${search}` || "/";
  } catch {
    return "/";
  }
}

function isLinkLogsRequestPath(requestPath) {
  return typeof requestPath === "string" && requestPath.startsWith("/link/logs");
}

function parseLinkLogRequestOptions(rawUrl) {
  const parsedUrl = new URL(
    typeof rawUrl === "string" && rawUrl.trim()
      ? rawUrl
      : "/link/logs",
    "http://clawpilot-link.local",
  );
  const source =
    normalizeNonEmptyString(parsedUrl.searchParams.get("file")) ??
    normalizeNonEmptyString(parsedUrl.searchParams.get("source")) ??
    "current.log";
  const limit = Number.parseInt(parsedUrl.searchParams.get("limit") ?? "", 10) || 100;
  return {
    source,
    limit,
  };
}

function collectIncomingRequestHeaders(headers) {
  const result = {};
  for (const [rawName, rawValue] of Object.entries(headers ?? {})) {
    const name = String(rawName ?? "").trim().toLowerCase();
    if (!name) {
      continue;
    }
    if (
      name === "host" ||
      name === "connection" ||
      name === "upgrade" ||
      name === "authorization" ||
      name === "content-length" ||
      name === "transfer-encoding"
    ) {
      continue;
    }

    const value = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue;
    if (typeof value !== "string" || !value.trim()) {
      continue;
    }
    result[name] = value;
  }
  return result;
}

function extractBearerToken(headerValue) {
  if (typeof headerValue !== "string") {
    return null;
  }
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return normalizeNonEmptyString(match?.[1]);
}

async function readIncomingRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk, "utf8"));
      continue;
    }
    chunks.push(Buffer.from(chunk));
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : null;
}

function collectResponseHeaders(headers) {
  const result = {};
  for (const [name, value] of headers.entries()) {
    if (!name || !value) {
      continue;
    }
    result[name] = value;
  }
  return result;
}

async function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error && typeof error === "object" && error.code === "EPERM");
  }
}

async function readDaemonLockFile() {
  try {
    const raw = await fsp.readFile(runtimePaths.daemonLockFile, "utf8");
    const parsed = safeJsonParse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function acquireDaemonProcessLock() {
  while (true) {
    try {
      const handle = await fsp.open(runtimePaths.daemonLockFile, "wx");
      await handle.writeFile(
        JSON.stringify({
          pid: process.pid,
          startedAt: new Date().toISOString(),
          purpose: "clawpilot-link-daemon",
          scriptPath: fileURLToPath(new URL("./cli.js", import.meta.url)),
        }),
        "utf8",
      );
      return handle;
    } catch (error) {
      if (!error || typeof error !== "object" || error.code !== "EEXIST") {
        throw error;
      }

      const lockSnapshot = await readDaemonLockFile().catch(() => null);
      const lockedPid = Number.isInteger(lockSnapshot?.pid) ? lockSnapshot.pid : null;
      if (await isProcessAlive(lockedPid)) {
        const command = await getProcessCommand(lockedPid);
        if (command === null || looksLikeCurrentLinkDaemonCommand(command)) {
          throw new Error("daemon_lock_active");
        }
      }

      await fsp.unlink(runtimePaths.daemonLockFile).catch(() => undefined);
    }
  }
}

async function releaseDaemonProcessLock(handle) {
  if (handle) {
    await handle.close().catch(() => undefined);
  }
  await fsp.unlink(runtimePaths.daemonLockFile).catch(() => undefined);
}

function sanitizeHelloPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      type: "hello-ok",
    };
  }

  const nextPayload = {
    ...payload,
  };
  if (payload.auth && typeof payload.auth === "object") {
    const nextAuth = {
      ...payload.auth,
    };
    delete nextAuth.deviceToken;
    delete nextAuth.deviceTokens;
    nextPayload.auth = nextAuth;
  }
  return nextPayload;
}

export async function isDaemonRunning() {
  try {
    await sendIpcRequest("status.get", {});
    return true;
  } catch {
    return false;
  }
}

export function spawnBackgroundDaemon() {
  const cliPath = fileURLToPath(new URL("./cli.js", import.meta.url));
  const child = spawn(process.execPath, [cliPath, "daemon"], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      CLAWLINK_DAEMON: "1",
    },
  });
  child.unref();
}

export async function waitForDaemonReady(timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await sendIpcRequest("status.get", {}, 500);
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  return false;
}

export async function sendIpcRequest(method, params = {}, timeoutMs = 4_000) {
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection(runtimePaths.socketFile);
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let settled = false;
    let buffer = "";

    const finish = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      socket.destroy();
      callback(value);
    };

    const timeoutId = setTimeout(() => {
      finish(reject, new Error("ipc_timeout"));
    }, timeoutMs);

    socket.on("connect", () => {
      socket.write(`${JSON.stringify({ id: requestId, method, params })}\n`);
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) {
          const parsed = safeJsonParse(line);
          if (parsed?.id === requestId) {
            if (parsed.ok) {
              finish(resolve, parsed.result);
            } else {
              finish(reject, new Error(parsed.error?.message ?? "ipc_error"));
            }
            return;
          }
        }
        newlineIndex = buffer.indexOf("\n");
      }
    });

    socket.on("error", (error) => {
      finish(reject, error);
    });
  });
}

export class LinkDaemon {
  constructor(config, state, credentials) {
    this.config = config;
    this.state = state;
    this.credentials = credentials;
    this.language = resolveLanguage(config.language);
    this.t = createTranslator(this.language);
    this.server = null;
    this.localGatewayServer = null;
    this.localGatewayWsServer = null;
    this.relaySocket = null;
    this.relayConnected = false;
    this.relayConnecting = false;
    this.backendProbeTimer = null;
    this.relayPingTimer = null;
    this.relayPongTimeoutTimer = null;
    this.relayAwaitingPong = false;
    this.relayReconnectTimer = null;
    this.relayReconnectAttempts = 0;
    this.relayConnectedAtMs = null;
    this.relayDisconnectHistory = [];
    this.relayCooldownUntilMs = Math.max(parseTimestamp(state?.relay?.cooldownUntil), 0);
    this.relayNextReconnectAtMs = Math.max(parseTimestamp(state?.relay?.nextReconnectAt), 0);
    this.relayCredentialState = "ready";
    this.stopped = false;
    this.daemonLockHandle = null;
    this.gatewaySessions = new Map();
    this.localAppSockets = new Map();
    this.pendingRelayHttpRequests = new Map();
    this.publicConnectAuthCache = new Map();
    this.lastLanIpv4DiscoveryLogSignature = null;
  }

  async resolveLanDirectAddresses(source) {
    const discovery = inspectLanIpv4AddressDiscovery();
    const signature = JSON.stringify(discovery);
    if (signature !== this.lastLanIpv4DiscoveryLogSignature) {
      this.lastLanIpv4DiscoveryLogSignature = signature;
      const payload = {
        source,
        addresses: discovery.addresses,
        trace: discovery.trace,
      };
      if (discovery.addresses.length > 0) {
        await daemonLogger.info("lan_ipv4_discovery", payload);
      } else {
        await daemonLogger.warn("lan_ipv4_discovery", payload);
      }
    }

    const nextAddresses = normalizeLanIpv4Hosts(discovery.addresses);
    const currentAddresses = normalizeLanIpv4Hosts(this.state?.directAccess?.lanIpv4Hosts);
    if (
      !areStringListsEqual(currentAddresses, nextAddresses) ||
      !normalizeNonEmptyString(this.state?.directAccess?.lanIpv4CheckedAt)
    ) {
      try {
        this.state = await patchState({
          directAccess: {
            lanIpv4Hosts: nextAddresses,
            lanIpv4CheckedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        await daemonLogger.warn("lan_ipv4_state_update_failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return nextAddresses;
  }

  async start() {
    const relayBaseUrl = normalizeHttpsBaseUrl(this.config.relayBaseUrl);
    if (!relayBaseUrl) {
      throw new Error(this.t.t("relayConfigInsecure", {
        configFile: runtimePaths.configFile,
      }));
    }
    this.config = {
      ...this.config,
      relayBaseUrl,
    };

    this.daemonLockHandle = await acquireDaemonProcessLock();

    try {
      await daemonLogger.info("daemon_starting", { pid: process.pid });
      await this.refreshBackendState();
      await installSkill(this.language, this.config);
      await this.openIpcServer();
      await patchState({
        daemon: {
          pid: process.pid,
          startedAt: new Date().toISOString(),
          lastLaunchError: null,
          lastLaunchFailedAt: null,
        },
      });
      await this.openLocalGatewayServer();
      this.startBackendProbeLoop();
      await this.ensureRelayConnection();
    } catch (error) {
      await releaseDaemonProcessLock(this.daemonLockHandle);
      this.daemonLockHandle = null;
      throw error;
    }
  }

  async stop() {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    clearInterval(this.backendProbeTimer);
    clearInterval(this.relayPingTimer);
    clearTimeout(this.relayPongTimeoutTimer);
    clearTimeout(this.relayReconnectTimer);

    for (const appSocketState of this.localAppSockets.values()) {
      clearTimeout(appSocketState.authTimer);
      try {
        appSocketState.socket.close();
      } catch {
        // Ignore close failures.
      }
    }
    this.localAppSockets.clear();

    for (const gatewaySession of this.gatewaySessions.values()) {
      clearTimeout(gatewaySession.connectTimer);
      try {
        gatewaySession.socket.close();
      } catch {
        // Ignore local socket close failures.
      }
    }
    this.gatewaySessions.clear();
    this.pendingRelayHttpRequests.clear();

    if (this.relaySocket) {
      try {
        this.relaySocket.close();
      } catch {
        // Ignore close failures.
      }
      this.relaySocket = null;
    }

    if (this.localGatewayWsServer) {
      await new Promise((resolve) => this.localGatewayWsServer.close(() => resolve()));
      this.localGatewayWsServer = null;
    }

    if (this.localGatewayServer) {
      await new Promise((resolve) => this.localGatewayServer.close(() => resolve()));
      this.localGatewayServer = null;
    }

    if (this.server) {
      await new Promise((resolve) => this.server.close(() => resolve()));
      this.server = null;
    }

    if (process.platform !== "win32") {
      try {
        await import("node:fs/promises").then(({ unlink }) => unlink(runtimePaths.socketFile));
      } catch {
        // Ignore stale socket cleanup failures.
      }
    }

    this.state = await patchState((current) =>
      buildStoppedStatePatch(current, {
        hasLinkId: Boolean(this.credentials.linkId),
      }),
    );

    await releaseDaemonProcessLock(this.daemonLockHandle);
    this.daemonLockHandle = null;

    process.exit(0);
  }

  startBackendProbeLoop() {
    this.backendProbeTimer = setInterval(() => {
      void this.ensureInstallStillAvailable().then(async (stillInstalled) => {
        if (!stillInstalled) {
          return;
        }
        await this.refreshBackendState();
        await this.openLocalGatewayServer();
        await this.ensureRelayConnection();
      });
    }, BACKEND_PROBE_INTERVAL_MS);
  }

  async ensureInstallStillAvailable() {
    if (this.stopped) {
      return false;
    }

    try {
      await fsp.access(getCurrentCliPath());
      return true;
    } catch {
      await daemonLogger.warn("install_path_missing", {
        cliPath: getCurrentCliPath(),
      });
      await disableAutostart().catch(() => undefined);
      await this.stop();
      return false;
    }
  }

  async refreshBackendState() {
    const backend = await detectOpenClawBackend(this.config);
    await writeBackendCache(backend);
    this.state = await patchState((current) => ({
      backend,
      connectionStatus: this.resolveConnectionStatus({
        relayConnected: this.relayConnected,
        relayConnecting: this.relayConnecting,
        backend,
      }),
      lastErrorMessage: resolveBackendRuntimeErrorMessage(backend, current.lastErrorMessage),
    }));
    await daemonLogger.info("backend_probe", {
      detected: backend.detected,
      healthy: backend.healthy,
      supported: backend.supported,
      message: backend.message,
      port: backend.port,
    });

    if (!backend.detected || !backend.healthy || !backend.supported) {
      await this.updatePublicDirectState({
        status: "unavailable",
        reason: "backend_unavailable",
        message: backend.message ?? this.t.t("backendMissing"),
        checkedAt: new Date().toISOString(),
      });
      await this.reportStatus(
        this.resolveConnectionStatus({
          relayConnected: this.relayConnected,
          relayConnecting: this.relayConnecting,
          backend,
        }),
        this.state.lastErrorMessage,
      );
      return;
    }

    await this.reportStatus(
      this.resolveConnectionStatus({
        relayConnected: this.relayConnected,
        relayConnecting: this.relayConnecting,
        backend,
      }),
      this.state.lastErrorMessage,
    );

  }

  resolveConnectionStatus(params = {}) {
    const backend = params.backend ?? this.state.backend;
    if (params.forceRevoked || this.relayCredentialState === "revoked") {
      return "revoked";
    }
    if (this.relayCredentialState === "upgrade_required") {
      return "degraded";
    }
    if (!this.credentials.linkId) {
      return this.state.pairingSession ? "pairing" : "new";
    }
    if (!backend.detected) {
      return "backend_missing";
    }
    if (!backend.supported || !backend.healthy) {
      return "degraded";
    }
    if (params.relayConnected || this.relayConnected) {
      return "connected";
    }
    if (params.relayConnecting || this.relayConnecting) {
      return "connecting";
    }
    return "paired";
  }

  pruneRelayDisconnectHistory(now = Date.now()) {
    this.relayDisconnectHistory = this.relayDisconnectHistory.filter(
      (timestampMs) =>
        Number.isFinite(timestampMs) &&
        timestampMs > 0 &&
        now - timestampMs <= RELAY_RECONNECT_STORM_WINDOW_MS,
    );
    return this.relayDisconnectHistory;
  }

  resetRelayReconnectGuard() {
    this.relayDisconnectHistory = [];
    this.relayCooldownUntilMs = 0;
    this.relayNextReconnectAtMs = 0;
  }

  buildRelayReconnectCooldownMessage(waitMs, recentDisconnectCount) {
    return this.t.t("relayReconnectCoolingDown", {
      waitSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
      reconnectCount: Math.max(1, recentDisconnectCount),
    });
  }

  async updateRelayDiagnostics(patch = {}) {
    this.state = await patchState({
      relay: patch,
    });
    return this.state.relay;
  }

  async ensureAccessToken(force = false) {
    if (isRelayCredentialBlockedState(this.relayCredentialState)) {
      return null;
    }

    if (!normalizeNonEmptyString(this.credentials.refreshToken)) {
      return null;
    }

    if (
      !force &&
      shouldReuseAccessToken({
        accessToken: this.credentials.accessToken,
        accessTokenExpiresAt: this.credentials.accessTokenExpiresAt,
        accessTokenClientVersion: this.credentials.accessTokenClientVersion,
        currentClientVersion: LINK_VERSION,
        refreshThresholdMs: ACCESS_TOKEN_REFRESH_THRESHOLD_MS,
      })
    ) {
      return this.credentials.accessToken;
    }

    try {
      const response = await createAccessToken({
        apiBaseUrl: this.config.apiBaseUrl,
        refreshToken: this.credentials.refreshToken,
        clientVersion: LINK_VERSION,
        clientCapabilities: buildLinkClientCapabilities(),
      });
      const versionPolicy = resolveVersionPolicy(response);
      if (shouldStopForVersionPolicy(versionPolicy)) {
        await this.handleUpgradeRequired(
          buildUnsupportedVersionMessage(
            versionPolicy,
            "npm i -g @clawpilot-app/link@latest && clawlink restart",
          ),
        );
        return null;
      }
      this.relayCredentialState = "ready";
      this.credentials = {
        ...this.credentials,
        linkId: response.link?.linkId ?? this.credentials.linkId,
        accessToken: response.accessToken?.token ?? null,
        accessTokenExpiresAt: response.accessToken?.expiresAt ?? null,
        accessTokenClientVersion: LINK_VERSION,
        connectTokenSecret:
          normalizeNonEmptyString(response.connectTokenVerifier?.secret) ??
          this.credentials.connectTokenSecret ??
          null,
      };
      await saveCredentials(this.credentials);
      this.state = await patchState({
        linkId: this.credentials.linkId,
      });
      return this.credentials.accessToken;
    } catch (error) {
      if (isUnsupportedLinkVersionError(error)) {
        await this.handleUpgradeRequired(
          buildUnsupportedVersionMessage(
            resolveVersionPolicy(error),
            "npm i -g @clawpilot-app/link@latest && clawlink restart",
          ),
          error,
        );
        return null;
      }
      if (isTerminalLinkRefreshTokenError(error)) {
        const terminalMessage =
          error.errorCode === "LINK_REVOKED"
            ? this.t.t("linkRevoked")
            : this.t.t("linkCredentialsExpired");
        await this.handleRevokedCredentials(terminalMessage, error);
      }
      throw error;
    }
  }

  async handleUpgradeRequired(message, error = null) {
    this.relayCredentialState = "upgrade_required";
    clearInterval(this.relayPingTimer);
    this.relayPingTimer = null;
    clearTimeout(this.relayPongTimeoutTimer);
    this.relayPongTimeoutTimer = null;
    this.relayAwaitingPong = false;
    clearTimeout(this.relayReconnectTimer);
    this.relayReconnectTimer = null;
    this.relayConnected = false;
    this.relayConnecting = false;
    this.relayReconnectAttempts = 0;
    this.relayConnectedAtMs = null;
    this.resetRelayReconnectGuard();
    this.publicConnectAuthCache.clear();

    if (this.relaySocket) {
      try {
        this.relaySocket.close();
      } catch {
        // Ignore close failures.
      }
      this.relaySocket = null;
    }

    await this.closeGatewaySessionsByRouteKind("relay", "Link version unsupported");
    await this.closeGatewaySessionsByRouteKind("public", "Link version unsupported");
    await this.closeGatewaySessionsByRouteKind("lan", "Link version unsupported");
    for (const appSocketState of this.localAppSockets.values()) {
      clearTimeout(appSocketState.authTimer);
      try {
        appSocketState.socket.close(1008, "Link version unsupported");
      } catch {
        // Ignore close failures.
      }
    }
    this.localAppSockets.clear();

    this.credentials = {
      ...this.credentials,
      accessToken: null,
      accessTokenExpiresAt: null,
      accessTokenClientVersion: null,
      connectTokenSecret: null,
    };
    await saveCredentials(this.credentials);
    this.state = await patchState({
      connectionStatus: "degraded",
      lastErrorMessage: message,
      relay: {
        recentDisconnectCount: 0,
        reconnectWindowStartedAt: null,
        nextReconnectAt: null,
        cooldownUntil: null,
      },
      daemon: {
        connectedAt: null,
      },
    });
    await daemonLogger.warn("link_version_unsupported", {
      errorCode: error instanceof ServerApiError ? error.errorCode ?? null : null,
      message,
    });
  }

  async handleRevokedCredentials(message, error = null) {
    this.relayCredentialState = "revoked";
    clearInterval(this.relayPingTimer);
    this.relayPingTimer = null;
    clearTimeout(this.relayPongTimeoutTimer);
    this.relayPongTimeoutTimer = null;
    this.relayAwaitingPong = false;
    clearTimeout(this.relayReconnectTimer);
    this.relayReconnectTimer = null;
    this.relayConnected = false;
    this.relayConnecting = false;
    this.relayReconnectAttempts = 0;
    this.relayConnectedAtMs = null;
    this.resetRelayReconnectGuard();
    this.publicConnectAuthCache.clear();

    if (this.relaySocket) {
      try {
        this.relaySocket.close();
      } catch {
        // Ignore close failures.
      }
      this.relaySocket = null;
    }

    await this.closeGatewaySessionsByRouteKind("relay", "Relay credentials revoked");
    await this.closeGatewaySessionsByRouteKind("public", "Link access revoked");
    for (const appSocketState of this.localAppSockets.values()) {
      clearTimeout(appSocketState.authTimer);
      try {
        appSocketState.socket.close(1008, "Link access revoked");
      } catch {
        // Ignore close failures.
      }
    }
    this.localAppSockets.clear();

    this.credentials = {
      ...this.credentials,
      accessToken: null,
      accessTokenExpiresAt: null,
      accessTokenClientVersion: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      connectTokenSecret: null,
    };
    await saveCredentials(this.credentials);
    this.state = await patchState({
      connectionStatus: "revoked",
      lastErrorMessage: message,
      publicDirect: {
        status: "unavailable",
        port: LINK_DIRECT_PORT,
        ipv4Host: null,
        ipv4ObservedAt: null,
        ipv6Host: null,
        ipv6ObservedAt: null,
        reason: "revoked",
        message,
        checkedAt: new Date().toISOString(),
      },
      relay: {
        recentDisconnectCount: 0,
        reconnectWindowStartedAt: null,
        nextReconnectAt: null,
        cooldownUntil: null,
      },
      daemon: {
        connectedAt: null,
      },
    });
    await daemonLogger.warn("relay_credentials_revoked", {
      errorCode: error instanceof ServerApiError ? error.errorCode ?? null : null,
      message,
    });
  }

  async reportStatus(connectionStatus, lastErrorMessage = null, options = {}) {
    const now = new Date().toISOString();
    const relayPatch =
      options.relay && typeof options.relay === "object" && !Array.isArray(options.relay)
        ? options.relay
        : null;
    this.state = await patchState((current) => ({
      connectionStatus,
      lastErrorMessage,
      daemon: {
        connectedAt:
          connectionStatus === "connected"
            ? current.daemon.connectedAt ?? now
            : current.daemon.connectedAt,
        lastHeartbeatAt: now,
      },
      relay: relayPatch ?? undefined,
    }));

    if (isRelayCredentialBlockedState(this.relayCredentialState)) {
      return;
    }

    try {
      const accessToken = await this.ensureAccessToken();
      if (!normalizeNonEmptyString(accessToken)) {
        return;
      }
      const lanDirectAddresses = await this.resolveLanDirectAddresses("status_report");
      await updateLinkStatus({
        apiBaseUrl: this.config.apiBaseUrl,
        accessToken,
        connectionStatus,
        backendUrl: this.state.backend.httpBaseUrl,
        lastErrorMessage,
        lanDirectAddresses,
        publicDirectRoutes: this.buildPublicDirectRoutesPayload(),
      });
    } catch (error) {
      await daemonLogger.warn("status_report_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  buildPublicDirectRoutesPayload() {
    const routes = buildPublicDirectRoutesFromState(this.state.publicDirect);
    if (!routes) {
      return null;
    }
    return {
      ipv4: routes.ipv4
        ? {
            host: routes.ipv4.host,
            port: routes.ipv4.port,
            observedAt: routes.ipv4.observedAt ?? undefined,
          }
        : null,
      ipv6: routes.ipv6
        ? {
            host: routes.ipv6.host,
            port: routes.ipv6.port,
            observedAt: routes.ipv6.observedAt ?? undefined,
          }
        : null,
    };
  }

  async updatePublicDirectState(nextPublicDirect) {
    this.state = await patchState((current) => ({
      publicDirect: buildNextPublicDirectState(current.publicDirect, {
        ...(nextPublicDirect ?? {}),
        checkedAt: new Date().toISOString(),
      }),
    }));
    return this.state.publicDirect;
  }

  async applyObservedPublicDirectRoute(route) {
    const host = normalizePublicDirectHost(route?.host);
    if (!host) {
      return this.state.publicDirect;
    }

    const observedAt =
      typeof route?.observedAt === "string" && route.observedAt.trim()
        ? route.observedAt.trim()
        : new Date().toISOString();
    const family = detectPublicDirectFamily(host);

    return await this.updatePublicDirectState({
      status: "candidate",
      port:
        typeof route?.port === "number" && Number.isInteger(route.port) && route.port > 0
          ? route.port
          : LINK_DIRECT_PORT,
      ...(family === 4
        ? {
            ipv4Host: host,
            ipv4ObservedAt: observedAt,
          }
        : {
            ipv6Host: host,
            ipv6ObservedAt: observedAt,
          }),
      reason: null,
      message: null,
      checkedAt: new Date().toISOString(),
    });
  }

  async refreshObservedPublicDirectRoutes() {
    if (!this.relayConnected || this.stopped || isRelayCredentialBlockedState(this.relayCredentialState)) {
      return this.state.publicDirect;
    }

    const accessToken = await this.ensureAccessToken();
    if (!normalizeNonEmptyString(accessToken)) {
      return this.state.publicDirect;
    }

    const results = await Promise.allSettled([
      requestRelayPublicRouteObservation({
        relayBaseUrl: this.config.relayBaseUrl,
        accessToken,
        family: 4,
      }),
      requestRelayPublicRouteObservation({
        relayBaseUrl: this.config.relayBaseUrl,
        accessToken,
        family: 6,
      }),
    ]);

    const nextPatch = {
      status: "candidate",
      port: LINK_DIRECT_PORT,
      reason: null,
      message: null,
      checkedAt: new Date().toISOString(),
    };
    let observedCount = 0;

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) {
        continue;
      }
      const candidate = result.value;
      if (candidate.family === 6) {
        nextPatch.ipv6Host = candidate.host;
        nextPatch.ipv6ObservedAt = candidate.observedAt;
      } else {
        nextPatch.ipv4Host = candidate.host;
        nextPatch.ipv4ObservedAt = candidate.observedAt;
      }
      observedCount += 1;
    }

    if (observedCount <= 0) {
      const existingRoutes = buildPublicDirectRoutesFromState(this.state.publicDirect);
      if (!existingRoutes) {
        return await this.updatePublicDirectState({
          status: "unavailable",
          port: LINK_DIRECT_PORT,
          reason: "probe_failed",
          message: "Unable to observe a public IPv4 or IPv6 route right now.",
          checkedAt: new Date().toISOString(),
        });
      }

      return await this.updatePublicDirectState({
        checkedAt: new Date().toISOString(),
      });
    }

    const nextPublicDirect = await this.updatePublicDirectState(nextPatch);
    await this.reportStatus(this.state.connectionStatus, this.state.lastErrorMessage);
    return nextPublicDirect;
  }

  prunePublicConnectAuthCache() {
    const now = Date.now();
    for (const [token, cached] of this.publicConnectAuthCache.entries()) {
      if (!cached || cached.cacheExpiresAtMs <= now || cached.expiresAtMs <= now) {
        this.publicConnectAuthCache.delete(token);
      }
    }
  }

  async verifyPublicConnectTokenValue(connectToken) {
    const normalizedConnectToken = normalizeNonEmptyString(connectToken);
    if (!normalizedConnectToken) {
      return null;
    }

    const accessToken = await this.ensureAccessToken();
    if (!normalizeNonEmptyString(accessToken)) {
      throw new Error(this.t.t("linkCredentialsMissing"));
    }

    this.prunePublicConnectAuthCache();
    const now = Date.now();
    const cached = this.publicConnectAuthCache.get(normalizedConnectToken);
    if (
      cached &&
      cached.cacheExpiresAtMs > now &&
      cached.expiresAtMs - now > PUBLIC_DIRECT_AUTH_MIN_VALID_MS
    ) {
      return cached;
    }

    let connectTokenSecret = normalizeNonEmptyString(this.credentials.connectTokenSecret);
    if (!connectTokenSecret) {
      const refreshedAccessToken = await this.ensureAccessToken(true);
      if (!normalizeNonEmptyString(refreshedAccessToken)) {
        throw new Error(this.t.t("linkCredentialsMissing"));
      }
      connectTokenSecret = normalizeNonEmptyString(this.credentials.connectTokenSecret);
    }
    if (!connectTokenSecret) {
      throw new Error("Missing Link connect token verifier.");
    }

    const verification = verifyLinkAppConnectTokenLocally({
      token: normalizedConnectToken,
      linkId: this.credentials.linkId,
      secret: connectTokenSecret,
    });
    const nextCacheEntry = {
      appUserId:
        typeof verification?.appUserId === "number"
          ? verification.appUserId
          : null,
      gatewayClientId: normalizeNonEmptyString(verification?.gatewayClientId),
      expiresAtMs:
        typeof verification?.expiresAtMs === "number" && Number.isFinite(verification.expiresAtMs)
          ? verification.expiresAtMs
          : 0,
      cacheExpiresAtMs: Math.min(
        verification.expiresAtMs,
        Date.now() + PUBLIC_DIRECT_AUTH_CACHE_TTL_MS,
      ),
    };
    this.publicConnectAuthCache.set(normalizedConnectToken, nextCacheEntry);
    return nextCacheEntry;
  }

  async authorizeIncomingLinkToken(token, options = {}) {
    if (this.relayCredentialState === "upgrade_required") {
      return {
        ok: false,
        statusCode: 403,
        message: this.state.lastErrorMessage ?? "This Link version is no longer supported on this computer.",
      };
    }

    const normalizedToken = normalizeNonEmptyString(token);
    if (!normalizedToken) {
      return {
        ok: false,
        statusCode: 401,
        message: "Missing Link access token.",
      };
    }

    const allowDirectAccessKey = options.allowDirectAccessKey === true;
    if (allowDirectAccessKey && this.isLocalDirectAccessKeyValid(normalizedToken)) {
      return {
        ok: true,
        routeKind: "lan",
      };
    }

    try {
      await this.verifyPublicConnectTokenValue(normalizedToken);
      return {
        ok: true,
        routeKind: "public",
      };
    } catch (error) {
      if (
        error instanceof ServerApiError &&
        (error.status === 401 || error.status === 403 || error.status === 410)
      ) {
        return {
          ok: false,
          statusCode: 401,
          message: error.message,
        };
      }
      if (error instanceof LinkConnectTokenVerificationError) {
        return {
          ok: false,
          statusCode: 401,
          message: error.message,
        };
      }
      return {
        ok: false,
        statusCode: 503,
        message: error instanceof Error ? error.message : "Unable to verify Link access right now.",
      };
    }
  }

  async ensureRelayConnection(forceReconnect = false) {
    if (this.stopped || !this.credentials.linkId || isRelayCredentialBlockedState(this.relayCredentialState)) {
      return;
    }

    if (forceReconnect) {
      this.relayReconnectAttempts = 0;
      this.resetRelayReconnectGuard();
      await this.updateRelayDiagnostics({
        recentDisconnectCount: 0,
        reconnectWindowStartedAt: null,
        nextReconnectAt: null,
        cooldownUntil: null,
      });
    }

    const backend = this.state.backend;
    if (!backend.supported || !backend.wsEndpoint || !backend.httpBaseUrl) {
      if (this.relaySocket) {
        try {
          relaySocketCloseMetadata.set(this.relaySocket, {
            countAsFailure: false,
            message: this.t.t("relayDisconnectedBecauseBackendUnavailable"),
          });
          this.relaySocket.close();
        } catch {
          // Ignore close failures.
        }
      }
      return;
    }

    const now = Date.now();
    if (!forceReconnect && this.relayCooldownUntilMs > now) {
      const lastErrorMessage = this.buildRelayReconnectCooldownMessage(
        this.relayCooldownUntilMs - now,
        this.pruneRelayDisconnectHistory(now).length,
      );
      await this.reportStatus(
        this.resolveConnectionStatus({ relayConnected: false, relayConnecting: false }),
        lastErrorMessage,
        {
          relay: {
            recentDisconnectCount: this.relayDisconnectHistory.length,
            reconnectWindowStartedAt:
              this.relayDisconnectHistory.length > 0
                ? new Date(this.relayDisconnectHistory[0]).toISOString()
                : null,
            nextReconnectAt:
              this.relayNextReconnectAtMs > now
                ? new Date(this.relayNextReconnectAtMs).toISOString()
                : new Date(this.relayCooldownUntilMs).toISOString(),
            cooldownUntil: new Date(this.relayCooldownUntilMs).toISOString(),
          },
        },
      );
      this.scheduleRelayReconnect();
      return;
    }

    if (this.relaySocket && this.relaySocket.readyState === WebSocket.OPEN && !forceReconnect) {
      return;
    }

    if (this.relayConnecting && !forceReconnect) {
      return;
    }

    if (forceReconnect && this.relaySocket) {
      try {
        this.relaySocket.close();
      } catch {
        // Ignore close failures.
      }
      this.relaySocket = null;
    }

    clearTimeout(this.relayReconnectTimer);
    this.relayReconnectTimer = null;
    this.relayConnecting = true;
    await this.reportStatus("connecting", null);

    let accessToken;
    try {
      accessToken = await this.ensureAccessToken(forceReconnect);
    } catch (error) {
      this.relayConnecting = false;
      if (isRelayCredentialBlockedState(this.relayCredentialState)) {
        return;
      }
      await this.reportStatus("degraded", error instanceof Error ? error.message : String(error));
      this.scheduleRelayReconnect();
      return;
    }

    if (!normalizeNonEmptyString(accessToken)) {
      this.relayConnecting = false;
      if (!isRelayCredentialBlockedState(this.relayCredentialState)) {
        await this.reportStatus("degraded", this.t.t("linkCredentialsMissing"));
        this.scheduleRelayReconnect();
      }
      return;
    }

    const relayUrl = buildRelayControlUrl(this.config.relayBaseUrl);
    const relaySocket = new WebSocket(relayUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    this.relaySocket = relaySocket;

    relaySocket.on("open", () => {
      if (this.relaySocket !== relaySocket || this.stopped) {
        return;
      }
      this.relayConnecting = false;
      this.relayConnectedAtMs = Date.now();
      relaySocket.send(buildFrame("hello", {
        linkId: this.credentials.linkId,
        installId: this.config.installId,
        hostname: os.hostname(),
        platform: process.platform,
        version: LINK_VERSION,
        capabilities: {
          gatewayWs: true,
          gatewayHttp: true,
          skill: true,
          relayHttpBinary: true,
        },
      }));
      this.relayAwaitingPong = false;
      this.startRelayPingLoop();
      void daemonLogger.info("relay_connected", {
        relayUrl,
      });
    });

    relaySocket.on("message", (rawData, isBinary) => {
      if (this.relaySocket !== relaySocket || this.stopped) {
        return;
      }
      void this.handleRelayMessage(rawData, isBinary);
    });

    relaySocket.on("pong", () => {
      if (this.relaySocket !== relaySocket || this.stopped) {
        return;
      }
      this.relayAwaitingPong = false;
      clearTimeout(this.relayPongTimeoutTimer);
      this.relayPongTimeoutTimer = null;
    });

    relaySocket.on("close", (code, reason) => {
      if (this.stopped || this.relaySocket !== relaySocket) {
        return;
      }
      const closeMetadata = relaySocketCloseMetadata.get(relaySocket) ?? null;
      relaySocketCloseMetadata.delete(relaySocket);
      void this.handleRelayDisconnect({
        message:
          closeMetadata?.message ??
          this.t.t("relayDisconnectedRetrying"),
        closeCode: Number.isInteger(code) ? code : null,
        closeReason: normalizeRelayCloseReason(reason),
        countAsFailure: closeMetadata?.countAsFailure,
      });
    });

    relaySocket.on("error", (error) => {
      if (this.relaySocket !== relaySocket || this.stopped) {
        return;
      }
      void daemonLogger.warn("relay_socket_error", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  startRelayPingLoop() {
    clearInterval(this.relayPingTimer);
    this.relayPingTimer = setInterval(() => {
      if (!this.relaySocket || this.relaySocket.readyState !== WebSocket.OPEN) {
        return;
      }
      if (this.relayAwaitingPong) {
        try {
          this.relaySocket.terminate();
        } catch {
          // Ignore terminate failures.
        }
        return;
      }

      this.relayAwaitingPong = true;
      clearTimeout(this.relayPongTimeoutTimer);
      this.relayPongTimeoutTimer = setTimeout(() => {
        if (!this.relaySocket || this.relaySocket.readyState !== WebSocket.OPEN) {
          return;
        }
        try {
          this.relaySocket.terminate();
        } catch {
          // Ignore terminate failures.
        }
      }, RELAY_PONG_TIMEOUT_MS);

      try {
        this.relaySocket.ping();
      } catch {
        try {
          this.relaySocket.terminate();
        } catch {
          // Ignore terminate failures.
        }
      }
    }, RELAY_PING_INTERVAL_MS);
  }

  scheduleRelayReconnect() {
    if (this.relayReconnectTimer || this.stopped || isRelayCredentialBlockedState(this.relayCredentialState)) {
      return;
    }
    const now = Date.now();
    const attempt = this.relayReconnectAttempts;
    const baseDelayMs = Math.min(
      RELAY_RECONNECT_BASE_DELAY_MS * 2 ** attempt,
      RELAY_RECONNECT_MAX_DELAY_MS,
    );
    const jitterMs = Math.floor(baseDelayMs * 0.2 * Math.random());
    const cooldownDelayMs =
      this.relayCooldownUntilMs > now
        ? this.relayCooldownUntilMs - now
        : 0;
    const delayMs = Math.max(baseDelayMs + jitterMs, cooldownDelayMs);
    this.relayReconnectAttempts = Math.min(attempt + 1, 12);
    this.relayNextReconnectAtMs = now + delayMs;
    void this.updateRelayDiagnostics({
      recentDisconnectCount: this.pruneRelayDisconnectHistory(now).length,
      reconnectWindowStartedAt:
        this.relayDisconnectHistory.length > 0
          ? new Date(this.relayDisconnectHistory[0]).toISOString()
          : null,
      nextReconnectAt: new Date(this.relayNextReconnectAtMs).toISOString(),
      cooldownUntil:
        this.relayCooldownUntilMs > now
          ? new Date(this.relayCooldownUntilMs).toISOString()
          : null,
    });
    this.relayReconnectTimer = setTimeout(() => {
      this.relayReconnectTimer = null;
      this.relayNextReconnectAtMs = 0;
      void this.ensureRelayConnection();
    }, delayMs);
  }

  async handleRelayDisconnect(params = {}) {
    const message =
      normalizeNonEmptyString(params.message) ??
      this.t.t("relayDisconnectedRetrying");
    const closeCode =
      typeof params.closeCode === "number" && Number.isInteger(params.closeCode)
        ? params.closeCode
        : null;
    const closeReason = normalizeNonEmptyString(params.closeReason);
    const shouldCountAsFailure =
      params.countAsFailure !== false &&
      closeReason !== "superseded by newer link connection";
    const nowMs = Date.now();
    const stableDurationMs =
      this.relayConnectedAtMs && this.relayConnectedAtMs > 0
        ? Math.max(0, nowMs - this.relayConnectedAtMs)
        : 0;

    clearInterval(this.relayPingTimer);
    this.relayPingTimer = null;
    clearTimeout(this.relayPongTimeoutTimer);
    this.relayPongTimeoutTimer = null;
    this.relayAwaitingPong = false;
    const previousSocket = this.relaySocket;
    this.relaySocket = null;
    this.relayConnected = false;
    this.relayConnecting = false;
    this.relayConnectedAtMs = null;
    this.pendingRelayHttpRequests.clear();
    await this.closeGatewaySessionsByRouteKind("relay", "Relay connection lost");

    if (isRelayCredentialBlockedState(this.relayCredentialState)) {
      return;
    }

    if (isUnsupportedLinkVersionClose(closeCode, closeReason)) {
      await this.handleUpgradeRequired(
        buildUnsupportedVersionMessage(
          null,
          "npm i -g @clawpilot-app/link@latest && clawlink restart",
        ),
      );
      return;
    }

    if (stableDurationMs >= RELAY_STABLE_CONNECTION_RESET_MS) {
      this.resetRelayReconnectGuard();
    }

    const recentDisconnectHistory = this.pruneRelayDisconnectHistory(nowMs);
    if (shouldCountAsFailure) {
      recentDisconnectHistory.push(nowMs);
      this.pruneRelayDisconnectHistory(nowMs);
    }

    let nextMessage = message;
    if (this.relayDisconnectHistory.length >= RELAY_RECONNECT_STORM_THRESHOLD) {
      this.relayCooldownUntilMs = nowMs + RELAY_RECONNECT_COOLDOWN_MS;
      nextMessage = this.buildRelayReconnectCooldownMessage(
        this.relayCooldownUntilMs - nowMs,
        this.relayDisconnectHistory.length,
      );
      await daemonLogger.warn("relay_reconnect_cooldown_started", {
        reconnectCount: this.relayDisconnectHistory.length,
        cooldownUntil: new Date(this.relayCooldownUntilMs).toISOString(),
        closeCode,
        closeReason,
      });
    }

    await this.reportStatus(
      this.resolveConnectionStatus({ relayConnected: false, relayConnecting: false }),
      nextMessage,
      {
        relay: {
          recentDisconnectCount: this.relayDisconnectHistory.length,
          reconnectWindowStartedAt:
            this.relayDisconnectHistory.length > 0
              ? new Date(this.relayDisconnectHistory[0]).toISOString()
              : null,
          nextReconnectAt:
            this.relayNextReconnectAtMs > nowMs
              ? new Date(this.relayNextReconnectAtMs).toISOString()
              : null,
          cooldownUntil:
            this.relayCooldownUntilMs > nowMs
              ? new Date(this.relayCooldownUntilMs).toISOString()
              : null,
          lastDisconnectAt: new Date(nowMs).toISOString(),
          lastDisconnectCode: closeCode,
          lastDisconnectReason: closeReason,
          lastDisconnectMessage: message,
          lastStableConnectionDurationMs: stableDurationMs > 0 ? stableDurationMs : null,
        },
      },
    );
    if (previousSocket || this.credentials.linkId) {
      this.scheduleRelayReconnect();
    }
  }

  async handleRelayMessage(rawData, isBinary = false) {
    const binaryFrame = isBinary ? parseRelayBinaryFrame(rawData) : null;
    if (binaryFrame) {
      if (binaryFrame.kind === RELAY_BINARY_FRAME_HTTP_REQUEST_BODY) {
        const pendingRequest = this.pendingRelayHttpRequests.get(binaryFrame.requestId);
        if (!pendingRequest) {
          return;
        }
        if (binaryFrame.payload.byteLength > 0) {
          pendingRequest.bodyChunks.push(Buffer.from(binaryFrame.payload));
        }
      }
      return;
    }

    const raw = typeof rawData === "string" ? rawData : rawData.toString("utf8");
    const frame = safeJsonParse(raw);
    if (!frame || typeof frame.type !== "string") {
      return;
    }

    const payload = frame.payload && typeof frame.payload === "object" ? frame.payload : {};
    switch (frame.type) {
      case "auth.ok":
        this.relayConnected = true;
        this.relayReconnectAttempts = 0;
        this.relayConnectedAtMs = Date.now();
        this.relayNextReconnectAtMs = 0;
        await this.applyObservedPublicDirectRoute(payload.publicDirectRoute);
        void this.refreshObservedPublicDirectRoutes().catch(async (error) => {
          await daemonLogger.warn("public_direct_observe_failed", {
            message: error instanceof Error ? error.message : String(error),
          });
        });
        await this.reportStatus(
          this.resolveConnectionStatus({ relayConnected: true, relayConnecting: false }),
          null,
          {
            relay: {
              nextReconnectAt: null,
              cooldownUntil: null,
            },
          },
        );
        return;
      case "ping":
        this.sendRelayFrame("pong", { ts: Date.now() });
        return;
      case "pong":
        return;
      case "app.ws.connect":
        await this.openGatewaySession(
          normalizeNonEmptyString(payload.appConnId),
          this.buildRelayGatewaySessionHandlers(normalizeNonEmptyString(payload.appConnId)),
          {
            routeKind: "relay",
          },
        );
        return;
      case "app.ws.message":
        await this.forwardRelayAppWsMessage(payload);
        return;
      case "app.ws.close":
        await this.closeGatewaySession(normalizeNonEmptyString(payload.appConnId));
        return;
      case "http.request.start": {
        const requestId = normalizeNonEmptyString(payload.requestId);
        const requestPath = normalizeNonEmptyString(payload.path);
        if (!requestId || !requestPath) {
          return;
        }
        this.pendingRelayHttpRequests.set(requestId, {
          requestId,
          method: payload.method,
          path: requestPath,
          headers:
            payload.headers && typeof payload.headers === "object" ? payload.headers : {},
          bodyChunks: [],
          binaryMode: true,
        });
        return;
      }
      case "http.request.end": {
        const requestId = normalizeNonEmptyString(payload.requestId);
        if (!requestId) {
          return;
        }
        const pendingRequest = this.pendingRelayHttpRequests.get(requestId);
        if (!pendingRequest) {
          return;
        }
        this.pendingRelayHttpRequests.delete(requestId);
        await this.handleRelayHttpRequest({
          requestId,
          method: pendingRequest.method,
          path: pendingRequest.path,
          headers: pendingRequest.headers,
          bodyBuffer:
            pendingRequest.bodyChunks.length > 0
              ? Buffer.concat(pendingRequest.bodyChunks)
              : undefined,
          binaryMode: true,
        });
        return;
      }
      case "http.request":
        await this.handleRelayHttpRequest(payload);
        return;
      default:
        return;
    }
  }

  sendRelayFrame(type, payload = {}) {
    if (!this.relaySocket || this.relaySocket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.relaySocket.send(buildFrame(type, payload));
  }

  sendRelayHttpJsonResponse(requestId, status, payload) {
    const body = Buffer.from(`${JSON.stringify(payload)}\n`, "utf8");
    this.sendRelayFrame("http.response.start", {
      requestId,
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(body.byteLength),
        "cache-control": "no-store",
      },
    });
    if (body.byteLength > 0) {
      this.sendRelayFrame("http.response.chunk", {
        requestId,
        chunk: toBase64Url(body),
      });
    }
    this.sendRelayFrame("http.response.end", {
      requestId,
    });
  }

  buildRelayGatewaySessionHandlers(appConnId) {
    if (!appConnId) {
      return null;
    }

    return {
      onConnected: (hello) => {
        this.sendRelayFrame("app.ws.connected", {
          appConnId,
          hello,
        });
      },
      onMessage: (raw) => {
        this.sendRelayFrame("app.ws.message", {
          appConnId,
          data: raw,
        });
      },
      onConnectError: (error) => {
        this.sendRelayFrame("app.ws.connect_error", {
          appConnId,
          error,
        });
      },
      onClose: ({ code, reason }) => {
        this.sendRelayFrame("app.ws.close", {
          appConnId,
          code,
          reason,
        });
      },
    };
  }

  async openGatewaySession(sessionId, handlers, options = {}) {
    if (!sessionId || !handlers || this.gatewaySessions.has(sessionId) || !this.state.backend.wsEndpoint) {
      return;
    }

    const backend = this.state.backend;
    const socket = new WebSocket(backend.wsEndpoint);
    const gatewaySession = {
      socket,
      queue: [],
      ready: false,
      connectRequestId: null,
      connectSent: false,
      connectFailed: false,
      suppressCloseFrame: false,
      connectTimer: setTimeout(() => {
        if (
          gatewaySession.ready ||
          gatewaySession.connectFailed ||
          gatewaySession.suppressCloseFrame
        ) {
          return;
        }
        gatewaySession.connectFailed = true;
        handlers.onConnectError(buildGatewayError("Local OpenClaw connect timed out"));
        void this.closeGatewaySession(sessionId);
      }, LOCAL_CONNECT_TIMEOUT_MS),
      handlers,
      routeKind:
        options.routeKind === "lan"
          ? "lan"
          : options.routeKind === "public"
            ? "public"
            : "relay",
    };
    this.gatewaySessions.set(sessionId, gatewaySession);

    socket.on("message", (rawData) => {
      const raw = typeof rawData === "string" ? rawData : rawData.toString("utf8");
      void this.handleGatewaySessionBackendMessage(sessionId, raw);
    });

    socket.on("close", (code, reason) => {
      clearTimeout(gatewaySession.connectTimer);
      this.gatewaySessions.delete(sessionId);
      if (gatewaySession.suppressCloseFrame) {
        return;
      }
      if (!gatewaySession.ready) {
        if (gatewaySession.connectFailed) {
          return;
        }
        handlers.onConnectError(
          buildGatewayError(
            typeof reason === "string"
              ? reason
              : reason?.toString("utf8") ?? "Local OpenClaw socket closed",
          ),
        );
        return;
      }
      handlers.onClose({
        code: sanitizeCloseCode(code, 1000),
        reason:
          typeof reason === "string"
            ? reason
            : reason?.toString("utf8") ?? "Local socket closed",
      });
    });

    socket.on("error", (error) => {
      void daemonLogger.warn("local_socket_error", {
        sessionId,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }

  async closeGatewaySession(sessionId) {
    if (!sessionId) {
      return;
    }
    const gatewaySession = this.gatewaySessions.get(sessionId);
    if (!gatewaySession) {
      return;
    }
    this.gatewaySessions.delete(sessionId);
    clearTimeout(gatewaySession.connectTimer);
    gatewaySession.suppressCloseFrame = true;
    try {
      gatewaySession.socket.close();
    } catch {
      // Ignore close failures.
    }
  }

  async closeGatewaySessionsByRouteKind(routeKind, reason = "Connection closed") {
    const matchingSessionIds = [];
    for (const [sessionId, gatewaySession] of this.gatewaySessions.entries()) {
      if (gatewaySession.routeKind === routeKind) {
        matchingSessionIds.push(sessionId);
      }
    }

    for (const sessionId of matchingSessionIds) {
      const gatewaySession = this.gatewaySessions.get(sessionId);
      if (!gatewaySession) {
        continue;
      }
      this.gatewaySessions.delete(sessionId);
      clearTimeout(gatewaySession.connectTimer);
      gatewaySession.suppressCloseFrame = true;
      try {
        gatewaySession.socket.close(1001, reason.slice(0, 120));
      } catch {
        // Ignore close failures.
      }
    }
  }

  async buildLocalConnectFrame(connectRequestId, nonce) {
    const auth =
      this.state.backend.authType === "password"
        ? { password: this.state.backend.secret }
        : { token: this.state.backend.secret };
    const device =
      typeof nonce === "string" && nonce.trim()
        ? await buildSignedGatewayDeviceIdentity({
            clientId: LOCAL_GATEWAY_CLIENT_ID,
            clientMode: "backend",
            role: LOCAL_GATEWAY_ROLE,
            scopes: [...LOCAL_GATEWAY_SCOPES],
            token: auth.token ?? null,
            nonce: nonce.trim(),
            platform: LOCAL_GATEWAY_CLIENT_PLATFORM,
            deviceFamily: null,
          })
        : undefined;

    return JSON.stringify({
      type: "req",
      id: connectRequestId,
      method: "connect",
      params: {
        minProtocol: OPENCLAW_GATEWAY_MIN_PROTOCOL_VERSION,
        maxProtocol: OPENCLAW_GATEWAY_MAX_PROTOCOL_VERSION,
        client: {
          id: LOCAL_GATEWAY_CLIENT_ID,
          displayName: this.config.displayName || "ClawPilot Link",
          version: LINK_VERSION,
          platform: LOCAL_GATEWAY_CLIENT_PLATFORM,
          mode: "backend",
          instanceId: this.config.installId,
        },
        caps: [...LOCAL_GATEWAY_CAPS],
        role: LOCAL_GATEWAY_ROLE,
        scopes: [...LOCAL_GATEWAY_SCOPES],
        auth,
        device,
      },
    });
  }

  async handleGatewaySessionBackendMessage(sessionId, raw) {
    const gatewaySession = this.gatewaySessions.get(sessionId);
    if (!gatewaySession || !raw) {
      return;
    }

    const parsed = parseGatewayFrame(raw);
    if (!gatewaySession.ready) {
      if (
        parsed &&
        parsed.type === "event" &&
        parsed.event === "connect.challenge" &&
        !gatewaySession.connectSent
      ) {
        gatewaySession.connectSent = true;
        gatewaySession.connectRequestId = createRequestId("link-connect");
        try {
          gatewaySession.socket.send(
            await this.buildLocalConnectFrame(
              gatewaySession.connectRequestId,
              parsed.payload?.nonce,
            ),
          );
        } catch (error) {
          clearTimeout(gatewaySession.connectTimer);
          gatewaySession.connectFailed = true;
          gatewaySession.handlers.onConnectError(
            buildGatewayError(
              error instanceof Error
                ? error.message
                : "Failed to prepare local OpenClaw device identity",
            ),
          );
          await this.closeGatewaySession(sessionId);
        }
        return;
      }

      if (
        parsed &&
        parsed.type === "res" &&
        typeof parsed.id === "string" &&
        parsed.id === gatewaySession.connectRequestId
      ) {
        if (parsed.ok) {
          clearTimeout(gatewaySession.connectTimer);
          gatewaySession.ready = true;
          gatewaySession.handlers.onConnected(sanitizeHelloPayload(parsed.payload));
          const pendingMessages = [...gatewaySession.queue];
          gatewaySession.queue.length = 0;
          for (const pendingRaw of pendingMessages) {
            gatewaySession.socket.send(pendingRaw);
          }
          return;
        }

        clearTimeout(gatewaySession.connectTimer);
        gatewaySession.connectFailed = true;
        gatewaySession.handlers.onConnectError(
          parsed.error && typeof parsed.error === "object"
            ? parsed.error
            : buildGatewayError("Local OpenClaw connect failed"),
        );
        await this.closeGatewaySession(sessionId);
        return;
      }

      return;
    }

    gatewaySession.handlers.onMessage(raw);
  }

  async sendGatewaySessionMessage(sessionId, raw) {
    if (!sessionId || !raw) {
      return;
    }

    const gatewaySession = this.gatewaySessions.get(sessionId);
    if (!gatewaySession) {
      return;
    }

    if (gatewaySession.ready && gatewaySession.socket.readyState === WebSocket.OPEN) {
      gatewaySession.socket.send(raw);
      return;
    }

    gatewaySession.queue.push(raw);
  }

  async forwardRelayAppWsMessage(payload) {
    const appConnId = normalizeNonEmptyString(payload.appConnId);
    const raw = typeof payload.data === "string" ? payload.data : null;
    if (!appConnId || !raw) {
      return;
    }

    if (!this.gatewaySessions.has(appConnId)) {
      await this.openGatewaySession(
        appConnId,
        this.buildRelayGatewaySessionHandlers(appConnId),
        {
          routeKind: "relay",
        },
      );
    }

    await this.sendGatewaySessionMessage(appConnId, raw);
  }

  async proxyBackendHttpRequest(params) {
    if (!this.state.backend.supported || !this.state.backend.httpBaseUrl) {
      throw new Error(
        this.state.backend.message ?? "Current OpenClaw setup is not supported yet.",
      );
    }

    const requestUrl = `${this.state.backend.httpBaseUrl}${params.requestPath}`;
    const requestHeaders = {
      ...(params.headers ?? {}),
      ...buildLocalGatewayRequestHeaders(this.state.backend),
    };

    return await fetch(requestUrl, {
      method: normalizeNonEmptyString(params.method) ?? "GET",
      headers: requestHeaders,
      body: params.body ?? undefined,
    });
  }

  async handleRelayHttpRequest(payload) {
    const requestId = normalizeNonEmptyString(payload.requestId);
    const requestPath = normalizeNonEmptyString(payload.path);
    if (!requestId || !requestPath) {
      return;
    }

    if (isLinkLogsRequestPath(requestPath)) {
      if ((payload.method ?? "GET").toUpperCase() !== "GET") {
        this.sendRelayHttpJsonResponse(requestId, 405, {
          error: {
            message: "Method not allowed.",
          },
        });
        return;
      }

      try {
        const snapshot = await readLinkLogSnapshot(parseLinkLogRequestOptions(requestPath));
        this.sendRelayHttpJsonResponse(requestId, 200, snapshot);
      } catch (error) {
        this.sendRelayHttpJsonResponse(requestId, 500, {
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
      return;
    }

    if (!this.state.backend.httpBaseUrl) {
      return;
    }

    try {
      const response = await this.proxyBackendHttpRequest({
        method: payload.method,
        requestPath,
        headers:
          payload.headers && typeof payload.headers === "object" ? payload.headers : {},
        body:
          payload.bodyBuffer instanceof Uint8Array || Buffer.isBuffer(payload.bodyBuffer)
            ? payload.bodyBuffer
            : payload.body
              ? fromBase64Url(payload.body)
              : undefined,
      });

      this.sendRelayFrame("http.response.start", {
        requestId,
        status: response.status,
        headers: collectResponseHeaders(response.headers),
      });

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          if (value && value.byteLength > 0) {
            if (payload.binaryMode === true) {
              if (this.relaySocket && this.relaySocket.readyState === WebSocket.OPEN) {
                this.relaySocket.send(
                  buildRelayBinaryFrame(
                    RELAY_BINARY_FRAME_HTTP_RESPONSE_CHUNK,
                    requestId,
                    value,
                  ),
                );
              }
            } else {
              this.sendRelayFrame("http.response.chunk", {
                requestId,
                chunk: toBase64Url(value),
              });
            }
          }
        }
      }

      this.sendRelayFrame("http.response.end", {
        requestId,
      });
    } catch (error) {
      this.sendRelayFrame("http.response.error", {
        requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  isLocalDirectAccessKeyValid(token) {
    const expected = normalizeNonEmptyString(this.config.directAccessKey);
    const actual = normalizeNonEmptyString(token);
    return Boolean(expected && actual && expected === actual);
  }

  describeDirectAccessListenFailure(error) {
    const code = normalizeNodeErrorCode(error);
    if (code === "EADDRINUSE") {
      return {
        reason: "port_in_use",
        message: this.t.t("localAccessPortInUse", {
          port: LINK_DIRECT_PORT,
        }),
      };
    }
    if (code === "EACCES" || code === "EPERM") {
      return {
        reason: "permission_denied",
        message: this.t.t("localAccessPermissionDenied", {
          port: LINK_DIRECT_PORT,
        }),
      };
    }
    return {
      reason: "listen_failed",
      message: error instanceof Error ? error.message : this.t.t("localAccessUnavailable"),
    };
  }

  async listenLocalGatewayServer(server) {
    try {
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(
          {
            port: LINK_DIRECT_PORT,
            host: "::",
            ipv6Only: false,
          },
          () => {
            server.off("error", reject);
            resolve();
          },
        );
      });
      return {
        host: "::",
        mode: "dual_stack",
      };
    } catch (error) {
      if (normalizeNodeErrorCode(error) !== "EAFNOSUPPORT") {
        throw error;
      }
    }

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(LINK_DIRECT_PORT, "0.0.0.0", () => {
        server.off("error", reject);
        resolve();
      });
    });

    return {
      host: "0.0.0.0",
      mode: "ipv4_only",
    };
  }

  async openLocalGatewayServer() {
    if (this.localGatewayServer) {
      return;
    }

    const wsServer = new WebSocketServer({ noServer: true });
    wsServer.on("connection", (socket, request) => {
      const sessionId = createRequestId("lan");
      const appSocketState = {
        socket,
        sessionId,
        remoteAddress: normalizeRemoteAddress(request?.socket?.remoteAddress),
        authenticated: false,
        connectRequestId: null,
        allowDirectAccessKey: isPrivateOrLoopbackAddress(request?.socket?.remoteAddress),
        authTimer: setTimeout(() => {
          if (appSocketState.authenticated) {
            return;
          }
          try {
            socket.close(1008, "Link connect timed out");
          } catch {
            // Ignore close failures.
          }
        }, LOCAL_APP_CONNECT_TIMEOUT_MS),
      };
      this.localAppSockets.set(sessionId, appSocketState);

      socket.on("message", (rawData) => {
        void this.handleLocalGatewayWebSocketMessage(sessionId, rawData);
      });

      socket.on("close", () => {
        clearTimeout(appSocketState.authTimer);
        this.localAppSockets.delete(sessionId);
        void this.closeGatewaySession(sessionId);
      });

      socket.on("error", (error) => {
        void daemonLogger.warn("local_app_socket_error", {
          sessionId,
          message: error instanceof Error ? error.message : String(error),
        });
      });

      socket.send(JSON.stringify({
        type: "event",
        event: "connect.challenge",
        payload: {
          nonce: createNonce(),
        },
      }));
    });

    const server = http.createServer((request, response) => {
      void this.handleLocalGatewayHttpRequest(request, response);
    });

    server.on("upgrade", (request, socket, head) => {
      const requestPath = normalizeRequestPath(request.url);
      if (requestPath !== "/" && requestPath !== "/ws") {
        socket.destroy();
        return;
      }

      wsServer.handleUpgrade(request, socket, head, (upgradedSocket) => {
        wsServer.emit("connection", upgradedSocket, request);
      });
    });

    try {
      const listenResult = await this.listenLocalGatewayServer(server);
      this.localGatewayServer = server;
      this.localGatewayWsServer = wsServer;
      this.state = await patchState({
        directAccess: {
          status: "listening",
          port: LINK_DIRECT_PORT,
          reason: null,
          message: this.t.t("localAccessReadyOnPort", {
            port: LINK_DIRECT_PORT,
          }),
          checkedAt: new Date().toISOString(),
        },
      });
      await daemonLogger.info("local_gateway_server_listening", {
        port: LINK_DIRECT_PORT,
        host: listenResult.host,
        mode: listenResult.mode,
      });
      await this.resolveLanDirectAddresses("local_gateway_server_listening");
    } catch (error) {
      this.localGatewayServer = null;
      this.localGatewayWsServer = null;
      wsServer.close();
      server.close();
      const directAccessFailure = this.describeDirectAccessListenFailure(error);
      const shouldReportUnavailableState =
        this.state.directAccess?.status !== "unavailable" ||
        this.state.directAccess?.reason !== directAccessFailure.reason;
      if (shouldReportUnavailableState) {
        this.state = await patchState({
          directAccess: {
            status: "unavailable",
            port: LINK_DIRECT_PORT,
            reason: directAccessFailure.reason,
            message: directAccessFailure.message,
            checkedAt: new Date().toISOString(),
          },
        });
        await daemonLogger.warn("local_gateway_server_unavailable", {
          port: LINK_DIRECT_PORT,
          reason: directAccessFailure.reason,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      await this.updatePublicDirectState({
        status: "unavailable",
        reason: "listener_unavailable",
        message: directAccessFailure.message,
        checkedAt: new Date().toISOString(),
      });
      await this.reportStatus(this.state.connectionStatus, this.state.lastErrorMessage);
    }
  }

  writeLocalGatewayJson(response, statusCode, payload) {
    const body = Buffer.from(`${JSON.stringify(payload)}\n`, "utf8");
    response.writeHead(statusCode, {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(body.byteLength),
      "cache-control": "no-store",
    });
    response.end(body);
  }

  async handleLocalGatewayHttpRequest(request, response) {
    const requestPath = normalizeRequestPath(request.url);
    const bearerToken = extractBearerToken(request.headers.authorization);
    const remoteAddress = normalizeRemoteAddress(request.socket?.remoteAddress);

    if (requestPath === "/public-healthz") {
      const statusCode = this.state.backend.supported ? 200 : 503;
      await daemonLogger.info("local_gateway_public_healthz", {
        remoteAddress,
        statusCode,
        backendSupported: this.state.backend.supported,
      });
      this.writeLocalGatewayJson(response, statusCode, {
        ok: this.state.backend.supported,
        packageName: LINK_PACKAGE_NAME,
        version: LINK_VERSION,
        flavor: LINK_FLAVOR,
        pid: process.pid,
        nodeVersion: process.version,
      });
      return;
    }

    const authResult = await this.authorizeIncomingLinkToken(bearerToken, {
      allowDirectAccessKey: isPrivateOrLoopbackAddress(request.socket?.remoteAddress),
    });
    if (!authResult.ok) {
      if (requestPath === "/healthz") {
        await daemonLogger.warn("local_gateway_healthz_rejected", {
          remoteAddress,
          statusCode: authResult.statusCode ?? 401,
          message: authResult.message ?? null,
        });
      }
      this.writeLocalGatewayJson(response, authResult.statusCode ?? 401, {
        error: {
          message: authResult.message ?? "Unable to verify Link access right now.",
        },
      });
      return;
    }

    if (requestPath === "/healthz") {
      const statusCode = this.state.backend.supported ? 200 : 503;
      await daemonLogger.info("local_gateway_healthz_ok", {
        remoteAddress,
        routeKind: authResult.routeKind ?? null,
        statusCode,
        backendSupported: this.state.backend.supported,
      });
      this.writeLocalGatewayJson(response, statusCode, {
        ok: this.state.backend.supported,
        packageName: LINK_PACKAGE_NAME,
        version: LINK_VERSION,
        flavor: LINK_FLAVOR,
        pid: process.pid,
        nodeVersion: process.version,
        connectionStatus: this.state.connectionStatus,
        linkId: this.credentials.linkId,
        backend: {
          detected: this.state.backend.detected,
          supported: this.state.backend.supported,
          message: this.state.backend.message,
        },
      });
      return;
    }

    if (isLinkLogsRequestPath(requestPath)) {
      if ((request.method ?? "GET").toUpperCase() !== "GET") {
        this.writeLocalGatewayJson(response, 405, {
          error: {
            message: "Method not allowed.",
          },
        });
        return;
      }

      try {
        const snapshot = await readLinkLogSnapshot(parseLinkLogRequestOptions(request.url));
        this.writeLocalGatewayJson(response, 200, snapshot);
      } catch (error) {
        this.writeLocalGatewayJson(response, 500, {
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
      return;
    }

    try {
      const body = await readIncomingRequestBody(request);
      const proxyResponse = await this.proxyBackendHttpRequest({
        method: request.method,
        requestPath,
        headers: collectIncomingRequestHeaders(request.headers),
        body,
      });

      response.writeHead(proxyResponse.status, collectResponseHeaders(proxyResponse.headers));
      if (!proxyResponse.body) {
        response.end();
        return;
      }

      const reader = proxyResponse.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value && value.byteLength > 0) {
          response.write(Buffer.from(value));
        }
      }
      response.end();
    } catch (error) {
      this.writeLocalGatewayJson(response, 502, {
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  async handleLocalGatewayWebSocketMessage(sessionId, rawData) {
    const appSocketState = this.localAppSockets.get(sessionId);
    if (!appSocketState) {
      return;
    }

    const raw = typeof rawData === "string" ? rawData : rawData.toString("utf8");
    if (!raw) {
      return;
    }

    if (!appSocketState.authenticated) {
      const parsed = parseGatewayFrame(raw);
      if (
        !parsed ||
        parsed.type !== "req" ||
        parsed.method !== "connect" ||
        typeof parsed.id !== "string"
      ) {
        try {
          appSocketState.socket.close(1008, "Link connect is required first");
        } catch {
          // Ignore close failures.
        }
        return;
      }

      appSocketState.connectRequestId = parsed.id;
      const token = normalizeNonEmptyString(parsed.params?.auth?.token);
      const authResult = await this.authorizeIncomingLinkToken(token, {
        allowDirectAccessKey: appSocketState.allowDirectAccessKey,
      });
      if (!authResult.ok) {
        await daemonLogger.warn("local_gateway_ws_rejected", {
          sessionId,
          remoteAddress: appSocketState.remoteAddress,
          statusCode: authResult.statusCode ?? 401,
          message: authResult.message ?? null,
        });
        appSocketState.socket.send(JSON.stringify({
          type: "res",
          id: parsed.id,
          ok: false,
          error: buildGatewayError(
            authResult.message ?? "This Link access is no longer valid.",
            "unauthorized",
          ),
        }));
        try {
          appSocketState.socket.close(1008, "Local Link auth failed");
        } catch {
          // Ignore close failures.
        }
        return;
      }

      await daemonLogger.info("local_gateway_ws_authorized", {
        sessionId,
        remoteAddress: appSocketState.remoteAddress,
        routeKind: authResult.routeKind ?? null,
      });

      if (!this.state.backend.supported) {
        appSocketState.socket.send(JSON.stringify({
          type: "res",
          id: parsed.id,
          ok: false,
          error: buildGatewayError(
            this.state.backend.message ?? "OpenClaw is not available on this computer.",
          ),
        }));
        try {
          appSocketState.socket.close(1011, "OpenClaw unavailable");
        } catch {
          // Ignore close failures.
        }
        return;
      }

      await this.openGatewaySession(
        sessionId,
        {
          onConnected: (hello) => {
            appSocketState.authenticated = true;
            clearTimeout(appSocketState.authTimer);
            appSocketState.socket.send(JSON.stringify({
              type: "res",
              id: parsed.id,
              ok: true,
              payload: hello,
            }));
          },
          onMessage: (message) => {
            appSocketState.socket.send(message);
          },
          onConnectError: (error) => {
            appSocketState.socket.send(JSON.stringify({
              type: "res",
              id: parsed.id,
              ok: false,
              error,
            }));
            try {
              appSocketState.socket.close(1011, normalizeNonEmptyString(error?.message) ?? "Connect failed");
            } catch {
              // Ignore close failures.
            }
          },
          onClose: ({ code, reason }) => {
            try {
              appSocketState.socket.close(sanitizeCloseCode(code), reason || "Gateway closed");
            } catch {
              // Ignore close failures.
            }
          },
        },
        {
          routeKind: authResult.routeKind === "public" ? "public" : "lan",
        },
      );
      return;
    }

    await this.sendGatewaySessionMessage(sessionId, raw);
  }

  async openIpcServer() {
    if (process.platform !== "win32") {
      try {
        await import("node:fs/promises").then(({ unlink }) => unlink(runtimePaths.socketFile));
      } catch {
        // Ignore stale socket cleanup failures.
      }
    }

    this.server = net.createServer((socket) => {
      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line) {
            void this.handleIpcLine(socket, line);
          }
          newlineIndex = buffer.indexOf("\n");
        }
      });
    });

    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(runtimePaths.socketFile, () => {
        this.server.off("error", reject);
        resolve();
      });
    });
  }

  async handleIpcLine(socket, line) {
    const message = safeJsonParse(line);
    if (!message?.id || typeof message.method !== "string") {
      socket.write(`${JSON.stringify({
        id: message?.id ?? null,
        ok: false,
        error: { message: "invalid_ipc_message" },
      })}\n`);
      return;
    }

    if (message.method === "daemon.shutdown") {
      socket.write(`${JSON.stringify({
        id: message.id,
        ok: true,
        result: { ok: true },
      })}\n`);
      setImmediate(() => {
        void this.stop();
      });
      return;
    }

    try {
      const result = await this.handleIpcRequest(message.method, message.params ?? {});
      socket.write(`${JSON.stringify({
        id: message.id,
        ok: true,
        result,
      })}\n`);
    } catch (error) {
      socket.write(`${JSON.stringify({
        id: message.id,
        ok: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      })}\n`);
    }
  }

  async handleIpcRequest(method) {
    switch (method) {
      case "status.get":
        return {
          version: LINK_VERSION,
          config: this.config,
          state: this.state,
          credentials: {
            linkId: this.credentials.linkId,
            refreshTokenExpiresAt: this.credentials.refreshTokenExpiresAt,
            accessTokenExpiresAt: this.credentials.accessTokenExpiresAt,
          },
          relayConnected: this.relayConnected,
        };
      case "daemon.reconnect":
        await this.ensureRelayConnection(true);
        return { ok: true };
      case "daemon.shutdown":
        await this.stop();
        return { ok: true };
      case "daemon.clearCredentials":
        await clearCredentials();
        this.credentials = await loadCredentials();
        return { ok: true };
      default:
        throw new Error("unknown_ipc_method");
    }
  }
}
