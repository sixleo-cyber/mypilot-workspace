import { execFile } from "node:child_process";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureRuntimeLayout, runtimePaths } from "./runtime.js";

const AUTOSTART_DARWIN_LABEL = "me.clawpilot.link";
const AUTOSTART_LINUX_UNIT = "clawpilot-link.service";
const AUTOSTART_WINDOWS_TASK = "ClawPilot Link";

export class AutostartError extends Error {
  constructor(code, detail = null) {
    super(detail || code);
    this.name = "AutostartError";
    this.code = code;
    this.detail = detail;
  }
}

export function isAutostartError(error) {
  return error instanceof AutostartError;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function powerShellQuote(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function quoteCmdScriptArg(value) {
  const stringValue = String(value ?? "");
  if (!stringValue) {
    return '""';
  }
  const escaped = stringValue
    .replace(/"/g, '\\"')
    .replace(/%/g, "%%")
    .replace(/!/g, "^!");
  if (!/[ \t"&|<>^()%!]/g.test(stringValue)) {
    return escaped;
  }
  return `"${escaped}"`;
}

function quoteSchtasksArg(value) {
  const stringValue = String(value ?? "");
  if (!/[ \t"]/g.test(stringValue)) {
    return stringValue;
  }
  return `"${stringValue.replace(/"/g, '\\"')}"`;
}

function systemdEscapeArg(value) {
  const stringValue = String(value ?? "");
  if (!/[\s"\\]/.test(stringValue)) {
    return stringValue;
  }
  return `"${stringValue.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function normalizeNonEmptyString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function createAutostartError(code, detail = null) {
  return new AutostartError(code, normalizeNonEmptyString(detail));
}

function buildLaunchAgentPlist(programPath) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${xmlEscape(AUTOSTART_DARWIN_LABEL)}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
      <key>SuccessfulExit</key>
      <false/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>1</integer>
    <key>Umask</key>
    <integer>63</integer>
    <key>ProgramArguments</key>
    <array>
      <string>${xmlEscape(programPath)}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${xmlEscape(runtimePaths.baseDir)}</string>
    <key>StandardOutPath</key>
    <string>${xmlEscape(runtimePaths.autostartStdoutLogFile)}</string>
    <key>StandardErrorPath</key>
    <string>${xmlEscape(runtimePaths.autostartStderrLogFile)}</string>
  </dict>
</plist>
`;
}

function buildSystemdUnit(programPath) {
  const execStart = [programPath].map(systemdEscapeArg).join(" ");
  return [
    "[Unit]",
    "Description=ClawPilot Link",
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    `ExecStart=${execStart}`,
    `WorkingDirectory=${systemdEscapeArg(runtimePaths.baseDir)}`,
    "Restart=on-failure",
    "RestartSec=5",
    "TimeoutStopSec=30",
    "TimeoutStartSec=30",
    "SuccessExitStatus=0 143",
    "KillMode=control-group",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");
}

function buildWindowsStartupLauncher() {
  return [
    "@echo off",
    "rem ClawPilot Link login item fallback",
    'set "TASK_SCRIPT=%USERPROFILE%\\.clawpilot\\link\\autostart\\link-daemon.cmd"',
    'if not exist "%TASK_SCRIPT%" exit /b 0',
    'start "" /min cmd.exe /d /c "%TASK_SCRIPT%"',
    "",
  ].join("\r\n");
}

function getDarwinPlistPath() {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${AUTOSTART_DARWIN_LABEL}.plist`);
}

function getLinuxUnitPath() {
  return path.join(os.homedir(), ".config", "systemd", "user", AUTOSTART_LINUX_UNIT);
}

function getWindowsStartupPath() {
  const appData = process.env.APPDATA?.trim();
  if (appData) {
    return path.join(
      appData,
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
      "Startup",
      `${AUTOSTART_WINDOWS_TASK}.cmd`,
    );
  }
  return path.join(
    os.homedir(),
    "AppData",
    "Roaming",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    `${AUTOSTART_WINDOWS_TASK}.cmd`,
  );
}

function getCurrentCliPath() {
  return fileURLToPath(new URL("./cli.js", import.meta.url));
}

function buildDarwinShellLauncher(nodePath, cliPath) {
  const plistPath = getDarwinPlistPath();
  return [
    "#!/bin/sh",
    `NODE_PATH=${shellQuote(nodePath)}`,
    `CLI_PATH=${shellQuote(cliPath)}`,
    `PLIST_PATH=${shellQuote(plistPath)}`,
    'if [ ! -x "$NODE_PATH" ] || [ ! -f "$CLI_PATH" ]; then',
    '  DOMAIN="gui/$(id -u)"',
    `  SERVICE_TARGET="$DOMAIN/${AUTOSTART_DARWIN_LABEL}"`,
    '  launchctl disable "$SERVICE_TARGET" >/dev/null 2>&1 || true',
    '  launchctl bootout "$SERVICE_TARGET" >/dev/null 2>&1 || true',
    '  launchctl bootout "$DOMAIN" "$PLIST_PATH" >/dev/null 2>&1 || true',
    '  rm -f "$PLIST_PATH"',
    "  exit 0",
    "fi",
    `exec ${shellQuote(nodePath)} ${shellQuote(cliPath)} daemon`,
    "",
  ].join("\n");
}

function buildLinuxShellLauncher(nodePath, cliPath) {
  const unitPath = getLinuxUnitPath();
  return [
    "#!/bin/sh",
    `NODE_PATH=${shellQuote(nodePath)}`,
    `CLI_PATH=${shellQuote(cliPath)}`,
    `UNIT_PATH=${shellQuote(unitPath)}`,
    'if [ ! -x "$NODE_PATH" ] || [ ! -f "$CLI_PATH" ]; then',
    `  systemctl --user disable ${shellQuote(AUTOSTART_LINUX_UNIT)} >/dev/null 2>&1 || true`,
    '  rm -f "$UNIT_PATH"',
    '  systemctl --user daemon-reload >/dev/null 2>&1 || true',
    "  exit 0",
    "fi",
    `exec ${shellQuote(nodePath)} ${shellQuote(cliPath)} daemon`,
    "",
  ].join("\n");
}

function buildShellLauncher(nodePath, cliPath) {
  if (process.platform === "darwin") {
    return buildDarwinShellLauncher(nodePath, cliPath);
  }
  if (process.platform === "linux") {
    return buildLinuxShellLauncher(nodePath, cliPath);
  }
  return [
    "#!/bin/sh",
    `exec ${shellQuote(nodePath)} ${shellQuote(cliPath)} daemon`,
    "",
  ].join("\n");
}

function buildWindowsPowerShellLauncher(nodePath, cliPath) {
  return [
    "$ErrorActionPreference = 'Stop'",
    `$taskName = ${powerShellQuote(AUTOSTART_WINDOWS_TASK)}`,
    `$nodePath = ${powerShellQuote(nodePath)}`,
    `$cliPath = ${powerShellQuote(cliPath)}`,
    `$runtimeDir = ${powerShellQuote(runtimePaths.baseDir)}`,
    `$startupPath = ${powerShellQuote(getWindowsStartupPath())}`,
    `$stdoutLog = ${powerShellQuote(runtimePaths.autostartStdoutLogFile)}`,
    `$stderrLog = ${powerShellQuote(runtimePaths.autostartStderrLogFile)}`,
    "if (-not (Test-Path -LiteralPath $nodePath -PathType Leaf) -or -not (Test-Path -LiteralPath $cliPath -PathType Leaf)) {",
    "  try { & schtasks.exe /Delete /TN $taskName /F *> $null } catch {}",
    "  try { Remove-Item -LiteralPath $startupPath -Force -ErrorAction SilentlyContinue } catch {}",
    "  exit 0",
    "}",
    "try {",
    "  Start-Process -FilePath $nodePath -ArgumentList @($cliPath, 'daemon') -WorkingDirectory $runtimeDir -WindowStyle Hidden -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog | Out-Null",
    "} catch {",
    "  $_ | Out-File -LiteralPath $stderrLog -Encoding utf8 -Append",
    "  exit 1",
    "}",
    "exit 0",
    "",
  ].join("\r\n");
}

function buildWindowsDaemonLauncher() {
  return [
    "@echo off",
    'set "POWERSHELL_SCRIPT=%~dp0link-daemon.ps1"',
    'if not exist "%POWERSHELL_SCRIPT%" goto cleanup',
    'start "" /min powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%POWERSHELL_SCRIPT%"',
    "exit /b 0",
    ":cleanup",
    `schtasks /Delete /TN ${quoteCmdScriptArg(AUTOSTART_WINDOWS_TASK)} /F >nul 2>&1`,
    `if exist "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\${AUTOSTART_WINDOWS_TASK}.cmd" del /f /q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\${AUTOSTART_WINDOWS_TASK}.cmd" >nul 2>&1`,
    `if not exist "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\${AUTOSTART_WINDOWS_TASK}.cmd" if exist "%USERPROFILE%\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\${AUTOSTART_WINDOWS_TASK}.cmd" del /f /q "%USERPROFILE%\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\${AUTOSTART_WINDOWS_TASK}.cmd" >nul 2>&1`,
    "exit /b 0",
    "",
  ].join("\r\n");
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(file, args, options = {}) {
  return await new Promise((resolve) => {
    execFile(
      file,
      args,
      {
        windowsHide: true,
        ...options,
      },
      (error, stdout, stderr) => {
        const normalizedStdout = typeof stdout === "string" ? stdout : "";
        const normalizedStderr = typeof stderr === "string" ? stderr : "";
        const detail =
          normalizedStderr.trim() ||
          normalizedStdout.trim() ||
          (error instanceof Error ? error.message : "");
        resolve({
          code: typeof error?.code === "number" ? error.code : error ? 1 : 0,
          stdout: normalizedStdout,
          stderr: normalizedStderr,
          detail,
        });
      },
    );
  });
}

async function writeLauncherScripts() {
  await ensureRuntimeLayout();
  const nodePath = process.execPath;
  const cliPath = getCurrentCliPath();
  const shellLauncher = buildShellLauncher(nodePath, cliPath);
  await fsp.writeFile(runtimePaths.autostartShellLauncher, shellLauncher, "utf8");
  await fsp.chmod(runtimePaths.autostartShellLauncher, 0o755);
  const windowsPowerShellLauncher = buildWindowsPowerShellLauncher(nodePath, cliPath);
  await fsp.writeFile(
    runtimePaths.autostartWindowsPowerShellLauncher,
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(windowsPowerShellLauncher, "utf8")]),
  );
  const windowsLauncher = buildWindowsDaemonLauncher();
  await fsp.writeFile(runtimePaths.autostartWindowsLauncher, windowsLauncher, "utf8");
}

function resolveMacGuiDomain() {
  if (typeof process.getuid !== "function") {
    return "gui/501";
  }
  return `gui/${process.getuid()}`;
}

function isLaunchAgentAlreadyLoaded(detail) {
  return /already exists in domain/i.test(detail);
}

async function bootstrapLaunchAgent(plistPath) {
  const domain = resolveMacGuiDomain();
  const serviceTarget = `${domain}/${AUTOSTART_DARWIN_LABEL}`;
  await runCommand("launchctl", ["enable", serviceTarget]);
  const bootstrap = await runCommand("launchctl", ["bootstrap", domain, plistPath]);
  const detail = `${bootstrap.stderr} ${bootstrap.stdout}`.trim();
  if (bootstrap.code !== 0 && !isLaunchAgentAlreadyLoaded(detail)) {
    throw new Error(detail || "launchctl bootstrap failed.");
  }
}

async function unloadLaunchAgent(plistPath) {
  const domain = resolveMacGuiDomain();
  const serviceTarget = `${domain}/${AUTOSTART_DARWIN_LABEL}`;
  await runCommand("launchctl", ["disable", serviceTarget]);
  await runCommand("launchctl", ["bootout", serviceTarget]);
  await runCommand("launchctl", ["bootout", domain, plistPath]);
}

async function readLinuxLingerWarning() {
  const user = process.env.USER?.trim() || process.env.LOGNAME?.trim();
  if (!user) {
    return null;
  }
  const result = await runCommand("loginctl", ["show-user", user, "--property=Linger"]);
  if (result.code !== 0) {
    return null;
  }
  if (!/Linger=yes/i.test(`${result.stdout} ${result.stderr}`)) {
    return "This Linux account may stop user services after logout. If this is a headless server, run `sudo loginctl enable-linger $(whoami)` later.";
  }
  return null;
}

async function readTextFile(filePath) {
  try {
    return await fsp.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function detectLinuxContainerRuntime() {
  const runtimeFromEnv =
    normalizeNonEmptyString(process.env.container) ?? normalizeNonEmptyString(process.env.CONTAINER);
  if (runtimeFromEnv) {
    return runtimeFromEnv;
  }

  if (await fileExists("/.dockerenv")) {
    return "docker";
  }

  if (await fileExists("/run/.containerenv")) {
    return "container";
  }

  const cgroup = await readTextFile("/proc/1/cgroup");
  if (normalizeNonEmptyString(cgroup) && /(docker|containerd|kubepods|podman|libpod|lxc)/i.test(cgroup)) {
    return "container";
  }

  return null;
}

async function inspectLinuxSystemdUserSupport() {
  const containerRuntime = await detectLinuxContainerRuntime();
  if (containerRuntime) {
    return {
      ok: false,
      code: "linux_container",
      detail: containerRuntime,
    };
  }

  const version = await runCommand("systemctl", ["--version"]);
  if (version.code !== 0) {
    return {
      ok: false,
      code: "linux_systemctl_missing",
      detail: version.detail,
    };
  }

  const result = await runCommand("systemctl", ["--user", "show-environment"]);
  if (result.code === 0) {
    return {
      ok: true,
      code: null,
      detail: null,
    };
  }

  const detail = normalizeNonEmptyString(result.detail);
  if (
    detail &&
    /Failed to connect to bus|No medium found|not been booted with systemd|System has not been booted|Transport endpoint is not connected|Connection refused|No such file or directory/i.test(
      detail,
    )
  ) {
    return {
      ok: false,
      code: "linux_user_systemd_unavailable",
      detail,
    };
  }

  if (detail && /spawn .*systemctl|systemctl: not found|ENOENT|command not found/i.test(detail)) {
    return {
      ok: false,
      code: "linux_systemctl_missing",
      detail,
    };
  }

  return {
    ok: false,
    code: "linux_user_systemd_unavailable",
    detail,
  };
}

async function assertLinuxSystemdAvailable() {
  const support = await inspectLinuxSystemdUserSupport();
  if (support.ok) {
    return;
  }

  throw createAutostartError(support.code, support.detail);
}

async function isWindowsTaskInstalled() {
  const result = await runCommand("schtasks", ["/Query", "/TN", AUTOSTART_WINDOWS_TASK]);
  return result.code === 0;
}

function shouldFallbackToWindowsStartup(result) {
  return /access is denied|spawn .*schtasks|schtasks(?:\.exe)?: not found|not recognized as an internal or external command|enoent/i.test(
    `${result.stderr} ${result.stdout}`,
  );
}

async function writeWindowsStartupEntry() {
  const startupPath = getWindowsStartupPath();
  await fsp.mkdir(path.dirname(startupPath), { recursive: true });
  await fsp.writeFile(
    startupPath,
    buildWindowsStartupLauncher(),
    "utf8",
  );
  return startupPath;
}

async function removeFileIfExists(filePath) {
  await fsp.unlink(filePath).catch(() => undefined);
}

export async function getAutostartStatus() {
  switch (process.platform) {
    case "darwin":
      return {
        enabled: await fileExists(getDarwinPlistPath()),
        method: "LaunchAgent",
      };
    case "linux":
      return await getLinuxAutostartStatus();
    case "win32": {
      const taskInstalled = await isWindowsTaskInstalled();
      if (taskInstalled) {
        return {
          enabled: true,
          method: "Task Scheduler",
        };
      }
      return {
        enabled: await fileExists(getWindowsStartupPath()),
        method: "Windows login item",
      };
    }
    default:
      return {
        enabled: false,
        method: null,
      };
  }
}

async function getLinuxAutostartStatus() {
  const unitPath = getLinuxUnitPath();
  const configured = await fileExists(unitPath);
  if (!configured) {
    return {
      enabled: false,
      configured: false,
      healthy: true,
      method: "systemd user service",
    };
  }

  const support = await inspectLinuxSystemdUserSupport();
  if (!support.ok) {
    return {
      enabled: false,
      configured: true,
      healthy: false,
      method: "systemd user service",
      reasonCode: support.code,
      detail: support.detail,
    };
  }

  const enabled = await runCommand("systemctl", ["--user", "is-enabled", AUTOSTART_LINUX_UNIT]);
  const enabledDetail = normalizeNonEmptyString(enabled.detail);
  if (enabled.code === 0 && enabledDetail && /enabled/i.test(enabledDetail)) {
    return {
      enabled: true,
      configured: true,
      healthy: true,
      method: "systemd user service",
    };
  }

  if (enabledDetail && /disabled|masked|indirect|static|generated|linked|alias/i.test(enabledDetail)) {
    return {
      enabled: false,
      configured: true,
      healthy: true,
      method: "systemd user service",
    };
  }

  return {
    enabled: false,
    configured: true,
    healthy: false,
    method: "systemd user service",
    reasonCode: "linux_status_unknown",
    detail: enabledDetail,
  };
}

export async function getAutostartCapability() {
  if (process.platform === "linux") {
    const support = await inspectLinuxSystemdUserSupport();
    return {
      supported: support.ok,
      method: "systemd user service",
      reasonCode: support.code,
      detail: support.detail,
    };
  }

  if (process.platform === "darwin") {
    return {
      supported: true,
      method: "LaunchAgent",
      reasonCode: null,
      detail: null,
    };
  }

  if (process.platform === "win32") {
    return {
      supported: true,
      method: "Task Scheduler",
      reasonCode: null,
      detail: null,
    };
  }

  return {
    supported: false,
    method: null,
    reasonCode: "unsupported_platform",
    detail: process.platform,
  };
}

export async function refreshAutostartLaunchersIfEnabled() {
  const status = await getAutostartStatus();
  if (!status.enabled) {
    return status;
  }
  await writeLauncherScripts();
  if (process.platform === "win32" && status.method === "Windows login item") {
    await writeWindowsStartupEntry();
  }
  return status;
}

export async function enableAutostart() {
  if (process.platform === "darwin") {
    await writeLauncherScripts();
    const plistPath = getDarwinPlistPath();
    await fsp.mkdir(path.dirname(plistPath), { recursive: true });
    await fsp.writeFile(
      plistPath,
      buildLaunchAgentPlist(runtimePaths.autostartShellLauncher),
      "utf8",
    );
    await bootstrapLaunchAgent(plistPath);
    return {
      method: "LaunchAgent",
      warning: null,
    };
  }

  if (process.platform === "linux") {
    const unitPath = getLinuxUnitPath();
    try {
      await assertLinuxSystemdAvailable();
      await writeLauncherScripts();
      await fsp.mkdir(path.dirname(unitPath), { recursive: true });
      await fsp.writeFile(unitPath, buildSystemdUnit(runtimePaths.autostartShellLauncher), "utf8");

      const daemonReload = await runCommand("systemctl", ["--user", "daemon-reload"]);
      if (daemonReload.code !== 0) {
        throw createAutostartError("linux_daemon_reload_failed", daemonReload.detail);
      }

      const enable = await runCommand("systemctl", ["--user", "enable", AUTOSTART_LINUX_UNIT]);
      if (enable.code !== 0) {
        throw createAutostartError("linux_enable_failed", enable.detail);
      }
    } catch (error) {
      await removeFileIfExists(unitPath);
      await runCommand("systemctl", ["--user", "daemon-reload"]).catch(() => undefined);
      throw error;
    }

    return {
      method: "systemd user service",
      warning: await readLinuxLingerWarning(),
    };
  }

  if (process.platform === "win32") {
    await writeLauncherScripts();
    const taskCommand = quoteSchtasksArg(runtimePaths.autostartWindowsLauncher);
    const create = await runCommand("schtasks", [
      "/Create",
      "/SC",
      "ONLOGON",
      "/TN",
      AUTOSTART_WINDOWS_TASK,
      "/TR",
      taskCommand,
      "/RL",
      "LIMITED",
      "/F",
    ]);

    if (create.code === 0) {
      await removeFileIfExists(getWindowsStartupPath());
      return {
        method: "Task Scheduler",
        warning: null,
      };
    }

    if (!shouldFallbackToWindowsStartup(create)) {
      throw new Error((create.stderr || create.stdout).trim() || "schtasks create failed.");
    }

    await writeWindowsStartupEntry();
    return {
      method: "Windows login item",
      warning:
        "Task Scheduler was not available, so Link was added as a per-user login item instead.",
    };
  }

  throw new Error(`Autostart is not supported on ${process.platform}.`);
}

export async function disableAutostart() {
  if (process.platform === "darwin") {
    const plistPath = getDarwinPlistPath();
    await unloadLaunchAgent(plistPath);
    await removeFileIfExists(plistPath);
    return {
      method: "LaunchAgent",
    };
  }

  if (process.platform === "linux") {
    await runCommand("systemctl", ["--user", "disable", AUTOSTART_LINUX_UNIT]);
    await removeFileIfExists(getLinuxUnitPath());
    await runCommand("systemctl", ["--user", "daemon-reload"]);
    return {
      method: "systemd user service",
    };
  }

  if (process.platform === "win32") {
    await runCommand("schtasks", ["/Delete", "/TN", AUTOSTART_WINDOWS_TASK, "/F"]);
    await removeFileIfExists(getWindowsStartupPath());
    return {
      method: "Task Scheduler",
    };
  }

  throw new Error(`Autostart is not supported on ${process.platform}.`);
}
