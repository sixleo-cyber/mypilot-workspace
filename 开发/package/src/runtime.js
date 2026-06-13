import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const HOME_DIR = os.homedir();
const BASE_DIR = path.join(HOME_DIR, ".clawpilot", "link");
const RUN_DIR = path.join(BASE_DIR, "run");
const LOG_DIR = path.join(BASE_DIR, "logs");
const CACHE_DIR = path.join(BASE_DIR, "cache");
const FILE_LOCK_STALE_MS = 15_000;
const FILE_LOCK_TIMEOUT_MS = 8_000;
const FILE_LOCK_RETRY_MS = 40;
const LOG_ROTATION_MAX_BYTES = 5 * 1024 * 1024;
const LOG_ROTATION_BACKUP_COUNT = 3;
const LOG_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

const LINK_LOG_SOURCES = Object.freeze({
  "current.log": {
    filePath: path.join(LOG_DIR, "current.log"),
    includeBackups: true,
  },
  "autostart.stdout.log": {
    filePath: path.join(LOG_DIR, "autostart.stdout.log"),
    includeBackups: false,
  },
  "autostart.stderr.log": {
    filePath: path.join(LOG_DIR, "autostart.stderr.log"),
    includeBackups: false,
  },
});

export const runtimePaths = Object.freeze({
  baseDir: BASE_DIR,
  runDir: RUN_DIR,
  logDir: LOG_DIR,
  cacheDir: CACHE_DIR,
  autostartDir: path.join(BASE_DIR, "autostart"),
  configFile: path.join(BASE_DIR, "config.json"),
  stateFile: path.join(BASE_DIR, "state.json"),
  credentialsFile: path.join(BASE_DIR, "credentials.json"),
  deviceIdentityFile: path.join(BASE_DIR, "device-identity.json"),
  logFile: path.join(LOG_DIR, "current.log"),
  autostartShellLauncher: path.join(BASE_DIR, "autostart", "link-daemon.sh"),
  autostartWindowsLauncher: path.join(BASE_DIR, "autostart", "link-daemon.cmd"),
  autostartWindowsPowerShellLauncher: path.join(BASE_DIR, "autostart", "link-daemon.ps1"),
  autostartStdoutLogFile: path.join(LOG_DIR, "autostart.stdout.log"),
  autostartStderrLogFile: path.join(LOG_DIR, "autostart.stderr.log"),
  daemonLockFile: path.join(RUN_DIR, "daemon.lock"),
  stateLockFile: path.join(RUN_DIR, "state.lock"),
  credentialsLockFile: path.join(RUN_DIR, "credentials.lock"),
  logLockFile: path.join(RUN_DIR, "log.lock"),
  socketFile:
    process.platform === "win32"
      ? `\\\\.\\pipe\\clawpilot-link-${crypto.createHash("sha1").update(BASE_DIR).digest("hex").slice(0, 12)}`
      : path.join(RUN_DIR, "daemon.sock"),
});

export const linkLogSourceNames = Object.freeze(Object.keys(LINK_LOG_SOURCES));

export function randomId(prefix) {
  return `${prefix}${crypto.randomUUID().replace(/-/g, "")}`;
}

function randomSecret(byteLength = 24) {
  return crypto.randomBytes(byteLength).toString("base64url");
}

export function encodeBase64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function ensureRuntimeLayout() {
  await Promise.all([
    fsp.mkdir(runtimePaths.baseDir, { recursive: true }),
    fsp.mkdir(runtimePaths.runDir, { recursive: true }),
    fsp.mkdir(runtimePaths.logDir, { recursive: true }),
    fsp.mkdir(runtimePaths.cacheDir, { recursive: true }),
    fsp.mkdir(runtimePaths.autostartDir, { recursive: true }),
  ]);
}

