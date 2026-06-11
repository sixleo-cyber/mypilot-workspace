#!/usr/bin/env node
import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import qrcode from "qrcode-terminal";
import {
  disableAutostart,
  enableAutostart,
  getAutostartCapability,
  getAutostartStatus,
  isAutostartError,
  refreshAutostartLaunchersIfEnabled,
} from "./autostart.js";
import { LinkDaemon, isDaemonRunning, sendIpcRequest, spawnBackgroundDaemon, waitForDaemonReady } from "./daemon.js";
import { createTranslator, isSupportedLanguage, resolveLanguage } from "./i18n.js";
import { ServerApiError, createPairingSession, bootstrapLink } from "./server-api.js";
import { LINK_DIRECT_PORT, listLanIpv4Addresses } from "./network.js";
import {
  appendLogLine,
  buildStoppedStatePatch,
  encodeBase64UrlJson,
  ensureRuntimeLayout,
  fileExists,
  loadConfig,
  loadCredentials,
  loadState,
  normalizeHttpsBaseUrl,
  parseTimestamp,
  patchState,
  runtimePaths,
  saveConfig,
  saveCredentials,
} from "./runtime.js";
import {
  detectOpenClawBackend,
  installSkill,
  normalizeOpenClawConfigPathInput,
  probeManualOpenClawBackend,
  removeInstalledSkill,
  resolveOpenClawSkillPath,
} from "./openclaw.js";
import { LINK_VERSION } from "./constants.js";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const QRCodeModel = require("qrcode-terminal/vendor/QRCode");
const QRErrorCorrectLevel = require("qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel");
const AUTO_APPROVAL_POLL_INTERVAL_MS = 400;
const AUTO_APPROVAL_POLL_TIMEOUT_MS = 4_000;
const AUTO_APPROVAL_RECHECK_INTERVAL_MS = 250;
const AUTO_APPROVAL_RECHECK_ATTEMPTS = 8;
const QR_SVG_MARGIN_MODULES = 4;
const QR_SVG_MODULE_SIZE_PX = 8;

function buildClearedCredentials() {
  return {
    linkId: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    accessToken: null,
    accessTokenExpiresAt: null,
    connectTokenSecret: null,
  };
}

function resolveCurrentCliScriptCandidates() {
  const candidates = new Set();
  const rawArgvPath = typeof process.argv[1] === "string" ? process.argv[1].trim() : "";
  const modulePath = fileURLToPath(import.meta.url);

  for (const candidate of [rawArgvPath, modulePath]) {
    if (!candidate) {
      continue;
    }
    const absolute = path.resolve(candidate);
    candidates.add(absolute);
    try {
      candidates.add(fs.realpathSync(absolute));
    } catch {
      // Ignore missing/invalid paths and keep the absolute fallback.
    }
  }

  return [...candidates];
}

function parseFlags(argv) {
  const flags = new Set();
  const values = [];
  for (const item of argv) {
    if (item.startsWith("-")) {
      flags.add(item);
    } else {
      values.push(item);
    }
  }
  return {
    flags,
    values,
  };
}

function formatAutostartFailureReason(translator, error) {
  const errorCode =
    typeof error?.code === "string" && error.code.trim()
      ? error.code.trim()
      : typeof error?.reasonCode === "string" && error.reasonCode.trim()
        ? error.reasonCode.trim()
        : null;
  const detail =
    typeof error?.detail === "string" && error.detail.trim()
      ? error.detail.trim()
      : error instanceof Error && typeof error.message === "string" && error.message.trim()
        ? error.message.trim()
        : typeof error === "string" && error.trim()
          ? error.trim()
          : null;

  if (isAutostartError(error) || errorCode) {
    switch (errorCode) {
      case "linux_container":
        return translator.t("autostartReasonLinuxContainer");
      case "linux_systemctl_missing":
        return translator.t("autostartReasonLinuxSystemctlMissing");
      case "linux_user_systemd_unavailable":
        return translator.t("autostartReasonLinuxUserSystemdUnavailable");
      case "linux_daemon_reload_failed":
        return detail
          ? translator.t("autostartReasonLinuxDaemonReloadFailedWithDetail", { detail })
          : translator.t("autostartReasonLinuxDaemonReloadFailed");
      case "linux_enable_failed":
        return detail
          ? translator.t("autostartReasonLinuxEnableFailedWithDetail", { detail })
          : translator.t("autostartReasonLinuxEnableFailed");
      default:
        return detail
          ? translator.t("autostartReasonGenericWithDetail", { detail })
          : translator.t("autostartReasonGeneric");
    }
  }

  return detail
    ? translator.t("autostartReasonGenericWithDetail", { detail })
    : translator.t("autostartReasonGeneric");
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

async function listUnixLinkDaemonPids() {
  if (process.platform === "win32") {
    return [];
  }

  const scriptCandidates = resolveCurrentCliScriptCandidates();
  if (scriptCandidates.length === 0) {
    return [];
  }

  try {
    const { stdout } = await execFileAsync("ps", ["-axo", "pid=,command="], {
      encoding: "utf8",
    });

    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (!match) {
          return null;
        }
        const pid = Number.parseInt(match[1], 10);
        const command = match[2];
        if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
          return null;
        }
        if (!looksLikeCurrentLinkDaemonCommand(command, scriptCandidates)) {
          return null;
        }
        return pid;
      })
      .filter((pid) => Number.isInteger(pid));
  } catch {
    return [];
  }
}

