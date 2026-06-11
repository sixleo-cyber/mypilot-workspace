import { execFileSync } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSON5 from "json5";
import WebSocket from "ws";
import { buildSignedGatewayDeviceIdentity } from "./device-identity.js";
import {
  LINK_VERSION,
  OPENCLAW_GATEWAY_MAX_PROTOCOL_VERSION,
  OPENCLAW_GATEWAY_MIN_PROTOCOL_VERSION,
} from "./constants.js";
import { fileExists, normalizeNonEmptyString, runtimePaths } from "./runtime.js";

const DEFAULT_GATEWAY_PORT = 18789;
const LOCAL_GATEWAY_CLIENT_ID = "gateway-client";
const LOCAL_GATEWAY_CLIENT_PLATFORM = "node";
const LOCAL_GATEWAY_ROLE = "operator";
const LOCAL_GATEWAY_SCOPES = ["operator.admin"];
const LOCAL_GATEWAY_CAPS = ["tool-events"];
const GATEWAY_PROBE_TIMEOUT_MS = 6_000;
const WSL_DISCOVERY_TIMEOUT_MS = 2_000;

let cachedWslDistros = null;
let cachedDefaultWslDistro = undefined;
const cachedWslHomeDirs = new Map();
let cachedAutoDetectedWslConfigPath = undefined;

