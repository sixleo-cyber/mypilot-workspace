import test from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";

const daemonModulePath = fileURLToPath(new URL("./daemon.js", import.meta.url));
const openClawModulePath = fileURLToPath(new URL("./openclaw.js", import.meta.url));

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

test("probeManualOpenClawBackend advertises a protocol range compatible with OpenClaw 5.12", async () => {
  const tempHome = await fsp.mkdtemp(path.join(os.tmpdir(), "clawpilot-link-home-"));
  const previousHome = process.env.HOME;
  process.env.HOME = tempHome;

  const wsServer = new WebSocketServer({ noServer: true });
  let connectParams = null;

  const server = http.createServer((request, response) => {
    if (request.url === "/v1/responses") {
      response.writeHead(400, { "content-type": "application/json" });
      response.end("{}");
      return;
    }
    response.writeHead(404);
    response.end();
  });

  server.on("upgrade", (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit("connection", ws, request);
    });
  });

  wsServer.on("connection", (socket) => {
    socket.send(JSON.stringify({
      type: "event",
      event: "connect.challenge",
      payload: { nonce: "test-nonce" },
    }));

    socket.on("message", (rawData) => {
      const frame = JSON.parse(rawData.toString("utf8"));
      connectParams = frame.params;
      socket.send(JSON.stringify({
        type: "res",
        id: frame.id,
        ok: true,
        payload: {
          type: "hello-ok",
          protocol: 4,
          server: { version: "2026.5.12", connId: "conn_test" },
          features: { methods: [], events: [] },
          auth: { role: "operator", scopes: ["operator.admin"] },
        },
      }));
    });
  });

  try {
    const address = await listen(server);
    const openClawModuleUrl = `${pathToFileURL(openClawModulePath).href}?test=${Date.now()}`;
    const { probeManualOpenClawBackend } = await import(openClawModuleUrl);

    const backend = await probeManualOpenClawBackend({
      openClawBaseUrl: `http://127.0.0.1:${address.port}`,
      openClawAuthType: "token",
      openClawSecret: "test-token",
      installId: "test-install",
      displayName: "ClawPilot Link Test",
    });

    assert.equal(backend.healthy, true);
    assert.equal(connectParams?.minProtocol, 3);
    assert.equal(connectParams?.maxProtocol, 4);
  } finally {
    wsServer.close();
    await closeServer(server);
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    await fsp.rm(tempHome, { recursive: true, force: true });
  }
});

test("LinkDaemon local OpenClaw connect frames use the same compatible protocol range", async () => {
  const daemonModuleUrl = `${pathToFileURL(daemonModulePath).href}?test=${Date.now()}`;
  const { LinkDaemon } = await import(daemonModuleUrl);
  const daemon = new LinkDaemon(
    { displayName: "ClawPilot Link Test", installId: "test-install" },
    {
      backend: {
        authType: "token",
        secret: "test-token",
      },
    },
    {},
  );

  const frame = JSON.parse(await daemon.buildLocalConnectFrame("connect-test", null));

  assert.equal(frame.params.minProtocol, 3);
  assert.equal(frame.params.maxProtocol, 4);
});
