import { execFileSync } from "node:child_process";
import { Buffer } from "node:buffer";
import os from "node:os";

export const LINK_DIRECT_PORT = 52378;
const WINDOWS_HOST_IP_DISCOVERY_TIMEOUT_MS = 8_000;
const WINDOWS_POWERSHELL_COMMAND_CANDIDATES = Object.freeze([
  "powershell.exe",
  "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
  "/mnt/c/Program Files/PowerShell/7/pwsh.exe",
]);

const VIRTUAL_INTERFACE_NAME_PATTERN =
  /(docker|veth|vmnet|vmenet|vbox|tailscale|utun|virbr|hyper-v|vethernet|loopback|\blo\b|^br-|^bridge\d+$|^zt|^tun|^tap)/i;

function normalizeHost(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function isPrivateIpv4(address) {
  const segments = parseIpv4Segments(address);
  if (!segments) {
    return false;
  }
  const [first, second] = segments;
  if (first === 10) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  return first === 172 && second >= 16 && second <= 31;
}

function parseIpv4Segments(value) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    return null;
  }

  const segments = value.split(".").map((segment) => Number.parseInt(segment, 10));
  if (segments.some((segment) => Number.isNaN(segment) || segment < 0 || segment > 255)) {
    return null;
  }

  return segments;
}

function ipv4SegmentsToInt(segments) {
  return (
    (((segments[0] << 24) >>> 0) |
      (segments[1] << 16) |
      (segments[2] << 8) |
      segments[3]) >>>
    0
  );
}

function isNetworkOrBroadcastIpv4Address(address, netmask) {
  const addressSegments = parseIpv4Segments(address);
  const netmaskSegments = parseIpv4Segments(netmask);
  if (!addressSegments || !netmaskSegments) {
    return false;
  }

  const addressInt = ipv4SegmentsToInt(addressSegments);
  const netmaskInt = ipv4SegmentsToInt(netmaskSegments);
  const networkInt = addressInt & netmaskInt;
  const hostMask = (~netmaskInt) >>> 0;
  if (hostMask === 0) {
    return false;
  }
  const broadcastInt = (networkInt | hostMask) >>> 0;
  return addressInt === networkInt || addressInt === broadcastInt;
}

function shouldIgnoreInterface(name) {
  const normalized = normalizeHost(name);
  if (!normalized) {
    return true;
  }
  return VIRTUAL_INTERFACE_NAME_PATTERN.test(normalized);
}

function isWslEnvironment() {
  if (process.platform !== "linux") {
    return false;
  }

  if (normalizeHost(process.env.WSL_DISTRO_NAME) || normalizeHost(process.env.WSL_INTEROP)) {
    return true;
  }

  return os.release().toLowerCase().includes("microsoft");
}

function buildLanDiscoveryTrace(mode, isWsl) {
  return {
    platform: process.platform,
    release: os.release(),
    isWsl,
    mode,
    steps: [],
  };
}

function pushLanDiscoveryTrace(trace, step, extra = undefined) {
  if (!trace || !Array.isArray(trace.steps)) {
    return;
  }
  trace.steps.push({
    step,
    ...(extra && typeof extra === "object" ? extra : {}),
  });
}

function decodeWindowsCommandOutput(rawOutput) {
  const outputBuffer =
    Buffer.isBuffer(rawOutput) ? rawOutput : Buffer.from(rawOutput ?? "");
  if (outputBuffer.length <= 0) {
    return "";
  }

  if (outputBuffer.length >= 2 && outputBuffer[0] === 0xff && outputBuffer[1] === 0xfe) {
    return outputBuffer.subarray(2).toString("utf16le").replace(/^\uFEFF/, "");
  }

  // Windows PowerShell often emits UTF-16LE when captured by another process.
  if (outputBuffer.includes(0x00)) {
    return outputBuffer.toString("utf16le").replace(/^\uFEFF/, "");
  }

  return outputBuffer.toString("utf8").replace(/^\uFEFF/, "");
}

function collectPrivateIpv4AddressesFromCommandOutput(output) {
  const addresses = [];
  const seen = new Set();

  for (const line of output.split(/\r?\n/)) {
    const address = normalizeHost(line.replace(/\0/g, ""));
    if (!address || !isPrivateIpv4(address) || seen.has(address)) {
      continue;
    }
    seen.add(address);
    addresses.push(address);
  }

  return addresses.sort((left, right) => left.localeCompare(right));
}