function normalizeBaseUrl(value, defaultProtocol = "http:") {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }

  const withProtocol =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized) ? normalized : `${defaultProtocol}//${normalized}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

function buildWsEndpoint(httpBaseUrl) {
  const parsed = new URL(httpBaseUrl);
  parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  return parsed.toString().replace(/\/+$/, "");
}

function isWindowsHostRuntime() {
  return process.platform === "win32";
}

function looksLikeWslUncPath(value) {
  if (typeof value !== "string") {
    return false;
  }
  return /^\\\\(wsl\$|wsl\.localhost)\\/i.test(value.trim());
}

function looksLikeLinuxAbsolutePath(value) {
  return typeof value === "string" && value.startsWith("/");
}

function looksLikeLinuxHomeRelativePath(value) {
  return typeof value === "string" && value.startsWith("~/");
}

function sanitizeWslCommandOutput(raw) {
  return String(raw ?? "")
    .replace(/\0/g, "")
    .replace(/\r/g, "")
    .trim();
}

function runWslCommandSync(args) {
  return execFileSync("wsl.exe", args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024,
    timeout: WSL_DISCOVERY_TIMEOUT_MS,
  });
}

function listWslDistrosSync() {
  if (!isWindowsHostRuntime()) {
    return [];
  }
  if (cachedWslDistros) {
    return [...cachedWslDistros];
  }

  try {
    const stdout = runWslCommandSync(["-l", "-q"]);
    const distros = stdout
      .split(/\n+/)
      .map((line) => sanitizeWslCommandOutput(line))
      .filter(Boolean);
    cachedWslDistros = [...new Set(distros)];
    return [...cachedWslDistros];
  } catch {
    cachedWslDistros = [];
    return [];
  }
}

function resolveDefaultWslDistroSync() {
  if (!isWindowsHostRuntime()) {
    return null;
  }
  if (cachedDefaultWslDistro !== undefined) {
    return cachedDefaultWslDistro;
  }

  try {
    const stdout = runWslCommandSync(["--exec", "sh", "-lc", "printf %s \"$WSL_DISTRO_NAME\""]);
    cachedDefaultWslDistro = sanitizeWslCommandOutput(stdout) || null;
  } catch {
    cachedDefaultWslDistro = null;
  }

  return cachedDefaultWslDistro;
}

function resolveWslHomeDirSync(distroName) {
  if (!isWindowsHostRuntime() || !normalizeNonEmptyString(distroName)) {
    return null;
  }
  if (cachedWslHomeDirs.has(distroName)) {
    return cachedWslHomeDirs.get(distroName) ?? null;
  }

  let homeDir = null;
  try {
    const stdout = runWslCommandSync([
      "--distribution",
      distroName,
      "--exec",
      "sh",
      "-lc",
      "printf %s \"$HOME\"",
    ]);
    const normalized = sanitizeWslCommandOutput(stdout);
    if (looksLikeLinuxAbsolutePath(normalized)) {
      homeDir = normalized.replace(/\/+$/, "") || "/";
    }
  } catch {
    homeDir = null;
  }

  cachedWslHomeDirs.set(distroName, homeDir);
  return homeDir;
}

function buildWslUncPath(distroName, linuxPath) {
  const normalizedDistro = normalizeNonEmptyString(distroName);
  const normalizedLinuxPath = normalizeNonEmptyString(linuxPath);
  if (!normalizedDistro || !normalizedLinuxPath) {
    return null;
  }

  const pathWithLeadingSlash = normalizedLinuxPath.startsWith("/")
    ? normalizedLinuxPath
    : `/${normalizedLinuxPath}`;
  return `\\\\wsl.localhost\\${normalizedDistro}${pathWithLeadingSlash.replace(/\//g, "\\")}`;
}

function resolvePreferredWslDistrosSync() {
  const distros = listWslDistrosSync();
  if (distros.length <= 0) {
    return [];
  }

  const defaultDistro = resolveDefaultWslDistroSync();
  if (!defaultDistro) {
    return distros;
  }

  const rest = distros.filter((entry) => entry !== defaultDistro);
  return distros.includes(defaultDistro) ? [defaultDistro, ...rest] : distros;
}

function convertWindowsLinuxStyleConfigPath(rawPath) {
  if (!isWindowsHostRuntime()) {
    return null;
  }

  const normalizedPath = normalizeNonEmptyString(rawPath);
  if (!normalizedPath) {
    return null;
  }

  if (looksLikeWslUncPath(normalizedPath)) {
    return path.win32.normalize(normalizedPath);
  }

  const distros = resolvePreferredWslDistrosSync();
  if (distros.length <= 0) {
    return normalizedPath;
  }

  if (looksLikeLinuxAbsolutePath(normalizedPath)) {
    return buildWslUncPath(distros[0], normalizedPath);
  }

  if (looksLikeLinuxHomeRelativePath(normalizedPath)) {
    const homeDir = resolveWslHomeDirSync(distros[0]);
    if (!homeDir) {
      return normalizedPath;
    }
    return buildWslUncPath(distros[0], `${homeDir}/${normalizedPath.slice(2)}`);
  }

  return null;
}

function findAutoDetectedWslOpenClawConfigPathSync() {
  if (!isWindowsHostRuntime()) {
    return null;
  }
  if (cachedAutoDetectedWslConfigPath !== undefined) {
    return cachedAutoDetectedWslConfigPath;
  }

  for (const distroName of resolvePreferredWslDistrosSync()) {
    const homeDir = resolveWslHomeDirSync(distroName);
    if (!homeDir) {
      continue;
    }
    const candidatePath = buildWslUncPath(distroName, `${homeDir}/.openclaw/openclaw.json`);
    if (candidatePath && fs.existsSync(candidatePath)) {
      cachedAutoDetectedWslConfigPath = candidatePath;
      return cachedAutoDetectedWslConfigPath;
    }
  }

  cachedAutoDetectedWslConfigPath = null;
  return null;
}

function normalizeConfigPathValue(rawPath) {
  const normalizedPath = normalizeNonEmptyString(rawPath);
  if (!normalizedPath) {
    return null;
  }

  const windowsAdjustedPath =
    convertWindowsLinuxStyleConfigPath(normalizedPath) ?? normalizedPath;
  const resolvedPath =
    isWindowsHostRuntime() && looksLikeLinuxAbsolutePath(windowsAdjustedPath)
      ? windowsAdjustedPath
      : path.resolve(windowsAdjustedPath);
  try {
    if (fs.statSync(resolvedPath).isDirectory()) {
      return path.join(resolvedPath, "openclaw.json");
    }
  } catch {
    // Ignore missing or inaccessible paths and keep the raw resolved value.
  }
  return resolvedPath;
}

export function normalizeOpenClawConfigPathInput(rawPath) {
  return normalizeConfigPathValue(rawPath);
}

export function resolveOpenClawConfigPath(linkConfig = {}) {
  const configuredPath = normalizeConfigPathValue(linkConfig.openClawConfigPath);
  if (configuredPath) {
    return configuredPath;
  }
  if (normalizeConfigPathValue(process.env.OPENCLAW_CONFIG_PATH)) {
    return normalizeConfigPathValue(process.env.OPENCLAW_CONFIG_PATH);
  }
  if (normalizeNonEmptyString(process.env.OPENCLAW_STATE_DIR)) {
    const stateDir = process.env.OPENCLAW_STATE_DIR.trim();
    const stateConfigPath = looksLikeLinuxAbsolutePath(stateDir)
      ? `${stateDir.replace(/\/+$/, "")}/openclaw.json`
      : path.join(stateDir, "openclaw.json");
    const normalizedStateConfigPath = normalizeConfigPathValue(stateConfigPath);
    if (normalizedStateConfigPath) {
      return normalizedStateConfigPath;
    }
  }

  const localDefaultConfigPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
  if (fs.existsSync(localDefaultConfigPath)) {
    return localDefaultConfigPath;
  }

  const autoDetectedWslConfigPath = findAutoDetectedWslOpenClawConfigPathSync();
  if (autoDetectedWslConfigPath) {
    return autoDetectedWslConfigPath;
  }
  return localDefaultConfigPath;
}

export function resolveOpenClawSkillPath(linkConfig = {}) {
  return path.join(path.dirname(resolveOpenClawConfigPath(linkConfig)), "skills", "clawpilot-link", "SKILL.md");
}

export async function readOpenClawConfig(linkConfig = {}) {
  const configPath = resolveOpenClawConfigPath(linkConfig);
  if (!fileExists(configPath)) {
    return {
      exists: false,
      configPath,
      config: null,
      error: null,
    };
  }

  try {
    const raw = await fsp.readFile(configPath, "utf8");
    return {
      exists: true,
      configPath,
      config: JSON5.parse(raw),
      error: null,
    };
  } catch (error) {
    return {
      exists: true,
      configPath,
      config: null,
      error: error instanceof Error ? error.message : "config_read_failed",
    };
  }
}

function resolveGatewayAuth(config) {
  const gateway = config?.gateway ?? {};
  const auth = gateway?.auth ?? {};
  const mode = normalizeNonEmptyString(auth.mode);
  const token = normalizeNonEmptyString(auth.token);
  const password = normalizeNonEmptyString(auth.password);

  if (mode === "token" || (!mode && token)) {
    return token
      ? {
          authType: "token",
          secret: token,
          supported: true,
          message: null,
          setupReason: null,
        }
      : {
          authType: "token",
          secret: null,
          supported: false,
          message: "gateway.auth.token is missing.",
          setupReason: "auth_missing",
        };
  }

  if (mode === "password" || (!mode && password)) {
    return password
      ? {
          authType: "password",
          secret: password,
          supported: true,
          message: null,
          setupReason: null,
        }
      : {
          authType: "password",
          secret: null,
          supported: false,
          message: "gateway.auth.password is missing.",
          setupReason: "auth_missing",
        };
  }

  return {
    authType: mode ?? null,
    secret: null,
    supported: false,
    message: "Link currently needs OpenClaw shared-secret auth (token or password).",
    setupReason: "auth_unsupported",
  };
}

function buildLocalAuthHeaders(authType, secret) {
  const normalizedSecret = normalizeNonEmptyString(secret);
  if (!normalizedSecret) {
    return {};
  }

  if (authType === "password") {
    const basicValue = Buffer.from(`:${normalizedSecret}`, "utf8").toString("base64");
    return {
      authorization: `Basic ${basicValue}`,
      "x-openclaw-password": normalizedSecret,
    };
  }

  return {
    authorization: `Bearer ${normalizedSecret}`,
  };
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createRequestId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildGatewayErrorMessage(error, fallback = "Gateway handshake failed.") {
  if (error && typeof error === "object" && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function isGatewayPairingRequiredError(error) {
  const message =
    error && typeof error === "object" && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  const code =
    error && typeof error === "object" && typeof error.code === "string"
      ? error.code.trim()
      : "";
  const detailCode =
    error &&
    typeof error === "object" &&
    error.details &&
    typeof error.details === "object" &&
    typeof error.details.code === "string"
      ? error.details.code.trim()
      : "";

  return (
    code === "NOT_PAIRED" ||
    detailCode === "PAIRING_REQUIRED" ||
    message.includes("pairing required")
  );
}

function buildGatewayConnectErrorResult(error, fallbackMessage = "Gateway handshake failed.") {
  const requestId =
    error &&
    typeof error === "object" &&
    error.details &&
    typeof error.details === "object" &&
    typeof error.details.requestId === "string" &&
    error.details.requestId.trim()
      ? error.details.requestId.trim()
      : null;
  const code =
    error && typeof error === "object" && typeof error.code === "string"
      ? error.code.trim()
      : null;
  const detailCode =
    error &&
    typeof error === "object" &&
    error.details &&
    typeof error.details === "object" &&
    typeof error.details.code === "string"
      ? error.details.code.trim()
      : null;
  const message = buildGatewayErrorMessage(error, fallbackMessage);

  return {
    reachable: true,
    ready: false,
    approvalRequired: isGatewayPairingRequiredError(error),
    requestId,
    code,
    detailCode,
    message,
  };
}

async function buildGatewayConnectFrame(candidate, linkConfig, connectRequestId, nonce) {
  const auth =
    candidate.authType === "password"
      ? { password: candidate.secret }
      : { token: candidate.secret };
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
        displayName: normalizeNonEmptyString(linkConfig.displayName) ?? "ClawPilot Link",
        version: LINK_VERSION,
        platform: LOCAL_GATEWAY_CLIENT_PLATFORM,
        mode: "backend",
        instanceId: normalizeNonEmptyString(linkConfig.installId) ?? undefined,
      },
      caps: [...LOCAL_GATEWAY_CAPS],
      role: LOCAL_GATEWAY_ROLE,
      scopes: [...LOCAL_GATEWAY_SCOPES],
      auth,
      device,
    },
  });
}

