import { refreshAutostartLaunchersIfEnabled } from "../src/autostart.js";
import { LINK_VERSION } from "../src/constants.js";
import { createTranslator, resolveLanguage } from "../src/i18n.js";

function normalizeVersion(value) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

async function main() {
  const t = createTranslator(resolveLanguage());
  await refreshAutostartLaunchersIfEnabled().catch(() => undefined);
  const { sendIpcRequest } = await import("../src/daemon.js");

  let snapshot = null;
  try {
    snapshot = await sendIpcRequest("status.get", {}, 700);
  } catch {
    return;
  }

  const runningVersion = normalizeVersion(snapshot?.version);
  if (!runningVersion || runningVersion === LINK_VERSION) {
    return;
  }

  console.warn(
    t.t("installUpdateRestartNotice", {
      installedVersion: LINK_VERSION,
      runningVersion,
    }),
  );
  console.warn(t.t("installUpdateRestartHint"));
}

main().catch(() => {
  // Postinstall advice must never block the npm install itself.
});