async function readJsonFile(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await ensureRuntimeLayout();
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(tempPath, filePath);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireFileLock(lockPath, options = {}) {
  await ensureRuntimeLayout();
  const staleMs = Number.isFinite(options.staleMs) ? options.staleMs : FILE_LOCK_STALE_MS;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : FILE_LOCK_TIMEOUT_MS;
  const retryMs = Number.isFinite(options.retryMs) ? options.retryMs : FILE_LOCK_RETRY_MS;
  const startedAt = Date.now();

  while (true) {
    try {
      const handle = await fsp.open(lockPath, "wx");
      await handle.writeFile(
        JSON.stringify({
          pid: process.pid,
          lockedAt: new Date().toISOString(),
        }),
        "utf8",
      );
      return handle;
    } catch (error) {
      if (!error || typeof error !== "object" || error.code !== "EEXIST") {
        throw error;
      }

      try {
        const stats = await fsp.stat(lockPath);
        if (Date.now() - stats.mtimeMs > staleMs) {
          await fsp.unlink(lockPath);
          continue;
        }
      } catch (statError) {
        if (statError && typeof statError === "object" && statError.code === "ENOENT") {
          continue;
        }
        throw statError;
      }

      if (Date.now() - startedAt > timeoutMs) {
        throw new Error(`lock_timeout:${path.basename(lockPath)}`);
      }

      await sleep(retryMs);
    }
  }
}

async function withFileLock(lockPath, fn, options = {}) {
  const handle = await acquireFileLock(lockPath, options);
  try {
    return await fn();
  } finally {
    await handle.close().catch(() => undefined);
    await fsp.unlink(lockPath).catch(() => undefined);
  }
}

export function buildDefaultConfig() {
  return {
    installId: randomId("cplink_install_"),
    displayName: os.hostname() || "ClawPilot Link",
    language: "auto",
    apiBaseUrl: "https://api.clawpilot.me",
    relayBaseUrl: "https://relay.clawpilot.me",
    directAccessKey: randomSecret(),
    openClawConfigPath: null,
    openClawBaseUrl: null,
    openClawAuthType: null,
    openClawSecret: null,
  };
}

export function buildDefaultState() {
  return {
    connectionStatus: "new",
    lastErrorMessage: null,
    linkId: null,
    pairingSession: null,
    daemon: {
      pid: null,
      startedAt: null,
      connectedAt: null,
      lastHeartbeatAt: null,
      lastLaunchError: null,
      lastLaunchFailedAt: null,
    },
    backend: {
      detected: false,
      healthy: false,
      supported: false,
      message: null,
      setupReason: null,
      configPath: null,
      configExists: false,
      configError: null,
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
      checkedAt: null,
    },
    directAccess: {
      status: "unknown",
      port: null,
      lanIpv4Hosts: [],
      lanIpv4CheckedAt: null,
      reason: null,
      message: null,
      checkedAt: null,
    },
    publicDirect: {
      status: "unknown",
      port: null,
      ipv4Host: null,
      ipv4ObservedAt: null,
      ipv6Host: null,
      ipv6ObservedAt: null,
      reason: null,
      message: null,
      checkedAt: null,
    },
    relay: {
      recentDisconnectCount: 0,
      reconnectWindowStartedAt: null,
      nextReconnectAt: null,
      cooldownUntil: null,
      lastDisconnectAt: null,
      lastDisconnectCode: null,
      lastDisconnectReason: null,
      lastDisconnectMessage: null,
      lastStableConnectionDurationMs: null,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function buildStoppedStatePatch(currentState, options = {}) {
  const hasLinkId = options.hasLinkId === true;
  const revoked = currentState?.connectionStatus === "revoked";

  return {
    connectionStatus: revoked ? "revoked" : hasLinkId ? "paired" : "new",
    lastErrorMessage: revoked ? currentState?.lastErrorMessage ?? null : null,
    daemon: {
      pid: null,
      startedAt: null,
      connectedAt: null,
      lastHeartbeatAt: null,
      lastLaunchError: currentState?.daemon?.lastLaunchError ?? null,
      lastLaunchFailedAt: currentState?.daemon?.lastLaunchFailedAt ?? null,
    },
    directAccess: {
      ...buildDefaultState().directAccess,
    },
    publicDirect: {
      ...buildDefaultState().publicDirect,
    },
    relay: {
      recentDisconnectCount: 0,
      reconnectWindowStartedAt: null,
      nextReconnectAt: null,
      cooldownUntil: null,
    },
  };
}

export async function loadConfig() {
  await ensureRuntimeLayout();
  const existing = await readJsonFile(runtimePaths.configFile);
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const merged = {
      ...buildDefaultConfig(),
      ...existing,
    };
    const normalizedRelayBaseUrl = normalizeHttpsBaseUrl(merged.relayBaseUrl);
    if (normalizedRelayBaseUrl) {
      merged.relayBaseUrl = normalizedRelayBaseUrl;
    }
    return {
      ...merged,
    };
  }
  const created = buildDefaultConfig();
  await writeJsonFile(runtimePaths.configFile, created);
  return created;
}

export async function saveConfig(config) {
  await writeJsonFile(runtimePaths.configFile, config);
}

function normalizeStateSnapshot(state) {
  return {
    ...buildDefaultState(),
    ...state,
    daemon: {
      ...buildDefaultState().daemon,
      ...(state.daemon ?? {}),
    },
    backend: {
      ...buildDefaultState().backend,
      ...(state.backend ?? {}),
    },
    directAccess: {
      ...buildDefaultState().directAccess,
      ...(state.directAccess ?? {}),
    },
    publicDirect: {
      ...buildDefaultState().publicDirect,
      ...(state.publicDirect ?? {}),
    },
    relay: {
      ...buildDefaultState().relay,
      ...(state.relay ?? {}),
    },
  };
}

export async function loadState() {
  await ensureRuntimeLayout();
  const existing = await readJsonFile(runtimePaths.stateFile);
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return normalizeStateSnapshot(existing);
  }
  const created = buildDefaultState();
  await writeJsonFile(runtimePaths.stateFile, created);
  return created;
}

async function saveStateUnlocked(state) {
  const nextState = {
    ...normalizeStateSnapshot(state),
    updatedAt: new Date().toISOString(),
  };
  await writeJsonFile(runtimePaths.stateFile, nextState);
  return nextState;
}

export async function saveState(state) {
  return await withFileLock(runtimePaths.stateLockFile, async () => {
    return await saveStateUnlocked(state);
  });
}

export async function patchState(patchOrUpdater) {
  return await withFileLock(runtimePaths.stateLockFile, async () => {
    const current = await readJsonFile(runtimePaths.stateFile);
    const normalizedCurrent =
      current && typeof current === "object" && !Array.isArray(current)
        ? normalizeStateSnapshot(current)
        : buildDefaultState();
    const patch =
      typeof patchOrUpdater === "function"
        ? await patchOrUpdater(normalizedCurrent)
        : patchOrUpdater;
    const normalizedPatch =
      patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};

    return await saveStateUnlocked({
      ...normalizedCurrent,
      ...normalizedPatch,
      daemon: {
        ...normalizedCurrent.daemon,
        ...(normalizedPatch.daemon ?? {}),
      },
      backend: {
        ...normalizedCurrent.backend,
        ...(normalizedPatch.backend ?? {}),
      },
      directAccess: {
        ...normalizedCurrent.directAccess,
        ...(normalizedPatch.directAccess ?? {}),
      },
      publicDirect: {
        ...normalizedCurrent.publicDirect,
        ...(normalizedPatch.publicDirect ?? {}),
      },
      relay: {
        ...normalizedCurrent.relay,
        ...(normalizedPatch.relay ?? {}),
      },
    });
  });
}

export async function loadCredentials() {
  await ensureRuntimeLayout();
  const defaults = {
    linkId: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    accessToken: null,
    accessTokenExpiresAt: null,
    accessTokenClientVersion: null,
    connectTokenSecret: null,
  };
  const existing = await readJsonFile(runtimePaths.credentialsFile);
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return {
      ...defaults,
      ...existing,
    };
  }
  return defaults;
}