async function probeGatewaySocket(candidate, linkConfig = {}) {
  return await new Promise((resolve) => {
    let settled = false;
    let opened = false;
    let connectRequestId = null;
    let lastSocketError = null;

    const socket = new WebSocket(candidate.wsEndpoint);
    const timeoutId = setTimeout(() => {
      finish({
        reachable: opened,
        ready: false,
        approvalRequired: false,
        requestId: null,
        code: null,
        detailCode: null,
        message: opened
          ? "Timed out while waiting for the OpenClaw Gateway handshake."
          : "OpenClaw Gateway socket did not open in time.",
      });
    }, GATEWAY_PROBE_TIMEOUT_MS);

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      try {
        socket.close();
      } catch {
        // Ignore close failures.
      }
      resolve(result);
    };

    socket.on("open", () => {
      opened = true;
    });

    socket.on("message", (rawData) => {
      const raw = typeof rawData === "string" ? rawData : rawData.toString("utf8");
      const parsed = safeJsonParse(raw);
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      if (
        parsed.type === "event" &&
        parsed.event === "connect.challenge" &&
        !connectRequestId
      ) {
        connectRequestId = createRequestId("link-probe");
        void buildGatewayConnectFrame(candidate, linkConfig, connectRequestId, parsed.payload?.nonce)
          .then((frame) => {
            socket.send(frame);
          })
          .catch((error) => {
            finish({
              reachable: true,
              ready: false,
              approvalRequired: false,
              requestId: null,
              code: null,
              detailCode: null,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to prepare the OpenClaw device identity.",
            });
          });
        return;
      }

      if (
        parsed.type === "res" &&
        typeof parsed.id === "string" &&
        parsed.id === connectRequestId
      ) {
        if (parsed.ok) {
          finish({
            reachable: true,
            ready: true,
            approvalRequired: false,
            requestId: null,
            code: null,
            detailCode: null,
            message: `OpenClaw Gateway handshake succeeded on ${candidate.httpBaseUrl}.`,
          });
          return;
        }

        finish(buildGatewayConnectErrorResult(parsed.error));
      }
    });

    socket.on("close", (code, reason) => {
      if (settled) {
        return;
      }

      const closeReason =
        typeof reason === "string"
          ? reason.trim()
          : reason?.toString("utf8").trim() ?? "";

      if (closeReason.toLowerCase().includes("pairing required")) {
        finish({
          reachable: opened,
          ready: false,
          approvalRequired: true,
          requestId: null,
          code: "NOT_PAIRED",
          detailCode: "PAIRING_REQUIRED",
          message: closeReason,
        });
        return;
      }

      finish({
        reachable: opened,
        ready: false,
        approvalRequired: false,
        requestId: null,
        code: null,
        detailCode: null,
        message:
          closeReason ||
          (lastSocketError instanceof Error
            ? lastSocketError.message
            : `OpenClaw Gateway socket closed (${code || "unknown"}).`),
      });
    });

    socket.on("error", (error) => {
      lastSocketError = error instanceof Error ? error : new Error(String(error));
    });
  });
}

