import test from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const daemonModulePath = fileURLToPath(new URL("./daemon.js", import.meta.url));

function decodeBase64Url(value) {
  return Buffer.from(String(value ?? ""), "base64url").toString("utf8");
}

test("handleRelayHttpRequest serves Link logs without proxying to OpenClaw", async () => {
  const tempHome = await fsp.mkdtemp(path.join(os.tmpdir(), "clawpilot-link-home-"));
  const previousHome = process.env.HOME;
  process.env.HOME = tempHome;

  try {
    const daemonModuleUrl = `${pathToFileURL(daemonModulePath).href}?test=${Date.now()}`;
    const { LinkDaemon } = await import(daemonModuleUrl);
    const logDir = path.join(tempHome, ".clawpilot", "link", "logs");
    await fsp.mkdir(logDir, { recursive: true });
    await fsp.writeFile(
      path.join(logDir, "autostart.stderr.log"),
      "stderr line one\nstderr line two\n",
      "utf8",
    );

    const daemon = new LinkDaemon(
      { language: "en" },
      {
        backend: {
          httpBaseUrl: "http://127.0.0.1:9",
          supported: true,
        },
      },
      {},
    );
    const frames = [];
    daemon.sendRelayFrame = (type, payload = {}) => {
      frames.push({ type, payload });
    };
    daemon.proxyBackendHttpRequest = async () => {
      throw new Error("Link logs should not be proxied to OpenClaw");
    };

    await daemon.handleRelayHttpRequest({
      requestId: "http_test",
      method: "GET",
      path: "/link/logs?file=autostart.stderr.log&limit=1",
      headers: {},
    });

    assert.equal(frames[0]?.type, "http.response.start");
    assert.equal(frames[0]?.payload.status, 200);
    assert.equal(frames.at(-1)?.type, "http.response.end");

    const body = frames
      .filter((frame) => frame.type === "http.response.chunk")
      .map((frame) => decodeBase64Url(frame.payload.chunk))
      .join("");
    const snapshot = JSON.parse(body);
    assert.deepEqual(snapshot.lines, ["stderr line two"]);
  } finally {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    await fsp.rm(tempHome, { recursive: true, force: true });
  }
});