export async function saveCredentials(credentials) {
  return await withFileLock(runtimePaths.credentialsLockFile, async () => {
    await writeJsonFile(runtimePaths.credentialsFile, credentials);
    return credentials;
  });
}

export async function clearCredentials() {
  return await saveCredentials({
    linkId: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    accessToken: null,
    accessTokenExpiresAt: null,
    accessTokenClientVersion: null,
    connectTokenSecret: null,
  });
}

async function rotateLogFilesIfNeeded() {
  let stats = null;
  try {
    stats = await fsp.stat(runtimePaths.logFile);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (!stats || stats.size < LOG_ROTATION_MAX_BYTES) {
    return;
  }

  const oldestBackupPath = `${runtimePaths.logFile}.${LOG_ROTATION_BACKUP_COUNT}`;
  await fsp.unlink(oldestBackupPath).catch(() => undefined);

  for (let index = LOG_ROTATION_BACKUP_COUNT - 1; index >= 1; index -= 1) {
    const fromPath = `${runtimePaths.logFile}.${index}`;
    const toPath = `${runtimePaths.logFile}.${index + 1}`;
    await fsp.rename(fromPath, toPath).catch(() => undefined);
  }

  await fsp.rename(runtimePaths.logFile, `${runtimePaths.logFile}.1`).catch(() => undefined);
}

async function pruneExpiredManagedLogFilesUnlocked(now = Date.now()) {
  const cutoffTime = now - LOG_RETENTION_MS;
  const managedPaths = new Set([
    runtimePaths.logFile,
    runtimePaths.autostartStdoutLogFile,
    runtimePaths.autostartStderrLogFile,
  ]);

  for (let index = 1; index <= LOG_ROTATION_BACKUP_COUNT; index += 1) {
    managedPaths.add(`${runtimePaths.logFile}.${index}`);
  }

  for (const filePath of managedPaths) {
    let stats = null;
    try {
      stats = await fsp.stat(filePath);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    if (!stats || stats.mtimeMs >= cutoffTime) {
      continue;
    }

    await fsp.unlink(filePath).catch(() => undefined);
  }
}

function normalizeLinkLogSourceName(value) {
  if (typeof value !== "string") {
    return "current.log";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "current" || normalized === "current.log") {
    return "current.log";
  }
  if (
    normalized === "stdout" ||
    normalized === "autostart.stdout" ||
    normalized === "autostart.stdout.log"
  ) {
    return "autostart.stdout.log";
  }
  if (
    normalized === "stderr" ||
    normalized === "autostart.stderr" ||
    normalized === "autostart.stderr.log"
  ) {
    return "autostart.stderr.log";
  }
  return "current.log";
}

function normalizeLogTailLimit(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }
  return Math.min(parsed, 500);
}

async function collectExistingLogFilesForSourceUnlocked(sourceName) {
  const source = LINK_LOG_SOURCES[sourceName] ?? LINK_LOG_SOURCES["current.log"];
  const candidatePaths = [];
  if (source.includeBackups) {
    for (let index = LOG_ROTATION_BACKUP_COUNT; index >= 1; index -= 1) {
      candidatePaths.push(`${source.filePath}.${index}`);
    }
  }
  candidatePaths.push(source.filePath);

  const existingFiles = [];
  for (const filePath of candidatePaths) {
    try {
      const stats = await fsp.stat(filePath);
      existingFiles.push({
        filePath,
        size: stats.size,
      });
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
  }

  return existingFiles;
}

function splitLogLines(raw) {
  if (typeof raw !== "string" || !raw.length) {
    return [];
  }
  const normalized = raw.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
}

function shouldKeepLinkLogLine(sourceName, line) {
  if (sourceName !== "current.log") {
    return true;
  }

  if (typeof line !== "string" || !line.trim()) {
    return false;
  }

  try {
    const payload = JSON.parse(line);
    return (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      typeof payload.ts === "string" &&
      payload.ts.trim() &&
      typeof payload.level === "string" &&
      payload.level.trim() &&
      typeof payload.component === "string" &&
      payload.component.trim() &&
      typeof payload.message === "string"
    );
  } catch {
    return false;
  }
}

export async function readLinkLogSnapshot(options = {}) {
  const sourceName = normalizeLinkLogSourceName(options.source);
  const limit = normalizeLogTailLimit(options.limit);

  return await withFileLock(runtimePaths.logLockFile, async () => {
    await pruneExpiredManagedLogFilesUnlocked();

    const files = await collectExistingLogFilesForSourceUnlocked(sourceName);
    const allLines = [];
    let totalSize = 0;

    for (const file of files) {
      totalSize += file.size;
      const raw = await fsp.readFile(file.filePath, "utf8").catch((error) => {
        if (error && typeof error === "object" && error.code === "ENOENT") {
          return "";
        }
        throw error;
      });
      allLines.push(
        ...splitLogLines(raw).filter((line) =>
          shouldKeepLinkLogLine(sourceName, line),
        ),
      );
    }

    const truncated = allLines.length > limit;
    return {
      file: LINK_LOG_SOURCES[sourceName]?.filePath ?? runtimePaths.logFile,
      cursor: null,
      size: totalSize,
      truncated,
      reset: false,
      lines: truncated ? allLines.slice(-limit) : allLines,
    };
  });
}

export async function appendLogLine(level, component, message, extra = undefined) {
  await ensureRuntimeLayout();
  const payload = {
    ts: new Date().toISOString(),
    level,
    component,
    message,
    ...(extra && typeof extra === "object" ? extra : {}),
  };
  await withFileLock(runtimePaths.logLockFile, async () => {
    await pruneExpiredManagedLogFilesUnlocked();
    await rotateLogFilesIfNeeded();
    await fsp.appendFile(runtimePaths.logFile, `${JSON.stringify(payload)}\n`, "utf8");
  });
}

export function logger(component) {
  return {
    info(message, extra) {
      return appendLogLine("info", component, message, extra);
    },
    warn(message, extra) {
      return appendLogLine("warn", component, message, extra);
    },
    error(message, extra) {
      return appendLogLine("error", component, message, extra);
    },
  };
}

export function normalizeNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

export function normalizeHttpsBaseUrl(value) {
  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") {
    return null;
  }

  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

export function parseTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
}

export function fileExists(filePath) {
  return fs.existsSync(filePath);
}