async function probeHttpBaseUrl(candidate) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 4_000);

  try {
    const response = await fetch(`${candidate.httpBaseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-openclaw-scopes": "operator.write",
        ...buildLocalAuthHeaders(candidate.authType, candidate.secret),
      },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    return {
      reachable:
        response.ok ||
        [400, 401, 403, 404, 405, 422, 501].includes(response.status),
      status: response.status,
      message: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      reachable: false,
      status: 0,
      message: error instanceof Error ? error.message : "probe_failed",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildManualCandidate(linkConfig = {}) {
  const httpBaseUrl = normalizeBaseUrl(linkConfig.openClawBaseUrl);
  const authType = normalizeNonEmptyString(linkConfig.openClawAuthType);
  const secret = normalizeNonEmptyString(linkConfig.openClawSecret);

  if (!httpBaseUrl) {
    return null;
  }

  if (authType !== "token" && authType !== "password") {
    return {
      source: "manual",
      configPath: resolveOpenClawConfigPath(linkConfig),
      httpBaseUrl,
      wsEndpoint: buildWsEndpoint(httpBaseUrl),
      authType: authType ?? null,
      secret: null,
      port: Number(new URL(httpBaseUrl).port || (new URL(httpBaseUrl).protocol === "https:" ? 443 : 80)),
      supported: false,
      supportMessage: "Manual OpenClaw auth must be token or password.",
      setupReason: "auth_unsupported",
    };
  }

  if (!secret) {
    return {
      source: "manual",
      configPath: resolveOpenClawConfigPath(linkConfig),
      httpBaseUrl,
      wsEndpoint: buildWsEndpoint(httpBaseUrl),
      authType,
      secret: null,
      port: Number(new URL(httpBaseUrl).port || (new URL(httpBaseUrl).protocol === "https:" ? 443 : 80)),
      supported: false,
      supportMessage: `Manual OpenClaw ${authType} is missing.`,
      setupReason: "auth_missing",
    };
  }

  const parsed = new URL(httpBaseUrl);
  const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
  return {
    source: "manual",
    configPath: resolveOpenClawConfigPath(linkConfig),
    httpBaseUrl,
    wsEndpoint: buildWsEndpoint(httpBaseUrl),
    authType,
    secret,
    port,
    supported: true,
    supportMessage: null,
    setupReason: null,
  };
}

function buildConfigCandidate(configResult, configAuth) {
  const gateway = configResult.config?.gateway ?? {};
  const rawPort = Number(gateway.port ?? DEFAULT_GATEWAY_PORT);
  const port = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : DEFAULT_GATEWAY_PORT;
  const httpBaseUrl = `http://127.0.0.1:${port}`;
  return {
    source: "config",
    configPath: configResult.configPath,
    httpBaseUrl,
    wsEndpoint: buildWsEndpoint(httpBaseUrl),
    authType: configAuth.authType,
    secret: configAuth.secret,
    port,
    supported: configAuth.supported,
    supportMessage: configAuth.message,
    setupReason: configAuth.setupReason,
  };
}

function buildLocalProbeCandidate(configResult, configAuth) {
  const httpBaseUrl = `http://127.0.0.1:${DEFAULT_GATEWAY_PORT}`;
  let supportMessage = "OpenClaw config was not found, so Link cannot read gateway auth.";
  let setupReason = "config_missing";

  if (configResult.exists && configResult.error) {
    supportMessage = `OpenClaw config could not be read: ${configResult.error}`;
    setupReason = "config_invalid";
  } else if (configAuth && !configAuth.supported) {
    supportMessage = configAuth.message;
    setupReason = configAuth.setupReason;
  } else if (configResult.exists && configResult.config) {
    supportMessage = "OpenClaw is reachable, but Link could not confirm the local auth from openclaw.json.";
    setupReason = "config_mismatch";
  }

  return {
    source: "probe",
    configPath: configResult.configPath,
    httpBaseUrl,
    wsEndpoint: buildWsEndpoint(httpBaseUrl),
    authType: null,
    secret: null,
    port: DEFAULT_GATEWAY_PORT,
    supported: false,
    supportMessage,
    setupReason,
  };
}

function buildReachableBackend(candidate, configResult, gatewayProbe = null) {
  const gatewayReady = candidate.supported && gatewayProbe?.ready !== false;
  const approvalRequired = gatewayProbe?.approvalRequired === true;
  const setupReason =
    candidate.supported && !gatewayReady
      ? approvalRequired
        ? "approval_required"
        : "gateway_handshake_failed"
      : candidate.setupReason;
  const message =
    candidate.supported
      ? gatewayReady
        ? `OpenClaw is reachable on ${candidate.httpBaseUrl}.`
        : approvalRequired
          ? gatewayProbe?.requestId
            ? `OpenClaw still needs this Link to be approved first (requestId: ${gatewayProbe.requestId}).`
            : "OpenClaw still needs this Link to be approved first."
          : gatewayProbe?.message ??
            `OpenClaw is reachable on ${candidate.httpBaseUrl}, but Link could not finish the Gateway handshake.`
      : candidate.supportMessage;

  return {
    detected: true,
    healthy: gatewayReady,
    supported: candidate.supported,
    message,
    configPath: candidate.configPath,
    configExists: configResult.exists,
    configError: configResult.error,
    httpBaseUrl: candidate.httpBaseUrl,
    wsEndpoint: candidate.wsEndpoint,
    authType: candidate.authType,
    secret: candidate.secret,
    source: candidate.source,
    port: candidate.port,
    approvalRequired,
    approvalRequestId: gatewayProbe?.requestId ?? null,
    connectErrorCode: gatewayProbe?.code ?? null,
    connectErrorDetailCode: gatewayProbe?.detailCode ?? null,
    setupReason,
    checkedAt: new Date().toISOString(),
  };
}

export async function probeManualOpenClawBackend(params) {
  const candidate = buildManualCandidate({
    openClawBaseUrl: params?.openClawBaseUrl,
    openClawAuthType: params?.openClawAuthType,
    openClawSecret: params?.openClawSecret,
    installId: params?.installId,
    displayName: params?.displayName,
  });

  if (!candidate) {
    return {
      detected: false,
      healthy: false,
      supported: false,
      message: "Manual OpenClaw URL is invalid.",
      httpBaseUrl: null,
      wsEndpoint: null,
      authType: null,
      secret: null,
      source: "manual",
      port: null,
      setupReason: "manual_invalid",
      checkedAt: new Date().toISOString(),
    };
  }

  if (!candidate.supported) {
    return {
      detected: false,
      healthy: false,
      supported: false,
      message: candidate.supportMessage,
      httpBaseUrl: candidate.httpBaseUrl,
      wsEndpoint: candidate.wsEndpoint,
      authType: candidate.authType,
      secret: candidate.secret,
      source: candidate.source,
      port: candidate.port,
      setupReason: candidate.setupReason,
      checkedAt: new Date().toISOString(),
    };
  }

  const probe = await probeHttpBaseUrl(candidate);
  if (!probe.reachable) {
    return {
      detected: false,
      healthy: false,
      supported: true,
      message: `OpenClaw is not reachable at ${candidate.httpBaseUrl}.`,
      httpBaseUrl: candidate.httpBaseUrl,
      wsEndpoint: candidate.wsEndpoint,
      authType: candidate.authType,
      secret: candidate.secret,
      source: candidate.source,
      port: candidate.port,
      setupReason: "unreachable",
      checkedAt: new Date().toISOString(),
    };
  }

  const gatewayProbe = await probeGatewaySocket(candidate, params);
  return buildReachableBackend(
    candidate,
    {
      exists: false,
      configPath: candidate.configPath,
      error: null,
    },
    gatewayProbe,
  );
}

export async function detectOpenClawBackend(linkConfig = {}) {
  const configResult = await readOpenClawConfig(linkConfig);
  const configAuth = configResult.config ? resolveGatewayAuth(configResult.config) : null;
  const manualCandidate = buildManualCandidate(linkConfig);
  const candidates = [];

  if (manualCandidate) {
    candidates.push(manualCandidate);
  } else {
    if (configResult.config && configAuth) {
      candidates.push(buildConfigCandidate(configResult, configAuth));
    }
    candidates.push(buildLocalProbeCandidate(configResult, configAuth));
  }

  for (const candidate of candidates) {
    const probe = await probeHttpBaseUrl(candidate);
    if (!probe.reachable) {
      continue;
    }
    const gatewayProbe =
      candidate.supported ? await probeGatewaySocket(candidate, linkConfig) : null;
    return buildReachableBackend(candidate, configResult, gatewayProbe);
  }

  if (manualCandidate) {
    return {
      detected: false,
      healthy: false,
      supported: manualCandidate.supported,
      message: `OpenClaw is not reachable at ${manualCandidate.httpBaseUrl}.`,
      configPath: manualCandidate.configPath,
      configExists: configResult.exists,
      configError: configResult.error,
      httpBaseUrl: manualCandidate.httpBaseUrl,
      wsEndpoint: manualCandidate.wsEndpoint,
      authType: manualCandidate.authType,
      secret: manualCandidate.secret,
      source: manualCandidate.source,
      port: manualCandidate.port,
      approvalRequired: false,
      approvalRequestId: null,
      connectErrorCode: null,
      connectErrorDetailCode: null,
      setupReason: "unreachable",
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    detected: false,
    healthy: false,
    supported: false,
    message:
      configResult.exists && configResult.error
        ? `OpenClaw config could not be read: ${configResult.error}`
        : "OpenClaw is not reachable on this computer.",
    configPath: configResult.configPath,
    configExists: configResult.exists,
    configError: configResult.error,
    httpBaseUrl: null,
    wsEndpoint: null,
    authType: null,
    secret: null,
    source: null,
    port: null,
    approvalRequired: false,
    approvalRequestId: null,
    connectErrorCode: null,
    connectErrorDetailCode: null,
    setupReason:
      configResult.exists && configResult.error ? "config_invalid" : "unreachable",
    checkedAt: new Date().toISOString(),
  };
}

export async function writeBackendCache(backend) {
  await fsp.writeFile(
    path.join(runtimePaths.cacheDir, "openclaw.json"),
    `${JSON.stringify(backend, null, 2)}\n`,
    "utf8",
  );
}

function buildSkillContent(language) {
  if (language === "zh-Hans") {
    return `# ClawPilot Link

这台电脑已经安装了 ClawPilot Link。

它负责把这台电脑上的 OpenClaw 连接给 ClawPilot App 使用。
App 连接这台 Link 时，默认顺序是：

1. 同一家庭局域网优先走局域网直连
2. 局域网不通时，再尝试公网直连
3. 前两种都不通时，最后才走 Relay 兜底

对用户优先使用这些命令：

- \`clawlink help\`
- \`clawlink version\`
- \`clawlink pair\`
- \`clawlink start\`
- \`clawlink status --json\`
- \`clawlink doctor --json\`
- \`clawlink restart\`
- \`clawlink stop\`
- \`clawlink autostart on\`
- \`clawlink autostart off\`
- \`clawlink uninstall --yes\`

命令选择规则：

- 首次配对，或者让另一台手机 / 平板加入同一个 Link：\`clawlink pair\`
- 这台电脑已经配对，但后台服务现在没在运行：\`clawlink start\`
- npm 更新之后，或者修复了端口 / 网络 / 本地配置问题之后：\`clawlink restart\`
- 想确认现在是否在线、App 会怎么连接：\`clawlink status --json\`
- 连不上、反复掉线、局域网 / 公网 / Relay 表现不对：\`clawlink doctor --json\`
- 想让这台电脑登录后自动恢复 Link：\`clawlink autostart on\`
- 准备从这台电脑移除 Link：\`clawlink uninstall --yes\`
- 只想确认当前安装版本：\`clawlink version\`

对用户不要主动暴露这些底层细节：

- 不要默认教用户使用 \`clawlink qr\`
- 不要默认教用户使用旧的 \`connect\`
- 默认只讲 \`clawlink pair\`

会影响现有连接或有明显后果的命令，必须先征求用户确认：

- \`clawlink stop\`
- \`clawlink autostart off\`
- \`clawlink uninstall\`
- \`clawlink unpair\`

如果用户只是说“连不上”、“掉线了”或者“为什么没有自动切换连接方式”，先运行：

1. \`clawlink status --json\`
2. \`clawlink doctor --json\`

然后：

1. 用普通人能看懂的话解释现在发生了什么
2. 只给用户下一步最合适的命令
3. 不要一次扔太多技术细节
`;
  }

  return `# ClawPilot Link

ClawPilot Link is installed on this computer.

It connects the local OpenClaw on this computer to ClawPilot App.
When the app connects through this Link, the normal order is:

1. local network direct first
2. public direct next
3. Relay fallback last

Prefer these commands for users:

- \`clawlink help\`
- \`clawlink version\`
- \`clawlink pair\`
- \`clawlink start\`
- \`clawlink status --json\`
- \`clawlink doctor --json\`
- \`clawlink restart\`
- \`clawlink stop\`
- \`clawlink autostart on\`
- \`clawlink autostart off\`
- \`clawlink uninstall --yes\`

Command guide:

- First-time setup, or letting another phone or tablet join the same Link: \`clawlink pair\`
- Already paired, but the background service is not running now: \`clawlink start\`
- After an npm update, or after fixing a local port / network / config issue: \`clawlink restart\`
- To check whether Link is online and how the app should connect right now: \`clawlink status --json\`
- If Link cannot connect, keeps dropping, or LAN / public / Relay behavior looks wrong: \`clawlink doctor --json\`
- To make Link come back automatically after sign-in: \`clawlink autostart on\`
- To prepare this computer for removing Link: \`clawlink uninstall --yes\`
- To confirm which version is installed: \`clawlink version\`

Do not lead users into these lower-level details unless they explicitly ask:

- do not default to \`clawlink qr\`
- do not default to the old \`connect\` command
- use \`clawlink pair\` as the normal pairing command

Ask for confirmation before running commands that can interrupt the current setup:

- \`clawlink stop\`
- \`clawlink autostart off\`
- \`clawlink uninstall\`
- \`clawlink unpair\`

If the user says Link is offline, disconnecting, or not switching routes as expected, check:

1. \`clawlink status --json\`
2. \`clawlink doctor --json\`

Then:

1. explain what happened in plain language
2. give the single best next command
3. avoid dumping unnecessary technical detail
`;
}

export async function installSkill(language, linkConfig = {}) {
  const skillPath = resolveOpenClawSkillPath(linkConfig);
  await fsp.mkdir(path.dirname(skillPath), { recursive: true });
  await fsp.writeFile(skillPath, buildSkillContent(language), "utf8");
  return {
    skillPath,
  };
}

export async function removeInstalledSkill(linkConfig = {}) {
  const skillPath = resolveOpenClawSkillPath(linkConfig);
  const skillDir = path.dirname(skillPath);
  await fsp.rm(skillDir, {
    recursive: true,
    force: true,
  });
  return {
    skillPath,
  };
}

export function buildLocalGatewayRequestHeaders(backend) {
  return {
    ...buildLocalAuthHeaders(backend.authType, backend.secret),
  };
}