function looksLikeCurrentLinkDaemonCommand(command, scriptCandidates = resolveCurrentCliScriptCandidates()) {
  if (typeof command !== "string" || !command.trim()) {
    return false;
  }

  return command.includes(" daemon") && scriptCandidates.some((candidate) => command.includes(candidate));
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

async function readDaemonLockSnapshot() {
  try {
    const raw = await fsp.readFile(runtimePaths.daemonLockFile, "utf8");
    const parsed = safeJsonParse(raw);
    return {
      exists: true,
      snapshot: parsed && typeof parsed === "object" ? parsed : null,
      error: parsed && typeof parsed === "object" ? null : "invalid_json",
    };
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {
        exists: false,
        snapshot: null,
        error: null,
      };
    }
    return {
      exists: true,
      snapshot: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function normalizeDaemonLaunchError(state) {
  const daemonState = state?.daemon;
  const message =
    typeof daemonState?.lastLaunchError === "string" && daemonState.lastLaunchError.trim()
      ? daemonState.lastLaunchError.trim()
      : null;
  const failedAtMs = parseTimestamp(daemonState?.lastLaunchFailedAt);
  const startedAtMs = parseTimestamp(daemonState?.startedAt);

  if (!message || failedAtMs <= 0) {
    return {
      message: null,
      failedAt: null,
      current: false,
    };
  }

  return {
    message,
    failedAt:
      typeof daemonState?.lastLaunchFailedAt === "string" && daemonState.lastLaunchFailedAt.trim()
        ? daemonState.lastLaunchFailedAt.trim()
        : null,
    current: startedAtMs <= 0 || failedAtMs >= startedAtMs,
  };
}

async function inspectDaemonRuntimeDiagnosis(state, daemonSnapshot = null) {
  const daemonOnline = Boolean(daemonSnapshot);
  const liveState =
    daemonSnapshot?.state && typeof daemonSnapshot.state === "object"
      ? daemonSnapshot.state
      : state;
  const lock = await readDaemonLockSnapshot();
  const lockPid = Number.isInteger(lock.snapshot?.pid) ? lock.snapshot.pid : null;
  const lockPidAlive = lockPid ? await isProcessAlive(lockPid) : false;
  const lockPidCommand = lockPidAlive ? await getProcessCommand(lockPid) : null;
  const lockPidMatchesLink = lockPidAlive && lockPidCommand ? looksLikeCurrentLinkDaemonCommand(lockPidCommand) : null;
  const orphanedPids = await listUnixLinkDaemonPids();
  const socketExists = process.platform !== "win32" && fileExists(runtimePaths.socketFile);
  const launchError = normalizeDaemonLaunchError(liveState);

  let issue = "daemon_offline";
  if (daemonOnline) {
    issue = "online";
  } else if (lock.exists && (!lock.snapshot || lockPid === null)) {
    issue = "stale_lock_invalid";
  } else if (lock.exists && !lockPidAlive) {
    issue = "stale_lock_dead_pid";
  } else if (lock.exists && lockPidMatchesLink === false) {
    issue = "stale_lock_pid_mismatch";
  } else if (launchError.current && launchError.message) {
    issue = "last_launch_failed";
  } else if (orphanedPids.length > 0 || (lock.exists && lockPidMatchesLink === true)) {
    issue = "link_process_without_ipc";
  } else if (socketExists) {
    issue = "stale_socket";
  }

  return {
    issue,
    daemonOnline,
    lock: {
      exists: lock.exists,
      error: lock.error,
      pid: lockPid,
      pidAlive: lockPidAlive,
      pidCommand: lockPidCommand,
      pidMatchesLink: lockPidMatchesLink,
    },
    orphanedPids,
    socketExists,
    launchError,
  };
}

function resolveDaemonRuntimeDiagnosisMessage(translator, diagnosis) {
  switch (diagnosis?.issue) {
    case "stale_lock_invalid":
      return translator.t("daemonRuntimeStaleLockInvalid");
    case "stale_lock_dead_pid":
      return translator.t("daemonRuntimeStaleLockDeadPid", {
        pid: diagnosis?.lock?.pid ?? "?",
      });
    case "stale_lock_pid_mismatch":
      return translator.t("daemonRuntimeStaleLockPidMismatch", {
        pid: diagnosis?.lock?.pid ?? "?",
      });
    case "link_process_without_ipc":
      return translator.t("daemonRuntimeLinkProcessWithoutIpc", {
        pid: diagnosis?.orphanedPids?.[0] ?? diagnosis?.lock?.pid ?? "?",
      });
    case "stale_socket":
      return translator.t("daemonRuntimeStaleSocket", {
        socketPath: runtimePaths.socketFile,
      });
    case "last_launch_failed":
      return translator.t("daemonRuntimeLastLaunchFailed", {
        reason: diagnosis?.launchError?.message ?? translator.t("statusUnknownValue"),
      });
    case "online":
      return translator.t("daemonRuntimeHealthy");
    default:
      return translator.t("daemonRuntimeNoExtraIssue");
  }
}

function buildDaemonStartFailureError(translator, diagnosis, restarting = false) {
  const reason = resolveDaemonRuntimeDiagnosisMessage(translator, diagnosis);
  return new Error(
    translator.t(restarting ? "restartFailedWithReason" : "startDaemonFailedWithReason", {
      reason,
    }),
  );
}

async function recordDaemonLaunchFailure(credentials, error) {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : String(error);
  const failedAt = new Date().toISOString();

  await appendLogLine("error", "daemon", "daemon_launch_failed", {
    message,
  }).catch(() => undefined);

  await patchState((current) => {
    const stoppedState = buildStoppedStatePatch(current, {
      hasLinkId: Boolean(credentials?.linkId),
    });
    return {
      ...stoppedState,
      daemon: {
        ...stoppedState.daemon,
        lastLaunchError: message,
        lastLaunchFailedAt: failedAt,
      },
    };
  }).catch(() => undefined);
}

async function waitForHealthyExistingDaemonSnapshot(timeoutMs = 2_500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = await getDaemonSnapshot(500);
    if (snapshot?.state && typeof snapshot.state === "object") {
      return snapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

async function recoverFromBenignDaemonLockConflict(error) {
  const normalizedMessage =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : String(error);
  if (normalizedMessage !== "daemon_lock_active") {
    return false;
  }

  const snapshot = await waitForHealthyExistingDaemonSnapshot();
  if (!snapshot?.state || typeof snapshot.state !== "object") {
    return false;
  }

  await patchState({
    ...snapshot.state,
    daemon: {
      ...(snapshot.state.daemon ?? {}),
      lastLaunchError: null,
      lastLaunchFailedAt: null,
    },
  }).catch(() => undefined);

  return true;
}

async function terminateProcessGracefully(pid, timeoutMs = 1_500) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ESRCH")) {
      return false;
    }
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (!(await isProcessAlive(pid))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ESRCH")) {
      return false;
    }
  }

  const killStartedAt = Date.now();
  while (Date.now() - killStartedAt < 1_000) {
    if (!(await isProcessAlive(pid))) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return !(await isProcessAlive(pid));
}

async function unlinkPathIfExists(filePath) {
  try {
    await fsp.unlink(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function hasLingeringLinkDaemonRuntime(diagnosis) {
  return Boolean(
    diagnosis?.daemonOnline ||
      (diagnosis?.lock?.pidAlive && diagnosis?.lock?.pidMatchesLink === true) ||
      (Array.isArray(diagnosis?.orphanedPids) && diagnosis.orphanedPids.length > 0) ||
      diagnosis?.socketExists,
  );
}

async function forceRecoverBrokenDaemonRuntime(diagnosis = null) {
  const before = diagnosis ?? (await inspectDaemonRuntimeDiagnosis(await loadState()));
  const targetPids = new Set(Array.isArray(before?.orphanedPids) ? before.orphanedPids : []);

  if (
    Number.isInteger(before?.lock?.pid) &&
    before.lock.pidAlive &&
    before.lock.pidMatchesLink === true
  ) {
    targetPids.add(before.lock.pid);
  }

  const stoppedPids = [];
  for (const pid of targetPids) {
    if (await terminateProcessGracefully(pid)) {
      stoppedPids.push(pid);
    }
  }

  const afterStop = await inspectDaemonRuntimeDiagnosis(await loadState());
  const lockRemoved =
    afterStop.lock.exists && (!afterStop.lock.pidAlive || afterStop.lock.pidMatchesLink !== true)
      ? await unlinkPathIfExists(runtimePaths.daemonLockFile).catch(() => false)
      : false;

  const socketRemoved =
    process.platform !== "win32" &&
    !(
      (afterStop.lock.pidAlive && afterStop.lock.pidMatchesLink === true) ||
      afterStop.orphanedPids.length > 0
    )
      ? await unlinkPathIfExists(runtimePaths.socketFile).catch(() => false)
      : false;

  const after = await inspectDaemonRuntimeDiagnosis(await loadState());
  await appendLogLine("info", "daemon", "daemon_runtime_recovery", {
    beforeIssue: before?.issue ?? null,
    afterIssue: after?.issue ?? null,
    targetPids: [...targetPids],
    stoppedPids,
    lockRemoved,
    socketRemoved,
  }).catch(() => undefined);

  return {
    before,
    after,
    targetPids: [...targetPids],
    stoppedPids,
    lockRemoved,
    socketRemoved,
  };
}

async function stopOrphanedUnixLinkDaemons() {
  const orphanedPids = await listUnixLinkDaemonPids();
  const stoppedPids = [];
  for (const pid of orphanedPids) {
    if (await terminateProcessGracefully(pid)) {
      stoppedPids.push(pid);
    }
  }
  return stoppedPids;
}

async function repairStoppedRuntimeState() {
  const [state, credentials] = await Promise.all([loadState(), loadCredentials()]);
  await patchState(
    buildStoppedStatePatch(state, {
      hasLinkId: Boolean(credentials.linkId),
    }),
  );
}

async function shutdownAllLinkDaemons(options = {}) {
  const allowIpcFailure = options.allowIpcFailure === true;
  let ipcError = null;

  try {
    await sendIpcRequest("daemon.shutdown", {}, 1_500);
  } catch (error) {
    ipcError = error;
  }

  let ipcStopped = await waitForDaemonToStop();
  const stoppedOrphans = await stopOrphanedUnixLinkDaemons();
  let diagnosis = await inspectDaemonRuntimeDiagnosis(await loadState());
  let recovery = null;

  if (ipcError || hasLingeringLinkDaemonRuntime(diagnosis)) {
    recovery = await forceRecoverBrokenDaemonRuntime(diagnosis);
    diagnosis = recovery.after;
    ipcStopped = await waitForDaemonToStop(1_500);
  }

  const remainingOrphans = await listUnixLinkDaemonPids();
  const fullyStopped = !hasLingeringLinkDaemonRuntime(diagnosis) && remainingOrphans.length === 0;

  if ((ipcStopped || stoppedOrphans.length > 0 || recovery?.stoppedPids?.length > 0) && fullyStopped) {
    await repairStoppedRuntimeState();
  }

  if (ipcError && !allowIpcFailure && !fullyStopped) {
    throw ipcError;
  }

  return {
    ipcStopped: ipcStopped || fullyStopped,
    ipcError,
    stoppedOrphans,
    remainingOrphans,
    recovery,
  };
}

async function stopDaemonIfRunning(translator) {
  const daemonOnline = await isDaemonRunning();
  const orphanedDaemonPids = await listUnixLinkDaemonPids();
  if (!daemonOnline && orphanedDaemonPids.length === 0) {
    await repairStoppedRuntimeState();
    return {
      stopped: false,
    };
  }

  let shutdownResult;
  try {
    shutdownResult = await shutdownAllLinkDaemons({
      allowIpcFailure: !daemonOnline,
    });
  } catch {
    throw new Error(translator.t("stopDaemonFailed"));
  }

  if (!shutdownResult.ipcStopped || shutdownResult.remainingOrphans.length > 0) {
    throw new Error(translator.t("stopDaemonFailed"));
  }

  return {
    stopped: true,
  };
}

async function disableAutostartIfConfigured() {
  const status = await getAutostartStatus();
  if (!status.enabled && !status.configured) {
    return false;
  }
  await disableAutostart();
  return true;
}

async function clearLocalPairingState() {
  await saveCredentials(buildClearedCredentials());
  await patchState({
    linkId: null,
    connectionStatus: "new",
    pairingSession: null,
    lastErrorMessage: null,
  });
}

async function clearLocalRuntimeData(config) {
  await Promise.all([removeInstalledSkill(config), clearLocalPairingState()]);
  await fsp.rm(runtimePaths.baseDir, {
    recursive: true,
    force: true,
  });
}

const HELP_COMMANDS = Object.freeze([
  {
    usage: "clawlink help",
    descriptionKey: "helpCommandHelp",
  },
  {
    usage: "clawlink version",
    descriptionKey: "helpCommandVersion",
  },
  {
    usage: "clawlink pair",
    descriptionKey: "helpCommandPair",
  },
  {
    usage: "clawlink start",
    descriptionKey: "helpCommandStart",
  },
  {
    usage: "clawlink status",
    descriptionKey: "helpCommandStatus",
  },
  {
    usage: "clawlink doctor",
    descriptionKey: "helpCommandDoctor",
  },
  {
    usage: "clawlink restart",
    descriptionKey: "helpCommandRestart",
  },
  {
    usage: "clawlink stop",
    descriptionKey: "helpCommandStop",
  },
  {
    usage: "clawlink autostart on",
    descriptionKey: "helpCommandAutostartOn",
  },
  {
    usage: "clawlink autostart off",
    descriptionKey: "helpCommandAutostartOff",
  },
  {
    usage: "clawlink uninstall --yes",
    descriptionKey: "helpCommandUninstall",
  },
  {
    usage: "clawlink unpair --yes",
    descriptionKey: "helpCommandUnpair",
  },
]);

function createCliTranslator() {
  return createTranslator(resolveLanguage());
}

function canPromptUser() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function withPromptSession(fn) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return await fn(rl);
  } finally {
    rl.close();
  }
}

async function promptText(rl, question) {
  const answer = await rl.question(question);
  return typeof answer === "string" ? answer.trim() : "";
}

async function promptYesNo(rl, question, defaultYes = true) {
  const suffix = defaultYes ? " [Y/n] " : " [y/N] ";
  while (true) {
    const answer = (await promptText(rl, `${question}${suffix}`)).toLowerCase();
    if (!answer) {
      return defaultYes;
    }
    if (answer === "y" || answer === "yes") {
      return true;
    }
    if (answer === "n" || answer === "no") {
      return false;
    }
  }
}

function shouldPromptForPairLanguage(config, credentials) {
  if (credentials?.linkId) {
    return false;
  }
  if (isSupportedLanguage(config?.language)) {
    return false;
  }
  if (isSupportedLanguage(process.env.CLAWPILOT_LINK_LANG)) {
    return false;
  }
  return canPromptUser();
}

async function promptForPairLanguage(rl, translator) {
  console.log(translator.t("pairLanguagePromptIntro"));
  console.log(translator.t("pairLanguagePromptOptionZhHans"));
  console.log(translator.t("pairLanguagePromptOptionEn"));

  while (true) {
    const answer = (await promptText(rl, translator.t("pairLanguagePromptQuestion"))).toLowerCase();
    if (
      answer === "1" ||
      answer === "zh" ||
      answer === "zh-hans" ||
      answer === "zh-cn" ||
      answer === "zh_cn" ||
      answer === "cn" ||
      answer === "中文"
    ) {
      return "zh-Hans";
    }

    if (
      answer === "2" ||
      answer === "en" ||
      answer === "en-us" ||
      answer === "en-gb" ||
      answer === "english"
    ) {
      return "en";
    }

    console.log(translator.t("pairLanguagePromptInvalid"));
  }
}

async function ensurePairLanguagePreference(config, credentials) {
  if (!shouldPromptForPairLanguage(config, credentials)) {
    const language = resolveLanguage(config.language);
    return {
      config,
      translator: createTranslator(language),
    };
  }

  const promptTranslator = createTranslator(resolveLanguage(config.language));
  const selectedLanguage = await withPromptSession(async (rl) => {
    return await promptForPairLanguage(rl, promptTranslator);
  });
  const nextConfig = {
    ...config,
    language: selectedLanguage,
  };
  await saveConfig(nextConfig);

  const nextTranslator = createTranslator(selectedLanguage);
  console.log(
    selectedLanguage === "zh-Hans"
      ? nextTranslator.t("pairLanguageChangedToZhHans")
      : nextTranslator.t("pairLanguageChangedToEn"),
  );

  return {
    config: nextConfig,
    translator: nextTranslator,
  };
}

function applyOpenClawConfigPath(config, configPath) {
  return {
    ...config,
    openClawConfigPath: normalizeOpenClawConfigPathInput(configPath) ?? configPath.trim(),
    openClawBaseUrl: null,
    openClawAuthType: null,
    openClawSecret: null,
  };
}

function applyManualOpenClawSettings(config, manualConfig) {
  return {
    ...config,
    openClawConfigPath: null,
    openClawBaseUrl: manualConfig.openClawBaseUrl,
    openClawAuthType: manualConfig.openClawAuthType,
    openClawSecret: manualConfig.openClawSecret,
  };
}

async function promptForOpenClawConfigPath(rl, translator, suggestedPath) {
  console.log(translator.t("pairConfigPathPromptIntro", { configPath: suggestedPath }));
  if (process.platform === "win32") {
    console.log(translator.t("pairConfigPathPromptWindowsWslHint"));
  }
  const configPath = await promptText(rl, translator.t("pairConfigPathQuestion"));
  return configPath || null;
}

function normalizeManualOpenClawAuthTypeSelection(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "1" || normalized === "token") {
    return "token";
  }

  if (normalized === "2" || normalized === "password") {
    return "password";
  }

  return null;
}

async function promptForManualOpenClawAuthType(rl, translator) {
  console.log(translator.t("pairManualAuthTypeIntro"));
  console.log(translator.t("pairManualAuthTypeOptionToken"));
  console.log(translator.t("pairManualAuthTypeOptionPassword"));

  while (true) {
    const answer = await promptText(rl, translator.t("pairManualAuthTypeQuestion"));
    if (!answer) {
      return null;
    }

    const authType = normalizeManualOpenClawAuthTypeSelection(answer);
    if (authType) {
      return authType;
    }

    console.log(translator.t("pairManualAuthTypeInvalid"));
  }
}

async function promptForManualOpenClaw(rl, translator) {
  console.log(translator.t("pairManualSetupIntro"));
  const openClawBaseUrl = await promptText(rl, translator.t("pairManualUrlQuestion"));
  if (!openClawBaseUrl) {
    return null;
  }

  const openClawAuthType = await promptForManualOpenClawAuthType(rl, translator);
  if (!openClawAuthType) {
    return null;
  }

  const openClawSecret = await promptText(
    rl,
    openClawAuthType === "token"
      ? translator.t("pairManualTokenQuestion")
      : translator.t("pairManualPasswordQuestion"),
  );
  if (!openClawSecret) {
    return null;
  }

  return {
    openClawBaseUrl,
    openClawAuthType,
    openClawSecret,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function shellEscapeArg(value) {
  const normalized = String(value ?? "");
  if (!normalized) {
    return "''";
  }
  return `'${normalized.replace(/'/g, `'\"'\"'`)}'`;
}

function quoteWindowsCommandArg(value) {
  const normalized = String(value ?? "");
  if (!normalized) {
    return '""';
  }
  if (!/[\s"]/g.test(normalized)) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function parseWslUncConfigPath(configPath) {
  if (process.platform !== "win32") {
    return null;
  }

  const normalizedPath = normalizeOptionalString(configPath);
  if (!normalizedPath) {
    return null;
  }

  const windowsPath = normalizedPath.replace(/\//g, "\\");
  const parts = windowsPath.split("\\").filter(Boolean);
  if (parts.length < 3) {
    return null;
  }

  const host = parts[0].toLowerCase();
  if (host !== "wsl$" && host !== "wsl.localhost") {
    return null;
  }

  const distroName = normalizeOptionalString(parts[1]);
  const linuxSegments = parts.slice(2).filter((segment) => segment.length > 0);
  if (!distroName || linuxSegments.length <= 0) {
    return null;
  }

  const linuxConfigPath = `/${linuxSegments.join("/")}`;
  const linuxStateDir =
    linuxSegments.length > 1 ? `/${linuxSegments.slice(0, -1).join("/")}` : "/";

  let linuxUser = null;
  let linuxHomeDir = null;
  if (linuxSegments[0] === "home" && linuxSegments[1]) {
    linuxUser = linuxSegments[1];
    linuxHomeDir = `/home/${linuxUser}`;
  } else if (linuxSegments[0] === "root") {
    linuxUser = "root";
    linuxHomeDir = "/root";
  }

  return {
    distroName,
    linuxConfigPath,
    linuxStateDir,
    linuxUser,
    linuxHomeDir,
  };
}

function buildWslOpenClawPathEnv(target) {
  const entries = [];

  if (target?.linuxHomeDir) {
    entries.push(
      `${target.linuxHomeDir}/.local/bin`,
      `${target.linuxHomeDir}/.npm-global/bin`,
      `${target.linuxHomeDir}/.yarn/bin`,
      `${target.linuxHomeDir}/.bun/bin`,
    );
  }

  entries.push(
    "/usr/local/sbin",
    "/usr/local/bin",
    "/usr/sbin",
    "/usr/bin",
    "/sbin",
    "/bin",
  );

  return [...new Set(entries)].join(":");
}

function buildWslOpenClawEnvAssignments(target) {
  return [
    `OPENCLAW_STATE_DIR=${target.linuxStateDir}`,
    `OPENCLAW_CONFIG_PATH=${target.linuxConfigPath}`,
    `PATH=${buildWslOpenClawPathEnv(target)}`,
  ];
}

function buildWslOpenClawExecArgs(target, openClawArgs) {
  const args = ["--distribution", target.distroName];
  if (target.linuxUser) {
    args.push("--user", target.linuxUser);
  }
  args.push(
    "--exec",
    "env",
    ...buildWslOpenClawEnvAssignments(target),
    "openclaw",
    ...openClawArgs,
  );
  return args;
}

function buildWslOpenClawCommand(target, openClawArgs) {
  return ["wsl.exe", ...buildWslOpenClawExecArgs(target, openClawArgs)]
    .map((part) => quoteWindowsCommandArg(part))
    .join(" ");
}

async function withLoadingIndicator(initialLabel, work) {
  const ttyEnabled = Boolean(process.stderr.isTTY && process.env.TERM !== "dumb");
  let currentLabel = initialLabel;

  if (!ttyEnabled) {
    if (initialLabel) {
      console.error(initialLabel);
    }
    return await work({
      setLabel(nextLabel) {
        if (!nextLabel || nextLabel === currentLabel) {
          return;
        }
        currentLabel = nextLabel;
        console.error(nextLabel);
      },
    });
  }

  const frames = ["-", "\\", "|", "/"];
  let frameIndex = 0;
  const render = () => {
    const line = `${frames[frameIndex]} ${currentLabel}`;
    frameIndex = (frameIndex + 1) % frames.length;
    // Clear the whole terminal line before repainting so CJK wide chars
    // do not leave stale suffixes behind when the next message is shorter.
    process.stderr.write(`\r\x1b[2K${line}`);
  };

  render();
  const timer = setInterval(render, 120);

  try {
    return await work({
      setLabel(nextLabel) {
        if (!nextLabel || nextLabel === currentLabel) {
          return;
        }
        currentLabel = nextLabel;
        render();
      },
    });
  } finally {
    clearInterval(timer);
    process.stderr.write("\r\x1b[2K");
  }
}

function normalizeOpenClawHost(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value.trim())
    ? value.trim()
    : `http://${value.trim()}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLocalOpenClawAddress(value) {
  const host = normalizeOpenClawHost(value);
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function resolveOpenClawStateDir(backend) {
  const configPath =
    typeof backend?.configPath === "string" && backend.configPath.trim()
      ? backend.configPath.trim()
      : null;
  if (!configPath) {
    return null;
  }
  return path.dirname(configPath);
}

function canOfferLocalApprovalHelp(config, backend) {
  if (backend?.configExists) {
    return true;
  }
  if (isLocalOpenClawAddress(backend?.httpBaseUrl)) {
    return true;
  }
  return isLocalOpenClawAddress(config?.openClawBaseUrl);
}

async function findLocalOpenClawDockerContainer(backend) {
  if (!isLocalOpenClawAddress(backend?.httpBaseUrl) || !Number.isInteger(backend?.port) || backend.port <= 0) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync("docker", [
      "ps",
      "--format",
      "{{.Image}}\t{{.Names}}\t{{.Ports}}",
    ], {
      encoding: "utf8",
    });

    const lines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const [image = "", name = "", ports = ""] = line.split("\t");
      const looksLikeOpenClaw = /openclaw/i.test(image) || /openclaw/i.test(name);
      const exposesPort =
        new RegExp(`:${backend.port}(?:\\b|-)`).test(ports) &&
        new RegExp(`->${backend.port}(?:\\b|-)`).test(ports);
      if (!looksLikeOpenClaw || !exposesPort) {
        continue;
      }
      return {
        image,
        name,
        ports,
      };
    }
  } catch {
    // Docker is optional. Ignore lookup failures and fall back to generic guidance.
  }

  return null;
}

async function hasLocalOpenClawCli() {
  try {
    await execFileAsync("openclaw", ["--help"], {
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

function buildDockerApprovalCommand(containerName, requestId) {
  return `docker exec ${shellEscapeArg(containerName)} openclaw devices approve ${shellEscapeArg(requestId)}`;
}

function buildHostApprovalCommand(stateDir, requestId) {
  return `OPENCLAW_STATE_DIR=${shellEscapeArg(stateDir)} openclaw devices approve ${shellEscapeArg(requestId)}`;
}

function resolveWslApprovalTarget(backend) {
  return parseWslUncConfigPath(
    typeof backend?.configPath === "string" ? backend.configPath : null,
  );
}

async function runWslOpenClawJsonCommand(target, openClawArgs, invalidJsonMessage) {
  const { stdout } = await execFileAsync("wsl.exe", buildWslOpenClawExecArgs(target, openClawArgs), {
    encoding: "utf8",
    windowsHide: true,
  });
  const parsed = safeJsonParse(stdout);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(invalidJsonMessage);
  }
  return parsed;
}

async function createDockerApprovalStrategy(containerName, requestId) {
  return {
    kind: "docker",
    requestId,
    command: buildDockerApprovalCommand(containerName, requestId),
    async listPending() {
      const { stdout } = await execFileAsync(
        "docker",
        ["exec", containerName, "openclaw", "devices", "list", "--json"],
        {
          encoding: "utf8",
        },
      );
      const parsed = safeJsonParse(stdout);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("OpenClaw devices list returned invalid JSON.");
      }
      return parsed;
    },
    async approve() {
      const { stdout } = await execFileAsync(
        "docker",
        ["exec", containerName, "openclaw", "devices", "approve", requestId, "--json"],
        {
          encoding: "utf8",
        },
      );
      const parsed = safeJsonParse(stdout);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("OpenClaw devices approve returned invalid JSON.");
      }
      return parsed;
    },
  };
}

async function createWslApprovalStrategy(target, requestId) {
  return {
    kind: "wsl",
    requestId,
    command: buildWslOpenClawCommand(target, ["devices", "approve", requestId]),
    async listPending() {
      return await runWslOpenClawJsonCommand(
        target,
        ["devices", "list", "--json"],
        "OpenClaw devices list returned invalid JSON.",
      );
    },
    async approve() {
      return await runWslOpenClawJsonCommand(
        target,
        ["devices", "approve", requestId, "--json"],
        "OpenClaw devices approve returned invalid JSON.",
      );
    },
  };
}

async function createHostApprovalStrategy(backend, requestId) {
  const stateDir = resolveOpenClawStateDir(backend);
  const configPath =
    typeof backend?.configPath === "string" && backend.configPath.trim()
      ? backend.configPath.trim()
      : null;
  if (!stateDir || !(await hasLocalOpenClawCli())) {
    return null;
  }

  const env = {
    ...process.env,
    OPENCLAW_STATE_DIR: stateDir,
    ...(configPath ? { OPENCLAW_CONFIG_PATH: configPath } : {}),
  };

  return {
    kind: "host",
    requestId,
    command: buildHostApprovalCommand(stateDir, requestId),
    async listPending() {
      const { stdout } = await execFileAsync("openclaw", ["devices", "list", "--json"], {
        encoding: "utf8",
        env,
      });
      const parsed = safeJsonParse(stdout);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("OpenClaw devices list returned invalid JSON.");
      }
      return parsed;
    },
    async approve() {
      const { stdout } = await execFileAsync("openclaw", ["devices", "approve", requestId, "--json"], {
        encoding: "utf8",
        env,
      });
      const parsed = safeJsonParse(stdout);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("OpenClaw devices approve returned invalid JSON.");
      }
      return parsed;
    },
  };
}

async function resolveLocalApprovalStrategy(backend) {
  const requestId =
    typeof backend?.approvalRequestId === "string" && backend.approvalRequestId.trim()
      ? backend.approvalRequestId.trim()
      : null;
  if (!requestId) {
    return null;
  }

  const dockerContainer = await findLocalOpenClawDockerContainer(backend);
  if (dockerContainer?.name) {
    return await createDockerApprovalStrategy(dockerContainer.name, requestId);
  }

  const wslTarget = resolveWslApprovalTarget(backend);
  if (wslTarget) {
    return await createWslApprovalStrategy(wslTarget, requestId);
  }

  if (backend?.configExists) {
    return await createHostApprovalStrategy(backend, requestId);
  }

  return null;
}

function findPendingApprovalRequest(pairingPayload, requestId) {
  if (!pairingPayload || typeof pairingPayload !== "object" || !requestId) {
    return null;
  }

  const pending = Array.isArray(pairingPayload.pending) ? pairingPayload.pending : [];
  return (
    pending.find((entry) => {
      const candidateId =
        entry && typeof entry === "object" && typeof entry.requestId === "string"
          ? entry.requestId.trim()
          : "";
      return candidateId === requestId;
    }) ?? null
  );
}

async function recheckBackendAfterAutomaticApproval(config, requestId) {
  let latestBackend = null;

  for (let attempt = 0; attempt < AUTO_APPROVAL_RECHECK_ATTEMPTS; attempt += 1) {
    latestBackend = await detectOpenClawBackend(config);
    if (latestBackend.detected && latestBackend.supported && latestBackend.healthy) {
      return latestBackend;
    }

    const stillSameApprovalRequest =
      latestBackend.setupReason === "approval_required" &&
      (!requestId || latestBackend.approvalRequestId === requestId);
    if (!stillSameApprovalRequest) {
      return latestBackend;
    }

    await sleep(AUTO_APPROVAL_RECHECK_INTERVAL_MS);
  }

  return latestBackend;
}

async function resolveApprovalGuidance(config, backend) {
  const strategy = await resolveLocalApprovalStrategy(backend);
  return {
    requestId:
      typeof backend?.approvalRequestId === "string" && backend.approvalRequestId.trim()
        ? backend.approvalRequestId.trim()
        : null,
    command: strategy?.command ?? null,
    local: canOfferLocalApprovalHelp(config, backend),
    configPath:
      typeof backend?.configPath === "string" && backend.configPath.trim()
        ? backend.configPath.trim()
        : null,
    strategy,
  };
}

async function attemptAutomaticApproval(translator, config, backend, guidance) {
  const requestId = guidance?.requestId ?? null;
  const strategy = guidance?.strategy ?? null;
  if (!requestId || !strategy) {
    return {
      attempted: false,
      backend,
      reason: null,
    };
  }

  try {
    const outcome = await withLoadingIndicator(
      translator.t("approvalAutoWaitingForRequest"),
      async (loading) => {
        const deadline = Date.now() + AUTO_APPROVAL_POLL_TIMEOUT_MS;

        while (Date.now() < deadline) {
          const pairingPayload = await strategy.listPending();
          if (findPendingApprovalRequest(pairingPayload, requestId)) {
            loading.setLabel(translator.t("approvalAutoApproving"));
            await strategy.approve();
            loading.setLabel(translator.t("approvalAutoRechecking"));
            return await recheckBackendAfterAutomaticApproval(config, requestId);
          }
          await sleep(AUTO_APPROVAL_POLL_INTERVAL_MS);
        }

        return null;
      },
    );

    if (outcome?.detected && outcome.supported && outcome.healthy) {
      console.error(translator.t("approvalAutoApproved"));
      return {
        attempted: true,
        backend: outcome,
        reason: null,
      };
    }

    const reason = outcome?.message ?? translator.t("approvalAutoPendingNotFound");
    console.error(
      translator.t("approvalAutoFailedWillWait", {
        reason,
      }),
    );
    return {
      attempted: true,
      backend: outcome ?? backend,
      reason,
    };
  } catch (error) {
    const reason =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : String(error);
    console.error(
      translator.t("approvalAutoFailedWillWait", {
        reason,
      }),
    );
    return {
      attempted: true,
      backend,
      reason,
    };
  }
}

async function persistBackendBlockState(backend) {
  await patchState({
    backend,
    connectionStatus: "approval_required",
    lastErrorMessage: null,
    pairingSession: null,
  });
}

async function clearBackendBlockState(backend, hasLinkId) {
  await patchState({
    backend,
    connectionStatus: hasLinkId ? "paired" : "new",
    lastErrorMessage: null,
  });
}

async function printApprovalRequiredNotice(translator, config, backend, guidance = null) {
  const resolvedGuidance = guidance ?? (await resolveApprovalGuidance(config, backend));
  console.error(translator.t("approvalRequiredIntro"));
  if (resolvedGuidance.requestId) {
    console.error(
      translator.t("approvalRequiredRequestId", {
        requestId: resolvedGuidance.requestId,
      }),
    );
  }
  console.error(translator.t("approvalRequiredNoStart"));

  if (resolvedGuidance.command) {
    console.error(translator.t("approvalRequiredRunCommand"));
    console.error(resolvedGuidance.command);
    return;
  }

  if (resolvedGuidance.local && resolvedGuidance.configPath) {
    console.error(
      translator.t("approvalRequiredLocalConfigHint", {
        configPath: resolvedGuidance.configPath,
      }),
    );
    return;
  }

  if (resolvedGuidance.local) {
    console.error(translator.t("approvalRequiredLocalHint"));
    return;
  }

  console.error(translator.t("approvalRequiredRemoteHint"));
}

async function waitForOpenClawApproval(rl, translator, config, credentials, initialBackend) {
  let backend = initialBackend;

  while (true) {
    await persistBackendBlockState(backend);
    const guidance = await resolveApprovalGuidance(config, backend);
    const autoApproval = await attemptAutomaticApproval(
      translator,
      config,
      backend,
      guidance,
    );
    backend = autoApproval.backend ?? backend;
    if (backend.detected && backend.supported && backend.healthy) {
      await clearBackendBlockState(backend, Boolean(credentials?.linkId));
      return backend;
    }
    if (backend.setupReason !== "approval_required") {
      await patchState({
        backend,
        connectionStatus: credentials?.linkId ? "paired" : "new",
        lastErrorMessage: backend.message ?? null,
      });
      console.error(
        translator.t("approvalRequiredChangedReason", {
          reason: backend.message ?? translator.t("backendUnsupported"),
        }),
      );
      return null;
    }
    const updatedGuidance = await resolveApprovalGuidance(config, backend);
    await printApprovalRequiredNotice(translator, config, backend, updatedGuidance);

    const answer = (await promptText(rl, translator.t("approvalRequiredRetryQuestion"))).toLowerCase();
    if (answer === "q" || answer === "quit" || answer === "cancel") {
      console.error(translator.t("approvalRequiredCancelled"));
      return null;
    }

    console.log(translator.t("approvalRequiredRechecking"));
    backend = await detectOpenClawBackend(config);
    if (backend.detected && backend.supported && backend.healthy) {
      await clearBackendBlockState(backend, Boolean(credentials?.linkId));
      return backend;
    }

    if (backend.setupReason !== "approval_required") {
      await patchState({
        backend,
        connectionStatus: credentials?.linkId ? "paired" : "new",
        lastErrorMessage: backend.message ?? null,
      });
      console.error(
        translator.t("approvalRequiredChangedReason", {
          reason: backend.message ?? translator.t("backendUnsupported"),
        }),
      );
      return null;
    }

    console.error(
      backend.approvalRequestId
        ? translator.t("approvalRequiredStillPendingWithRequestId", {
            requestId: backend.approvalRequestId,
          })
        : translator.t("approvalRequiredStillPending"),
    );
  }
}

function printManualBackendFailure(translator, backend, fallbackUrl) {
  if (backend?.detected && backend?.supported) {
    const reason =
      typeof backend?.message === "string" && backend.message.trim()
        ? backend.message.trim()
        : translator.t("backendUnsupported");
    console.error(
      translator.t("pairManualBackendNeedsAttention", {
        reason,
      }),
    );
    return;
  }

  console.error(
    translator.t("pairManualBackendUnreachable", {
      url: backend?.httpBaseUrl ?? fallbackUrl,
    }),
  );
  console.error(translator.t("pairManualBackendStartHint"));
  console.error(translator.t("pairManualBackendInstallHint"));
}

async function ensureBackendReadyForPair(config, credentials, translator) {
  let activeConfig = config;
  let backend = await detectOpenClawBackend(activeConfig);
  if (backend.detected && backend.supported && backend.healthy) {
    await clearBackendBlockState(backend, Boolean(credentials?.linkId));
    return { config: activeConfig, backend };
  }

  if (backend.setupReason === "approval_required") {
    const guidance = await resolveApprovalGuidance(activeConfig, backend);
    const autoApproval = await attemptAutomaticApproval(
      translator,
      activeConfig,
      backend,
      guidance,
    );
    backend = autoApproval.backend ?? backend;
    if (backend.detected && backend.supported && backend.healthy) {
      await clearBackendBlockState(backend, Boolean(credentials?.linkId));
      return { config: activeConfig, backend };
    }
    if (backend.setupReason !== "approval_required") {
      await patchState({
        backend,
        connectionStatus: credentials?.linkId ? "paired" : "new",
        lastErrorMessage: backend.message ?? null,
      });
      return null;
    }

    if (!canPromptUser()) {
      await persistBackendBlockState(backend);
      const updatedGuidance = await resolveApprovalGuidance(activeConfig, backend);
      await printApprovalRequiredNotice(translator, activeConfig, backend, updatedGuidance);
      return null;
    }

    return await withPromptSession(async (rl) => {
      const approvedBackend = await waitForOpenClawApproval(
        rl,
        translator,
        activeConfig,
        credentials,
        backend,
      );
      return approvedBackend
        ? {
            config: activeConfig,
            backend: approvedBackend,
          }
        : null;
    });
  }

  if (!canPromptUser()) {
    console.error(translator.t("pairNeedsInteractiveSetup"));
    if (typeof backend?.message === "string" && backend.message.trim()) {
      console.error(backend.message.trim());
    }
    return null;
  }

  return await withPromptSession(async (rl) => {
    if (backend.detected && backend.setupReason === "config_missing") {
      const configPath = await promptForOpenClawConfigPath(
        rl,
        translator,
        backend.configPath || path.join(os.homedir(), ".openclaw", "openclaw.json"),
      );
      if (configPath) {
        const updatedConfig = applyOpenClawConfigPath(activeConfig, configPath);
        const updatedBackend = await detectOpenClawBackend(updatedConfig);
        if (updatedBackend.detected && updatedBackend.supported && updatedBackend.healthy) {
          await saveConfig(updatedConfig);
          await clearBackendBlockState(updatedBackend, Boolean(credentials?.linkId));
          return {
            config: updatedConfig,
            backend: updatedBackend,
          };
        }
        if (updatedBackend.setupReason === "approval_required") {
          await saveConfig(updatedConfig);
          const approvedBackend = await waitForOpenClawApproval(
            rl,
            translator,
            updatedConfig,
            credentials,
            updatedBackend,
          );
          return approvedBackend
            ? {
                config: updatedConfig,
                backend: approvedBackend,
              }
            : null;
        }
        console.log(
          translator.t("pairConfigPathNotUsable", {
            reason: updatedBackend.message ?? translator.t("backendUnsupported"),
          }),
        );
        backend = updatedBackend;
        activeConfig = updatedConfig;
      }
    }

    if (backend.detected && typeof backend.message === "string" && backend.message.trim()) {
      console.log(
        translator.t("pairBackendNeedsManualSetup", {
          reason: backend.message.trim(),
        }),
      );
    } else {
      console.log(translator.t("pairBackendMissingBeforeManual"));
    }

    const manualConfig = await promptForManualOpenClaw(rl, translator);
    if (!manualConfig) {
      console.error(translator.t("pairManualSetupCancelled"));
      return null;
    }

    const manualBackend = await probeManualOpenClawBackend({
      ...manualConfig,
      installId: activeConfig.installId,
      displayName: activeConfig.displayName,
    });
    if (!(manualBackend.detected && manualBackend.supported)) {
      printManualBackendFailure(translator, manualBackend, manualConfig.openClawBaseUrl);
      return null;
    }

    const updatedConfig = applyManualOpenClawSettings(activeConfig, manualConfig);
    await saveConfig(updatedConfig);
    if (manualBackend.healthy) {
      await clearBackendBlockState(manualBackend, Boolean(credentials?.linkId));
      return {
        config: updatedConfig,
        backend: manualBackend,
      };
    }

    if (manualBackend.setupReason === "approval_required") {
      const approvedBackend = await waitForOpenClawApproval(
        rl,
        translator,
        updatedConfig,
        credentials,
        manualBackend,
      );
      return approvedBackend
        ? {
            config: updatedConfig,
            backend: approvedBackend,
          }
        : null;
    }

    printManualBackendFailure(translator, manualBackend, manualConfig.openClawBaseUrl);
    return null;
  });
}

async function maybePromptToEnableAutostart(translator) {
  const status = await getAutostartStatus();
  if (status.enabled) {
    return;
  }

  const capability = await getAutostartCapability();
  if (!capability.supported) {
    console.log(
      translator.t("autostartNotAvailableHere", {
        reason: formatAutostartFailureReason(translator, capability),
      }),
    );
    return;
  }

  if (!canPromptUser()) {
    console.log(translator.t("autostartHintLater"));
    return;
  }

  await withPromptSession(async (rl) => {
    const shouldEnable = await promptYesNo(rl, translator.t("autostartPrompt"), true);
    if (!shouldEnable) {
      console.log(translator.t("autostartSkipped"));
      return;
    }

    try {
      const result = await enableAutostart();
      console.log(
        translator.t("autostartEnabledWithMethod", {
          method: result.method,
        }),
      );
      if (result.warning) {
        console.log(result.warning);
      }
    } catch (error) {
      console.log(
        translator.t("autostartEnableFailed", {
          reason: formatAutostartFailureReason(translator, error),
        }),
      );
    }
  });
}

function readExecFailureText(error) {
  const parts = [];

  if (error && typeof error === "object") {
    if (typeof error.stdout === "string" && error.stdout.trim()) {
      parts.push(error.stdout.trim());
    }
    if (typeof error.stderr === "string" && error.stderr.trim()) {
      parts.push(error.stderr.trim());
    }
  }

  if (error instanceof Error && error.message.trim()) {
    parts.push(error.message.trim());
  }

  return parts.join(" ").trim() || null;
}

function resolveDirectAccessPort(snapshot) {
  const state = snapshot?.state ?? snapshot;
  const port =
    typeof state?.directAccess?.port === "number" && Number.isFinite(state.directAccess.port)
      ? Math.trunc(state.directAccess.port)
      : LINK_DIRECT_PORT;
  return port > 0 ? port : LINK_DIRECT_PORT;
}

function formatFirewallSourceLabel(source) {
  if (source === "ufw") {
    return "UFW";
  }
  if (source === "firewalld") {
    return "firewalld";
  }
  return "firewall";
}

async function inspectFirewalldPort(port) {
  try {
    const { stdout } = await execFileAsync("firewall-cmd", ["--state"], {
      encoding: "utf8",
    });
    if (typeof stdout === "string" && stdout.trim().toLowerCase() !== "running") {
      return {
        status: "inactive",
        source: "firewalld",
      };
    }
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {
        status: "unavailable",
        source: "firewalld",
      };
    }
    const detail = readExecFailureText(error)?.toLowerCase() ?? "";
    if (detail.includes("not running")) {
      return {
        status: "inactive",
        source: "firewalld",
      };
    }
    return {
      status: "unknown",
      source: "firewalld",
    };
  }

  try {
    await execFileAsync("firewall-cmd", [`--query-port=${port}/tcp`], {
      encoding: "utf8",
    });
    return {
      status: "allowed",
      source: "firewalld",
    };
  } catch (error) {
    if (error && typeof error === "object" && typeof error.code === "number" && error.code === 1) {
      return {
        status: "may_block",
        source: "firewalld",
      };
    }
    return {
      status: "unknown",
      source: "firewalld",
    };
  }
}

async function inspectUfwPort(port) {
  try {
    const { stdout } = await execFileAsync("ufw", ["status"], {
      encoding: "utf8",
    });
    const normalized = typeof stdout === "string" ? stdout.toLowerCase() : "";

    if (normalized.includes("status: inactive")) {
      return {
        status: "inactive",
        source: "ufw",
      };
    }

    if (!normalized.includes("status: active")) {
      return {
        status: "unknown",
        source: "ufw",
      };
    }

    const allowPattern = new RegExp(`\\b${port}(?:\\/tcp)?\\b[^\\n]*\\ballow\\b`, "i");
    return {
      status: allowPattern.test(stdout) ? "allowed" : "may_block",
      source: "ufw",
    };
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {
        status: "unavailable",
        source: "ufw",
      };
    }
    return {
      status: "unknown",
      source: "ufw",
    };
  }
}

async function inspectLocalDirectAccessFirewall(port) {
  if (process.platform !== "linux") {
    return {
      status: "unknown",
      source: null,
    };
  }

  const firewalldResult = await inspectFirewalldPort(port);
  const ufwResult = await inspectUfwPort(port);
  const results = [firewalldResult, ufwResult].filter((item) => item.status !== "unavailable");

  for (const result of results) {
    if (result.status === "allowed" || result.status === "may_block") {
      return result;
    }
  }

  for (const result of results) {
    if (result.status === "unknown") {
      return result;
    }
  }

  for (const result of results) {
    if (result.status === "inactive") {
      return result;
    }
  }

  return {
    status: "unknown",
    source: null,
  };
}

async function printDirectAccessSetupGuide(translator, initialSnapshot = null) {
  const liveSnapshot = (await getDaemonSnapshot(700)) ?? initialSnapshot;
  const snapshot = liveSnapshot?.state ? liveSnapshot : initialSnapshot;
  const state = snapshot?.state ?? snapshot;
  const directAccess = state?.directAccess;
  const port = resolveDirectAccessPort(snapshot);

  console.log("");
  console.log(translator.t("directAccessGuideTitle"));

  if (directAccess?.status !== "listening") {
    console.log(
      translator.t("directAccessGuideNotReady", {
        port,
        reason: resolveDirectAccessStatusMessage(translator, directAccess, true),
      }),
    );
    console.log(translator.t("directAccessGuideFixBeforeDirect"));
    return;
  }

  console.log(
    translator.t("directAccessGuideListening", {
      port,
    }),
  );

  const firewallResult = await inspectLocalDirectAccessFirewall(port);
  if (firewallResult.status === "allowed") {
    console.log(
      translator.t("directAccessGuideFirewallAllowed", {
        firewall: formatFirewallSourceLabel(firewallResult.source),
        port,
      }),
    );
  } else if (firewallResult.status === "inactive") {
    console.log(
      translator.t("directAccessGuideFirewallInactive", {
        port,
      }),
    );
  } else if (firewallResult.status === "may_block") {
    console.log(
      translator.t("directAccessGuideFirewallMayBlock", {
        firewall: formatFirewallSourceLabel(firewallResult.source),
        port,
      }),
    );
  } else {
    console.log(
      translator.t("directAccessGuideFirewallUnknown", {
        port,
      }),
    );
  }

  console.log(
    translator.t("directAccessGuideKeepPortOpen", {
      port,
    }),
  );
  console.log(
    translator.t("directAccessGuideRouterForward", {
      port,
    }),
  );
}

function printHelp(translator) {
  const commandWidth = HELP_COMMANDS.reduce((max, item) => Math.max(max, item.usage.length), 0);

  console.log(`ClawPilot Link ${LINK_VERSION}`);
  console.log("");
  console.log(translator.t("helpIntro"));
  for (const item of HELP_COMMANDS) {
    console.log(`  ${item.usage.padEnd(commandWidth)}  ${translator.t(item.descriptionKey)}`);
  }
  console.log("");
  console.log(translator.t("helpDefaultCommand"));
}

function buildPairingQrValue(pairing, config) {
  const directAddresses = listLanIpv4Addresses();
  const payload = encodeBase64UrlJson({
    v: 1,
    typ: "join",
    sid: pairing.pairingSessionId,
    tok: pairing.pairingToken,
    displayName: pairing.displayName,
    hostname: pairing.hostname,
    platform: pairing.platform,
    directKey: config.directAccessKey,
    directPort: LINK_DIRECT_PORT,
    directAddresses,
  });
  return `CLAWLINK:${payload}`;
}

function buildQrSvgMarkup(value) {
  const qrcodeModel = new QRCodeModel(-1, QRErrorCorrectLevel.L);
  qrcodeModel.addData(value);
  qrcodeModel.make();

  const moduleSize = QR_SVG_MODULE_SIZE_PX;
  const margin = QR_SVG_MARGIN_MODULES;
  const moduleCount = qrcodeModel.getModuleCount();
  const totalSize = (moduleCount + margin * 2) * moduleSize;
  const pathSegments = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qrcodeModel.modules[row]?.[col]) {
        continue;
      }
      const x = (col + margin) * moduleSize;
      const y = (row + margin) * moduleSize;
      pathSegments.push(`M${x} ${y}h${moduleSize}v${moduleSize}H${x}z`);
    }
  }

  const pathData = pathSegments.join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges">`,
    `<rect width="${totalSize}" height="${totalSize}" fill="#ffffff"/>`,
    `<path fill="#000000" d="${pathData}"/>`,
    "</svg>",
    "",
  ].join("\n");
}

async function writePairingQrSvgFile(value, fileName) {
  await ensureRuntimeLayout();
  const filePath = path.join(runtimePaths.cacheDir, fileName);
  await fsp.writeFile(filePath, buildQrSvgMarkup(value), "utf8");
  return filePath;
}

async function openFileWithDefaultApp(filePath) {
  try {
    switch (process.platform) {
      case "win32": {
        const escapedPath = filePath.replace(/'/g, "''");
        await execFileAsync(
          "powershell",
          [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            `Start-Process -FilePath '${escapedPath}'`,
          ],
          {
            windowsHide: true,
          },
        );
        return true;
      }
      case "darwin":
        await execFileAsync("open", [filePath]);
        return true;
      default:
        await execFileAsync("xdg-open", [filePath]);
        return true;
    }
  } catch {
    return false;
  }
}

async function printPairingQr(pairing, config, translator, options = {}) {
  const qrValue = buildPairingQrValue(pairing, config);
  console.log(qrValue);

  if (process.platform === "win32") {
    try {
      const filePath = await writePairingQrSvgFile(qrValue, options.fileName ?? "pairing-qr.svg");
      const opened = canPromptUser() ? await openFileWithDefaultApp(filePath) : false;
      console.log(translator.t(opened ? "qrWindowsSvgOpened" : "qrWindowsSvgSaved", { filePath }));
      return;
    } catch {
      // If Windows cannot prepare the fallback image, keep the old terminal QR behavior as a last resort.
    }
  }

  qrcode.generate(qrValue, {
    small: true,
  });
}

function resolveBootstrapPollDelayMs(attempt) {
  const schedule = [1_500, 2_000, 3_000, 5_000, 8_000, 12_000];
  const baseDelayMs = schedule[Math.min(attempt, schedule.length - 1)];
  const jitterMs = Math.floor(baseDelayMs * 0.15 * Math.random());
  return baseDelayMs + jitterMs;
}

function printHumanStatus(translator, snapshot, daemonOnline) {
  const normalizedSnapshot = normalizeSnapshotForDisplay(snapshot, daemonOnline);
  const state = normalizedSnapshot.state ?? normalizedSnapshot;
  const relayConnected = Boolean(normalizedSnapshot?.relayConnected);
  const problemMessage = resolveStatusProblemMessage(translator, normalizedSnapshot, daemonOnline);
  const nextStepMessage = resolveStatusNextStepMessage(translator, normalizedSnapshot, daemonOnline);

  console.log(`${translator.t("statusTitle")} · v${LINK_VERSION}`);
  console.log(
    `- ${translator.t("statusStateLabel")}: ${resolveConnectionStatusMessage(translator, state.connectionStatus)}`,
  );
  console.log(`- ${translator.t("statusOpenClawLabel")}: ${resolveBackendStatusMessage(translator, state.backend)}`);
  console.log(
    `- ${translator.t("statusConnectionPathLabel")}: ${resolveConnectionPathMessage(
      translator,
      state,
      daemonOnline,
      relayConnected,
    )}`,
  );
  if (problemMessage) {
    console.log(`- ${translator.t("statusAttentionLabel")}: ${problemMessage}`);
  }
  if (nextStepMessage) {
    console.log(`- ${translator.t("statusNextStepLabel")}: ${nextStepMessage}`);
  }
}

function resolveRunningVersion(snapshot, daemonOnline) {
  if (!daemonOnline || typeof snapshot?.version !== "string") {
    return null;
  }
  const normalized = snapshot.version.trim();
  return normalized || null;
}

function normalizeSnapshotForDisplay(snapshot, daemonOnline) {
  if (daemonOnline) {
    return snapshot;
  }

  const state = snapshot?.state ?? snapshot;
  if (!state || typeof state !== "object") {
    return snapshot;
  }

  const connectionStatus =
    typeof state.connectionStatus === "string" ? state.connectionStatus.trim() : "";
  const shouldResetConnectionStatus =
    connectionStatus === "connecting" ||
    connectionStatus === "connected" ||
    connectionStatus === "degraded" ||
    connectionStatus === "backend_missing";

  if (!shouldResetConnectionStatus) {
    return snapshot;
  }

  return {
    ...snapshot,
    state: {
      ...state,
      connectionStatus: state.linkId ? "paired" : "new",
    },
  };
}

function hasDaemonVersionMismatch(snapshot, daemonOnline) {
  const runningVersion = resolveRunningVersion(snapshot, daemonOnline);
  return Boolean(runningVersion && runningVersion !== LINK_VERSION);
}

function isBackendApprovalRequired(backend) {
  return Boolean(backend?.approvalRequired || backend?.setupReason === "approval_required");
}

function resolveBackendStatusMessage(translator, backend) {
  if (!backend || typeof backend !== "object") {
    return translator.t("statusUnknownValue");
  }
  if (isBackendApprovalRequired(backend)) {
    const requestId =
      typeof backend.approvalRequestId === "string" && backend.approvalRequestId.trim()
        ? backend.approvalRequestId.trim()
        : null;
    return requestId
      ? translator.t("backendApprovalRequiredWithRequestId", {
          requestId,
        })
      : translator.t("backendApprovalRequired");
  }

  const message =
    typeof backend.message === "string" && backend.message.trim()
      ? backend.message.trim()
      : null;

  if (!backend.detected) {
    return message ?? translator.t("backendMissing");
  }
  if (!backend.supported) {
    return message ?? translator.t("backendUnsupported");
  }
  if (!backend.healthy) {
    return message ?? translator.t("backendUnsupported");
  }
  if (typeof backend.port === "number" && Number.isFinite(backend.port)) {
    return translator.t("backendReachableOnPort", { port: backend.port });
  }
  return message ?? translator.t("statusUnknownValue");
}

function resolveDirectAccessStatusMessage(translator, directAccess, daemonOnline) {
  if (!daemonOnline) {
    return translator.t("localAccessDaemonOffline");
  }
  if (!directAccess || typeof directAccess !== "object") {
    return translator.t("localAccessUnavailable");
  }

  const port =
    typeof directAccess.port === "number" && Number.isFinite(directAccess.port)
      ? Math.trunc(directAccess.port)
      : LINK_DIRECT_PORT;
  const reason =
    typeof directAccess.reason === "string" && directAccess.reason.trim()
      ? directAccess.reason.trim()
      : null;
  const message =
    typeof directAccess.message === "string" && directAccess.message.trim()
      ? directAccess.message.trim()
      : null;

  if (directAccess.status === "listening") {
    return translator.t("localAccessReadyOnPort", { port });
  }
  if (reason === "port_in_use") {
    return translator.t("localAccessPortInUse", { port });
  }
  if (reason === "permission_denied") {
    return translator.t("localAccessPermissionDenied", { port });
  }
  if (directAccess.status === "unknown") {
    return translator.t("localAccessStatusUnknown");
  }
  return message ?? translator.t("localAccessUnavailable");
}

function resolveUserFacingDaemonLaunchErrorMessage(translator, message) {
  if (typeof message !== "string" || !message.trim()) {
    return null;
  }
  const normalized = message.trim();
  if (normalized === "daemon_lock_active") {
    return translator.t("localAccessConflictWithAnotherDaemon");
  }
  return normalized;
}

function resolveDoctorLocalAccessMessage(translator, directAccess, daemonOnline, states = []) {
  if (
    daemonOnline &&
    directAccess &&
    typeof directAccess === "object" &&
    directAccess.status === "unknown" &&
    !hasDetailedDirectAccessIssue(directAccess)
  ) {
    for (const state of states) {
      const launchError = normalizeDaemonLaunchError(state);
      if (!launchError.current || !launchError.message) {
        continue;
      }
      const message = resolveUserFacingDaemonLaunchErrorMessage(
        translator,
        launchError.message,
      );
      if (message) {
        return message;
      }
    }
  }

  return resolveDirectAccessStatusMessage(translator, directAccess, daemonOnline);
}

function resolveVersionStatusMessage(translator, installedVersion, runningVersion, daemonOnline) {
  if (!daemonOnline) {
    return translator.t("statusVersionDaemonOffline", {
      installedVersion,
    });
  }
  if (runningVersion && runningVersion !== installedVersion) {
    return translator.t("statusVersionRestartNeeded", {
      installedVersion,
      runningVersion,
    });
  }
  return translator.t("statusVersionReady", {
    version: installedVersion,
  });
}

function hasDetailedDirectAccessIssue(directAccess) {
  if (!directAccess || typeof directAccess !== "object") {
    return false;
  }

  const reason =
    typeof directAccess.reason === "string" ? directAccess.reason.trim() : "";
  const message =
    typeof directAccess.message === "string" ? directAccess.message.trim() : "";
  return directAccess.status !== "listening" && Boolean(reason || message);
}

function getRelayCooldownRemainingMs(state) {
  const cooldownUntilMs = parseTimestamp(state?.relay?.cooldownUntil);
  if (cooldownUntilMs <= 0) {
    return 0;
  }
  return Math.max(0, cooldownUntilMs - Date.now());
}

function resolveStatusProblemMessage(translator, snapshot, daemonOnline) {
  const state = snapshot?.state ?? snapshot;
  const connectionStatus =
    typeof state?.connectionStatus === "string" ? state.connectionStatus.trim() : "";
  const backend = state?.backend;

  if (connectionStatus === "revoked") {
    return state?.lastErrorMessage || translator.t("linkRevoked");
  }

  if (hasDaemonVersionMismatch(snapshot, daemonOnline)) {
    return resolveVersionStatusMessage(
      translator,
      LINK_VERSION,
      resolveRunningVersion(snapshot, daemonOnline),
      daemonOnline,
    );
  }

  if (connectionStatus === "approval_required" || isBackendApprovalRequired(backend)) {
    return resolveBackendStatusMessage(translator, backend);
  }

  if (typeof state?.lastErrorMessage === "string" && state.lastErrorMessage.trim()) {
    return state.lastErrorMessage.trim();
  }

  if (backend?.detected && (!backend?.healthy || !backend?.supported)) {
    return resolveBackendStatusMessage(translator, backend);
  }

  if (
    daemonOnline &&
    backend?.detected &&
    backend?.healthy &&
    backend?.supported &&
    hasDetailedDirectAccessIssue(state?.directAccess)
  ) {
    return resolveDirectAccessStatusMessage(translator, state.directAccess, daemonOnline);
  }

  return null;
}

function resolveStatusNextStepMessage(translator, snapshot, daemonOnline) {
  const state = snapshot?.state ?? snapshot;
  const connectionStatus =
    typeof state?.connectionStatus === "string" ? state.connectionStatus.trim() : "";
  const backend = state?.backend;
  const relayCooldownRemainingMs = getRelayCooldownRemainingMs(state);

  if (connectionStatus === "revoked") {
    return translator.t("statusNextStepPair");
  }

  if (connectionStatus === "approval_required" || isBackendApprovalRequired(backend)) {
    return translator.t("statusNextStepApprove");
  }

  if (!state?.linkId) {
    return translator.t("statusNextStepPair");
  }

  if (!daemonOnline) {
    return translator.t("statusNextStepStart");
  }

  if (hasDaemonVersionMismatch(snapshot, daemonOnline)) {
    return translator.t("statusNextStepRestart");
  }

  if (!backend?.detected) {
    return translator.t("statusNextStepRestoreOpenClaw");
  }

  if (!backend?.healthy || !backend?.supported) {
    return translator.t("statusNextStepDoctor");
  }

  if (relayCooldownRemainingMs > 0) {
    return translator.t("statusNextStepWaitForRelayRetry", {
      waitSeconds: Math.max(1, Math.ceil(relayCooldownRemainingMs / 1000)),
    });
  }

  if (hasDetailedDirectAccessIssue(state?.directAccess)) {
    return translator.t("statusNextStepRestartAfterFix");
  }

  if (connectionStatus === "connecting") {
    return translator.t("statusNextStepWait");
  }

  return null;
}

function resolveConnectionStatusMessage(translator, connectionStatus) {
  switch (connectionStatus) {
    case "new":
      return translator.t("statusStateNew");
    case "pairing":
      return translator.t("statusStatePairing");
    case "paired":
      return translator.t("statusStatePaired");
    case "connecting":
      return translator.t("statusStateConnecting");
    case "connected":
      return translator.t("statusStateConnected");
    case "degraded":
      return translator.t("statusStateDegraded");
    case "backend_missing":
      return translator.t("statusStateBackendMissing");
    case "approval_required":
      return translator.t("statusStateApprovalRequired");
    case "revoked":
      return translator.t("statusStateRevoked");
    default:
      return normalizeConnectionStatusFallback(connectionStatus, translator);
  }
}

function normalizeConnectionStatusFallback(connectionStatus, translator) {
  if (typeof connectionStatus !== "string" || !connectionStatus.trim()) {
    return translator.t("statusUnknownValue");
  }
  return connectionStatus;
}

function resolveConnectionPathMessage(translator, state, daemonOnline, relayConnected) {
  const linkId = state?.linkId;
  const backend = state?.backend;
  const directAccess = state?.directAccess;
  const publicDirect = state?.publicDirect;
  const connectionStatus = state?.connectionStatus;
  const directReady = directAccess?.status === "listening";
  const publicCandidate =
    (typeof publicDirect?.ipv4Host === "string" && publicDirect.ipv4Host.trim().length > 0) ||
    (typeof publicDirect?.ipv6Host === "string" && publicDirect.ipv6Host.trim().length > 0);
  const backendDetected = Boolean(backend?.detected);
  const backendHealthy = Boolean(backend?.healthy);
  const backendSupported = Boolean(backend?.supported);

  if (connectionStatus === "revoked") {
    return translator.t("statusStateRevoked");
  }
  if (connectionStatus === "approval_required" || isBackendApprovalRequired(backend)) {
    return translator.t("statusPathApprovalRequired");
  }
  if (!linkId) {
    return translator.t("statusPathSetupNeeded");
  }
  if (!daemonOnline) {
    return translator.t("statusPathDaemonOffline");
  }
  if (!backendDetected) {
    return translator.t("statusPathBackendMissing");
  }
  if (!backendHealthy || !backendSupported) {
    return translator.t("statusPathDegraded");
  }
  if (directReady && publicCandidate && relayConnected) {
    return translator.t("statusPathLanPublicAndRelay");
  }
  if (directReady && publicCandidate) {
    return translator.t("statusPathLanAndPublic");
  }
  if (publicCandidate && relayConnected) {
    return translator.t("statusPathPublicAndRelay");
  }
  if (publicCandidate) {
    return translator.t("statusPathPublicOnly");
  }
  if (directReady && relayConnected) {
    return translator.t("statusPathLanAndRelay");
  }
  if (directReady) {
    return translator.t("statusPathLanOnly");
  }
  if (relayConnected) {
    return translator.t("statusPathRelayOnly");
  }
  if (connectionStatus === "connecting") {
    return translator.t("statusPathRelayConnecting");
  }
  return translator.t("statusPathUnavailable");
}

function resolveDaemonStartOutcomeMessage(translator, snapshot) {
  const state = snapshot?.state;
  const connectionStatus =
    typeof state?.connectionStatus === "string" ? state.connectionStatus.trim() : "";
  const directReady = state?.directAccess?.status === "listening";

  if (snapshot?.relayConnected || connectionStatus === "connected") {
    return translator.t("startOutcomeConnected");
  }
  if (connectionStatus === "backend_missing") {
    return translator.t("startOutcomeBackendMissing");
  }
  if (connectionStatus === "approval_required" || isBackendApprovalRequired(state?.backend)) {
    return translator.t("startOutcomeApprovalRequired");
  }
  if (connectionStatus === "degraded") {
    return translator.t("startOutcomeNeedsAttention");
  }
  if (connectionStatus === "revoked") {
    return state?.lastErrorMessage || translator.t("linkRevoked");
  }
  if (directReady) {
    return translator.t("startOutcomeLocalReady");
  }
  return translator.t("startOutcomeConnecting");
}

function normalizeDetectedPublicHost(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/^\[|\]$/g, "");
  return normalized || null;
}

function isWslCliEnvironment() {
  if (process.platform !== "linux") {
    return false;
  }
  if (
    (typeof process.env.WSL_DISTRO_NAME === "string" && process.env.WSL_DISTRO_NAME.trim()) ||
    (typeof process.env.WSL_INTEROP === "string" && process.env.WSL_INTEROP.trim())
  ) {
    return true;
  }
  return os.release().toLowerCase().includes("microsoft");
}

function formatDetectedAddressValue(translator, values) {
  if (!Array.isArray(values) || values.length <= 0) {
    return translator.t("startDetectedAddressNone");
  }
  return values.join(", ");
}

function printDetectedDirectAddresses(translator, snapshot) {
  let lanAddresses = Array.isArray(snapshot?.state?.directAccess?.lanIpv4Hosts)
    ? snapshot.state.directAccess.lanIpv4Hosts
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim())
    : [];
  if (lanAddresses.length <= 0 && !isWslCliEnvironment()) {
    try {
      lanAddresses = listLanIpv4Addresses();
    } catch {
      lanAddresses = [];
    }
  }
  const publicIpv4 = normalizeDetectedPublicHost(snapshot?.state?.publicDirect?.ipv4Host);
  const publicIpv6 = normalizeDetectedPublicHost(snapshot?.state?.publicDirect?.ipv6Host);

  console.log(translator.t("startDetectedAddressesTitle"));
  console.log(
    `- ${translator.t("startDetectedLanIpv4Label")}: ${formatDetectedAddressValue(translator, lanAddresses)}`,
  );
  console.log(
    `- ${translator.t("startDetectedPublicIpv4Label")}: ${formatDetectedAddressValue(translator, publicIpv4 ? [publicIpv4] : [])}`,
  );
  console.log(
    `- ${translator.t("startDetectedPublicIpv6Label")}: ${formatDetectedAddressValue(translator, publicIpv6 ? [publicIpv6] : [])}`,
  );
}

async function waitForDaemonConnectionSnapshot(timeoutMs = 8_000) {
  const startedAt = Date.now();
  let lastSnapshot = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const snapshot = await sendIpcRequest("status.get", {}, 700);
      lastSnapshot = snapshot;
      const connectionStatus =
        typeof snapshot?.state?.connectionStatus === "string"
          ? snapshot.state.connectionStatus.trim()
          : "";
      const directStatus =
        typeof snapshot?.state?.directAccess?.status === "string"
          ? snapshot.state.directAccess.status.trim()
          : "";

      if (
        snapshot?.relayConnected ||
        connectionStatus === "connected" ||
        connectionStatus === "backend_missing" ||
        connectionStatus === "degraded" ||
        connectionStatus === "revoked" ||
        (connectionStatus === "paired" && directStatus !== "unknown")
      ) {
        return snapshot;
      }
    } catch {
      // Ignore transient IPC failures while the daemon is still booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return lastSnapshot;
}

async function getDaemonSnapshot(timeoutMs = 700) {
  try {
    return await sendIpcRequest("status.get", {}, timeoutMs);
  } catch {
    return null;
  }
}

async function waitForDaemonToStop(timeoutMs = 5_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = await getDaemonSnapshot(500);
    if (!snapshot) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return (await getDaemonSnapshot(500)) === null;
}

async function reportDaemonStartOutcome(translator) {
  const snapshot = await waitForDaemonConnectionSnapshot();
  console.log(resolveDaemonStartOutcomeMessage(translator, snapshot));
  printDetectedDirectAddresses(translator, snapshot);
  await printDirectAccessWarningIfNeeded(translator);
  return snapshot;
}

async function startDaemonInBackground(translator, options = {}) {
  await refreshAutostartLaunchersIfEnabled();
  const reuseExisting = options.reuseExisting !== false;
  let runningSnapshot = await getDaemonSnapshot();
  let daemonPids = await listUnixLinkDaemonPids();
  const shouldResetBrokenDaemonSet =
    daemonPids.length > (runningSnapshot ? 1 : 0) || (daemonPids.length > 0 && !runningSnapshot);

  if (shouldResetBrokenDaemonSet) {
    const shutdownResult = await shutdownAllLinkDaemons({
      allowIpcFailure: true,
    });
    if (!shutdownResult.ipcStopped || shutdownResult.remainingOrphans.length > 0) {
      const diagnosis = await inspectDaemonRuntimeDiagnosis(await loadState());
      throw buildDaemonStartFailureError(
        translator,
        diagnosis,
        options.readyErrorKey === "restartFailed",
      );
    }
    runningSnapshot = null;
    daemonPids = [];
  }

  let restartingForUpdate = false;

  if (reuseExisting) {
    if (runningSnapshot) {
      if (!hasDaemonVersionMismatch(runningSnapshot, true)) {
        await sendIpcRequest("daemon.reconnect", {});
        console.log(translator.t("daemonAlreadyRunning"));
        return await reportDaemonStartOutcome(translator);
      }

      restartingForUpdate = true;
      console.log(
        translator.t("daemonRestartingForUpdate", {
          installedVersion: LINK_VERSION,
          runningVersion: resolveRunningVersion(runningSnapshot, true),
        }),
      );
      try {
        await shutdownAllLinkDaemons({
          allowIpcFailure: true,
        });
      } catch {
        // Ignore shutdown failures and still wait for the old daemon to disappear.
      }
      if ((await listUnixLinkDaemonPids()).length > 0 || !(await waitForDaemonToStop())) {
        throw new Error(translator.t("restartFailed"));
      }
    }
  }

  spawnBackgroundDaemon();
  const ready = await waitForDaemonReady();
  if (!ready) {
    const diagnosis = await inspectDaemonRuntimeDiagnosis(await loadState());
    throw buildDaemonStartFailureError(translator, diagnosis, restartingForUpdate);
  }
  console.log(translator.t(options.startedMessageKey ?? (restartingForUpdate ? "restartDone" : "daemonStarted")));
  return await reportDaemonStartOutcome(translator);
}

function hasConfigChangedForDaemon(currentConfig, nextConfig) {
  return JSON.stringify(currentConfig) !== JSON.stringify(nextConfig);
}

async function restartDaemonWithLatestConfig(translator) {
  const runningSnapshot = await getDaemonSnapshot();
  const daemonPids = await listUnixLinkDaemonPids();
  const hasDaemonToRestart = Boolean(runningSnapshot) || daemonPids.length > 0;

  if (!hasDaemonToRestart) {
    return await startDaemonInBackground(translator, {
      startedMessageKey: "restartStarted",
      readyErrorKey: "startDaemonFailed",
    });
  }

  const shutdownResult = await shutdownAllLinkDaemons({
    allowIpcFailure: !runningSnapshot,
  });
  if ((runningSnapshot && !shutdownResult.ipcStopped) || shutdownResult.remainingOrphans.length > 0) {
    throw new Error(translator.t("restartFailed"));
  }

  return await startDaemonInBackground(translator, {
    reuseExisting: false,
    startedMessageKey: "restartDone",
    readyErrorKey: "restartFailed",
  });
}

async function ensureDaemonReadyForPair(translator, currentConfig, nextConfig) {
  if (hasConfigChangedForDaemon(currentConfig, nextConfig)) {
    return await restartDaemonWithLatestConfig(translator);
  }

  return await startDaemonInBackground(translator, {
    readyErrorKey: "startDaemonFailed",
  });
}

async function printDirectAccessWarningIfNeeded(translator) {
  let snapshot = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      snapshot = await sendIpcRequest("status.get", {});
    } catch {
      return;
    }

    if (snapshot?.state?.directAccess?.status !== "unknown") {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (snapshot?.state?.directAccess?.status === "listening") {
    return;
  }

  console.warn(translator.t("localAccessNeedsAttention"));
  console.warn(
    resolveDirectAccessStatusMessage(translator, snapshot?.state?.directAccess, true),
  );
}

async function loadRuntimeSnapshot() {
  const [config, state, credentials] = await Promise.all([
    loadConfig(),
    loadState(),
    loadCredentials(),
  ]);
  const t = createTranslator(resolveLanguage(config.language));
  return { config, state, credentials, t };
}

function getValidatedRelayBaseUrl(translator, config) {
  const relayBaseUrl = normalizeHttpsBaseUrl(config.relayBaseUrl);
  if (!relayBaseUrl) {
    throw new Error(
      translator.t("relayConfigInsecure", {
        configFile: runtimePaths.configFile,
      }),
    );
  }
  return relayBaseUrl;
}

async function commandPair() {
  const { config: loadedConfig, credentials } = await loadRuntimeSnapshot();
  const { config, translator: t } = await ensurePairLanguagePreference(loadedConfig, credentials);
  const pairableBackend = await ensureBackendReadyForPair(config, credentials, t);
  if (!pairableBackend) {
    process.exitCode = 1;
    return;
  }

  const activeConfig = pairableBackend.config;
  activeConfig.relayBaseUrl = getValidatedRelayBaseUrl(t, activeConfig);

  if (credentials.linkId) {
    await ensureDaemonReadyForPair(t, config, activeConfig);
    await commandQr();
    return;
  }

  const pairing = await createPairingSession({
    apiBaseUrl: activeConfig.apiBaseUrl,
    installId: activeConfig.installId,
    displayName: activeConfig.displayName,
    hostname: os.hostname(),
    platform: process.platform,
  });

  await patchState({
    connectionStatus: "pairing",
    pairingSession: {
      pairingSessionId: pairing.pairingSessionId,
      expiresAt: pairing.expiresAt,
      shortCode: pairing.shortCode,
      claimMode: pairing.claimMode,
    },
  });

  console.log(t.t("pairingCreated"));
  console.log(`${t.t("scanPrompt")}`);
  await printPairingQr(pairing, activeConfig, t, {
    fileName: "pairing-qr.svg",
  });
  console.log(`${t.t("manualCode")}: ${pairing.shortCode}`);
  console.log(t.t("waitingForScan"));

  const expiresAtMs = Date.parse(pairing.expiresAt);
  let pollAttempt = 0;
  while (Date.now() < expiresAtMs) {
    let bootstrap;
    try {
      bootstrap = await bootstrapLink({
        apiBaseUrl: activeConfig.apiBaseUrl,
        pairingSessionId: pairing.pairingSessionId,
        pairingToken: pairing.pairingToken,
        installId: activeConfig.installId,
        displayName: activeConfig.displayName,
        hostname: os.hostname(),
        platform: process.platform,
      });
    } catch (error) {
      if (
        error instanceof ServerApiError &&
        (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 410)
      ) {
        console.error(error.message);
        process.exitCode = 1;
        return;
      }
      pollAttempt += 1;
      const remainingMs = expiresAtMs - Date.now();
      if (remainingMs <= 0) {
        break;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(resolveBootstrapPollDelayMs(pollAttempt), remainingMs)),
      );
      continue;
    }

    if (bootstrap.ready) {
      await saveCredentials({
        linkId: bootstrap.link.linkId,
        refreshToken: bootstrap.refreshToken,
        refreshTokenExpiresAt: bootstrap.refreshTokenExpiresAt,
        accessToken: bootstrap.accessToken?.token ?? null,
        accessTokenExpiresAt: bootstrap.accessToken?.expiresAt ?? null,
        connectTokenSecret: bootstrap.connectTokenVerifier?.secret ?? null,
      });
      await patchState({
        linkId: bootstrap.link.linkId,
        pairingSession: null,
        connectionStatus: "paired",
        lastErrorMessage: null,
      });
      await installSkill(resolveLanguage(activeConfig.language), activeConfig);
      console.log(t.t("pairingSuccess"));
      console.log(t.t("startDaemonAfterPair"));
      const daemonSnapshot = await ensureDaemonReadyForPair(t, config, activeConfig);
      await maybePromptToEnableAutostart(t);
      await printDirectAccessSetupGuide(t, daemonSnapshot);
      return;
    }

    pollAttempt += 1;
    const remainingMs = expiresAtMs - Date.now();
    if (remainingMs <= 0) {
      break;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(resolveBootstrapPollDelayMs(pollAttempt), remainingMs)),
    );
  }

  console.error(t.t("pairingExpired"));
  process.exitCode = 1;
}

async function commandQr() {
  const { config, credentials, t } = await loadRuntimeSnapshot();
  if (!credentials.linkId) {
    console.error(t.t("qrNeedsPair"));
    process.exitCode = 1;
    return;
  }

  const pairing = await createPairingSession({
    apiBaseUrl: config.apiBaseUrl,
    installId: config.installId,
    displayName: config.displayName,
    hostname: os.hostname(),
    platform: process.platform,
  });

  await patchState({
    pairingSession: {
      pairingSessionId: pairing.pairingSessionId,
      expiresAt: pairing.expiresAt,
      shortCode: pairing.shortCode,
      claimMode: pairing.claimMode,
    },
  });

  console.log(t.t("qrJoinReady"));
  console.log(`${t.t("scanPrompt")}`);
  await printPairingQr(pairing, config, t, {
    fileName: "join-qr.svg",
  });
  console.log(`${t.t("manualCode")}: ${pairing.shortCode}`);
}

async function commandConnect(flags) {
  await commandStart(flags);
}

async function commandStart(flags) {
  const { config, credentials, t } = await loadRuntimeSnapshot();
  if (!credentials.linkId) {
    console.error(t.t("notPaired"));
    process.exitCode = 1;
    return;
  }

  const startableBackend = await ensureBackendReadyForPair(config, credentials, t);
  if (!startableBackend) {
    process.exitCode = 1;
    return;
  }

  const activeConfig = startableBackend.config;

  if (flags.has("--foreground")) {
    activeConfig.relayBaseUrl = getValidatedRelayBaseUrl(t, activeConfig);
    console.log(t.t("startForeground"));
    const state = await loadState();
    const daemon = new LinkDaemon(activeConfig, state, credentials);
    process.on("SIGINT", () => {
      void daemon.stop();
    });
    process.on("SIGTERM", () => {
      void daemon.stop();
    });
    await daemon.start();
    return;
  }

  activeConfig.relayBaseUrl = getValidatedRelayBaseUrl(t, activeConfig);
  await ensureDaemonReadyForPair(t, config, activeConfig);
}

async function commandStatus(flags) {
  const { credentials, state, t } = await loadRuntimeSnapshot();
  let daemonOnline = false;
  let snapshot = {
    state,
    credentials,
  };

  try {
    snapshot = await sendIpcRequest("status.get", {});
    daemonOnline = true;
  } catch {
    daemonOnline = false;
  }
  const normalizedSnapshot = normalizeSnapshotForDisplay(snapshot, daemonOnline);

  if (flags.has("--json")) {
    const { version: _ignoredVersion, ...snapshotWithoutVersion } = normalizedSnapshot;
    console.log(
      JSON.stringify(
        {
          ...snapshotWithoutVersion,
          daemonOnline,
          cliVersion: LINK_VERSION,
          daemonVersion: typeof normalizedSnapshot.version === "string" ? normalizedSnapshot.version : null,
          daemonVersionMismatch:
            daemonOnline &&
            typeof normalizedSnapshot.version === "string" &&
            normalizedSnapshot.version.trim() !== "" &&
            normalizedSnapshot.version.trim() !== LINK_VERSION,
          stateLabel: resolveConnectionStatusMessage(t, normalizedSnapshot.state?.connectionStatus),
          connectionPathSummary: resolveConnectionPathMessage(
            t,
            normalizedSnapshot.state,
            daemonOnline,
            Boolean(normalizedSnapshot?.relayConnected),
          ),
          problemSummary: resolveStatusProblemMessage(t, normalizedSnapshot, daemonOnline),
          nextStepSummary: resolveStatusNextStepMessage(t, normalizedSnapshot, daemonOnline),
        },
        null,
        2,
      ),
    );
    return;
  }

  printHumanStatus(t, normalizedSnapshot, daemonOnline);
}

async function commandHelp() {
  printHelp(createCliTranslator());
}

async function commandVersion() {
  console.log(LINK_VERSION);
}

async function commandDoctor(flags) {
  const { config, state, credentials, t } = await loadRuntimeSnapshot();
  const backend = await detectOpenClawBackend(config);
  const daemonSnapshot = await getDaemonSnapshot();
  const daemonOnline = Boolean(daemonSnapshot);
  let liveState = state;
  if (daemonSnapshot?.state && typeof daemonSnapshot.state === "object") {
    liveState = daemonSnapshot.state;
  }
  const runningVersion = resolveRunningVersion(daemonSnapshot, daemonOnline);
  const daemonVersionMismatch = hasDaemonVersionMismatch(daemonSnapshot, daemonOnline);
  const daemonRuntimeDiagnosis = await inspectDaemonRuntimeDiagnosis(liveState, daemonSnapshot);
  const relayBaseUrl = normalizeHttpsBaseUrl(config.relayBaseUrl);
  const relayHealth = relayBaseUrl
    ? await fetch(`${relayBaseUrl}/healthz`)
        .then((response) => response.ok)
        .catch(() => false)
    : false;
  const apiHealth = await fetch(`${config.apiBaseUrl.replace(/\/+$/, "")}/healthz`)
    .then((response) => response.ok)
    .catch(() => false);
  const skillPath = resolveOpenClawSkillPath(config);
  const skillInstalled = await fsp.access(skillPath).then(() => true).catch(() => false);

  const checks = [
    {
      key: "paired",
      ok: Boolean(credentials.linkId),
      message: Boolean(credentials.linkId) ? t.t("pairedOk") : t.t("notPaired"),
    },
    {
      key: "daemon",
      ok: daemonOnline,
      message: daemonOnline ? t.t("daemonRunning") : t.t("daemonNotRunning"),
    },
    {
      key: "version",
      ok: !daemonOnline || !daemonVersionMismatch,
      message: resolveVersionStatusMessage(t, LINK_VERSION, runningVersion, daemonOnline),
    },
    {
      key: "relay-config",
      ok: Boolean(relayBaseUrl),
      message: relayBaseUrl
        ? t.t("relayConfigSecure")
        : t.t("relayConfigInsecure", {
            configFile: runtimePaths.configFile,
          }),
    },
    {
      key: "backend",
      ok: backend.detected && backend.supported && backend.healthy,
      message: resolveBackendStatusMessage(t, backend),
    },
    {
      key: "local-access",
      ok: daemonOnline && liveState.directAccess?.status === "listening",
      message: resolveDoctorLocalAccessMessage(
        t,
        liveState.directAccess,
        daemonOnline,
        [liveState, state],
      ),
    },
    {
      key: "relay",
      ok: relayBaseUrl ? relayHealth : false,
      message: relayBaseUrl
        ? relayHealth
          ? t.t("relayReachable")
          : t.t("relayUnreachable")
        : t.t("relayCheckSkipped"),
    },
    {
      key: "api",
      ok: apiHealth,
      message: apiHealth ? t.t("apiReachable") : t.t("apiUnreachable"),
    },
    {
      key: "skill",
      ok: skillInstalled,
      message: skillInstalled ? t.t("skillInstalled") : t.t("skillMissing"),
    },
  ];

  if (!daemonOnline) {
    checks.splice(2, 0, {
      key: "daemon-runtime",
      ok: daemonRuntimeDiagnosis.issue === "daemon_offline",
      message: resolveDaemonRuntimeDiagnosisMessage(t, daemonRuntimeDiagnosis),
    });
  }

  if (flags.has("--json")) {
    console.log(
      JSON.stringify(
        {
          ok: checks.every((item) => item.ok),
          checks,
          backend,
          daemonOnline,
          daemonRuntimeDiagnosis,
          state: liveState,
        },
        null,
        2,
      ),
    );
    return;
  }

  for (const check of checks) {
    console.log(`- [${check.ok ? "OK" : "NO"}] ${check.message}`);
  }
  console.log(checks.every((item) => item.ok) ? t.t("doctorSummaryOk") : t.t("doctorSummaryFix"));
}

async function commandRestart() {
  const { config, credentials, t } = await loadRuntimeSnapshot();
  const restartableBackend = await ensureBackendReadyForPair(config, credentials, t);
  if (!restartableBackend) {
    process.exitCode = 1;
    return;
  }
  const activeConfig = restartableBackend.config;
  activeConfig.relayBaseUrl = getValidatedRelayBaseUrl(t, activeConfig);
  const shutdownResult = await shutdownAllLinkDaemons({
    allowIpcFailure: true,
  });
  if (!shutdownResult.ipcStopped || shutdownResult.remainingOrphans.length > 0) {
    throw new Error(t.t("restartFailed"));
  }
  await ensureDaemonReadyForPair(t, config, activeConfig);
}

async function commandStop() {
  const { t } = await loadRuntimeSnapshot();
  const stopResult = await stopDaemonIfRunning(t);
  console.log(t.t(stopResult.stopped ? "daemonStopped" : "daemonAlreadyStopped"));
}

async function commandAutostart(action) {
  const { t } = await loadRuntimeSnapshot();
  const status = await getAutostartStatus();

  if (action === "on") {
    if (status.enabled) {
      await refreshAutostartLaunchersIfEnabled();
      console.log(
        t.t("autostartAlreadyEnabled", {
          method: status.method,
        }),
      );
      return;
    }

    try {
      const result = await enableAutostart();
      console.log(
        t.t("autostartEnabledWithMethod", {
          method: result.method,
        }),
      );
      if (result.warning) {
        console.log(result.warning);
      }
    } catch (error) {
      throw new Error(formatAutostartFailureReason(t, error));
    }
    return;
  }

  if (action === "off") {
    if (!status.enabled && !status.configured) {
      console.log(t.t("autostartAlreadyDisabled"));
      return;
    }
    await disableAutostart();
    console.log(t.t("autostartDisabled"));
    return;
  }

  throw new Error(t.t("autostartUsage"));
}

async function commandUnpair(flags) {
  const { t } = await loadRuntimeSnapshot();
  if (!flags.has("--yes")) {
    console.error(t.t("unpairConfirm"));
    process.exitCode = 1;
    return;
  }
  await shutdownAllLinkDaemons({
    allowIpcFailure: true,
  }).catch(() => undefined);
  await clearLocalPairingState();
  console.log(t.t("daemonStopped"));
}

async function commandUninstall(flags) {
  const { config, t } = await loadRuntimeSnapshot();
  const shouldUnpair = flags.has("--unpair");

  if (!flags.has("--yes")) {
    console.error(t.t("uninstallConfirm"));
    process.exitCode = 1;
    return;
  }

  const stopResult = await stopDaemonIfRunning(t);
  console.log(t.t(stopResult.stopped ? "daemonStopped" : "daemonAlreadyStopped"));

  let autostartDisabled = false;
  try {
    autostartDisabled = await disableAutostartIfConfigured();
  } catch (error) {
    throw new Error(formatAutostartFailureReason(t, error));
  }
  console.log(t.t(autostartDisabled ? "autostartDisabled" : "autostartAlreadyDisabled"));

  if (shouldUnpair) {
    await clearLocalRuntimeData(config);
    console.log(t.t("uninstallLocalDataRemoved"));
  } else {
    await removeInstalledSkill(config);
  }

  console.log(t.t("uninstallPrepared"));
  console.log(t.t("uninstallNextStep"));
}

async function commandDaemon() {
  const [config, state, credentials] = await Promise.all([
    loadConfig(),
    loadState(),
    loadCredentials(),
  ]);
  const t = createTranslator(resolveLanguage(config.language));
  try {
    config.relayBaseUrl = getValidatedRelayBaseUrl(t, config);
    const daemon = new LinkDaemon(config, state, credentials);
    process.on("SIGINT", () => {
      void daemon.stop();
    });
    process.on("SIGTERM", () => {
      void daemon.stop();
    });
    await daemon.start();
  } catch (error) {
    if (await recoverFromBenignDaemonLockConflict(error)) {
      return;
    }
    await recordDaemonLaunchFailure(credentials, error);
    throw error;
  }
}

async function main() {
  const { flags, values } = parseFlags(process.argv.slice(2));
  const rawCommand = values[0] ?? null;
  const rawSubcommand = values[1] ?? null;
  const command =
    rawCommand ??
    (flags.has("--help") || flags.has("-h")
      ? "help"
      : flags.has("--version") || flags.has("-v")
        ? "version"
        : "status");
  const t = createCliTranslator();

  switch (command) {
    case "help":
      await commandHelp();
      return;
    case "version":
      await commandVersion();
      return;
    case "pair":
      await commandPair();
      return;
    case "qr":
      await commandQr();
      return;
    case "start":
      await commandStart(flags);
      return;
    case "connect":
      await commandConnect(flags);
      return;
    case "status":
      await commandStatus(flags);
      return;
    case "doctor":
      await commandDoctor(flags);
      return;
    case "restart":
      await commandRestart();
      return;
    case "stop":
      await commandStop();
      return;
    case "autostart":
      await commandAutostart(rawSubcommand);
      return;
    case "enable-autostart":
      await commandAutostart("on");
      return;
    case "disable-autostart":
      await commandAutostart("off");
      return;
    case "uninstall":
      await commandUninstall(flags);
      return;
    case "unpair":
      await commandUnpair(flags);
      return;
    case "daemon":
      await commandDaemon();
      return;
    default:
      console.error(`${t.t("unknownCommand")}: ${command}`);
      console.error(t.t("availableCommands"));
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