function collectWindowsHostLanIpv4Addresses(trace = null) {
  const command = String.raw`$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ignore = 'hyper-v|vethernet|wsl|loopback|virtualbox|vmware|tailscale|wireguard|zerotier|docker'
Get-NetIPConfiguration |
  Where-Object {
    $_.IPv4Address -and
    $_.NetAdapter -and
    $_.NetAdapter.Status -eq 'Up' -and
    $_.InterfaceAlias -notmatch $ignore -and
    $_.NetAdapter.InterfaceDescription -notmatch $ignore
  } |
  ForEach-Object {
    foreach ($entry in $_.IPv4Address) {
      [Console]::Out.WriteLine($entry.IPAddress)
    }
  }`;

  for (const executable of WINDOWS_POWERSHELL_COMMAND_CANDIDATES) {
    pushLanDiscoveryTrace(trace, "windows_powershell_attempt", {
      executable,
      timeoutMs: WINDOWS_HOST_IP_DISCOVERY_TIMEOUT_MS,
    });
    try {
      const rawOutput = execFileSync(
        executable,
        [
          "-NoLogo",
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          command,
        ],
        {
          encoding: "buffer",
          maxBuffer: 64 * 1024,
          timeout: WINDOWS_HOST_IP_DISCOVERY_TIMEOUT_MS,
          windowsHide: true,
        },
      );

      const addresses = collectPrivateIpv4AddressesFromCommandOutput(
        decodeWindowsCommandOutput(rawOutput),
      );
      pushLanDiscoveryTrace(trace, "windows_powershell_result", {
        executable,
        addressCount: addresses.length,
        addresses,
      });
      if (addresses.length > 0) {
        return addresses;
      }
    } catch (error) {
      pushLanDiscoveryTrace(trace, "windows_powershell_failed", {
        executable,
        code: typeof error?.code === "string" ? error.code : null,
        errno: Number.isInteger(error?.errno) ? error.errno : null,
        message:
          error instanceof Error && typeof error.message === "string"
            ? error.message
            : String(error),
      });
    }
  }

  pushLanDiscoveryTrace(trace, "windows_ipconfig_attempt", {
    executable: "/mnt/c/Windows/System32/ipconfig.exe",
    timeoutMs: WINDOWS_HOST_IP_DISCOVERY_TIMEOUT_MS,
  });
  try {
    const rawOutput = execFileSync(
      "/mnt/c/Windows/System32/ipconfig.exe",
      [],
      {
        encoding: "buffer",
        maxBuffer: 256 * 1024,
        timeout: WINDOWS_HOST_IP_DISCOVERY_TIMEOUT_MS,
        windowsHide: true,
      },
    );
    const matches =
      decodeWindowsCommandOutput(rawOutput).match(/\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2}\b/g) ??
      [];
    const addresses = [...new Set(matches)].sort((left, right) => left.localeCompare(right));
    pushLanDiscoveryTrace(trace, "windows_ipconfig_result", {
      addressCount: addresses.length,
      addresses,
    });
    return addresses;
  } catch (error) {
    pushLanDiscoveryTrace(trace, "windows_ipconfig_failed", {
      executable: "/mnt/c/Windows/System32/ipconfig.exe",
      code: typeof error?.code === "string" ? error.code : null,
      errno: Number.isInteger(error?.errno) ? error.errno : null,
      message:
        error instanceof Error && typeof error.message === "string"
          ? error.message
          : String(error),
    });
    return [];
  }
}

export function inspectLanIpv4AddressDiscovery() {
  const wsl = isWslEnvironment();
  const trace = buildLanDiscoveryTrace(wsl ? "wsl_windows_host_probe" : "os_network_interfaces", wsl);
  pushLanDiscoveryTrace(trace, "environment_detected", {
    hasWslDistroName: Boolean(normalizeHost(process.env.WSL_DISTRO_NAME)),
    hasWslInterop: Boolean(normalizeHost(process.env.WSL_INTEROP)),
  });

  if (wsl) {
    const addresses = collectWindowsHostLanIpv4Addresses(trace);
    pushLanDiscoveryTrace(trace, "final_addresses", {
      addressCount: addresses.length,
      addresses,
    });
    return {
      addresses,
      trace,
    };
  }

  const interfaces = os.networkInterfaces();
  const addresses = [];
  const seen = new Set();
  const interfaceSummaries = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    const summary = {
      interface: name,
      ignoredByName: shouldIgnoreInterface(name),
      entries: [],
      acceptedAddresses: [],
    };
    interfaceSummaries.push(summary);

    if (summary.ignoredByName || !Array.isArray(entries)) {
      summary.reason = summary.ignoredByName ? "ignored_interface_name" : "entries_not_array";
      continue;
    }

    for (const entry of entries) {
      const entrySummary = {
        address: normalizeHost(entry?.address),
        family: entry?.family ?? null,
        internal: entry?.internal === true,
        netmask: normalizeHost(entry?.netmask),
        accepted: false,
        reason: null,
      };
      summary.entries.push(entrySummary);

      if (!entry || entry.internal) {
        entrySummary.reason = "internal_or_missing";
        continue;
      }
      if (entry.family !== "IPv4") {
        entrySummary.reason = "non_ipv4";
        continue;
      }
      const address = normalizeHost(entry.address);
      const netmask = normalizeHost(entry.netmask);
      if (
        !address ||
        !isPrivateIpv4(address) ||
        isNetworkOrBroadcastIpv4Address(address, netmask) ||
        seen.has(address)
      ) {
        entrySummary.reason = !address
          ? "empty_address"
          : !isPrivateIpv4(address)
            ? "non_private_ipv4"
            : isNetworkOrBroadcastIpv4Address(address, netmask)
              ? "network_or_broadcast_address"
              : "duplicate_address";
        continue;
      }
      seen.add(address);
      addresses.push(address);
      entrySummary.accepted = true;
      entrySummary.reason = "accepted";
      summary.acceptedAddresses.push(address);
    }
  }

  const sortedAddresses = addresses.sort((left, right) => left.localeCompare(right));
  pushLanDiscoveryTrace(trace, "interface_scan_complete", {
    interfaces: interfaceSummaries,
    addressCount: sortedAddresses.length,
    addresses: sortedAddresses,
  });
  pushLanDiscoveryTrace(trace, "final_addresses", {
    addressCount: sortedAddresses.length,
    addresses: sortedAddresses,
  });
  return {
    addresses: sortedAddresses,
    trace,
  };
}

export function listLanIpv4Addresses() {
  return inspectLanIpv4AddressDiscovery().addresses;
}
