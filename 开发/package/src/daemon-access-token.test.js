import test from "node:test";
import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const daemonModulePath = fileURLToPath(new URL("./daemon.js", import.meta.url));
const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));

test("ensureAccessToken refreshes cached tokens after a Link upgrade and persists the current version", async () => {
  const tempHome = await fsp.mkdtemp(path.join(os.tmpdir(), "clawpilot-link-home-"));
  const previousHome = process.env.HOME;
  const previousFetch = global.fetch;
  process.env.HOME = tempHome;

  try {
    const daemonModuleUrl = `${pathToFileURL(daemonModulePath).href}?test=${Date.now()}`;
    const packageJson = JSON.parse(
      await fsp.readFile(packageJsonPath, "utf8"),
    );
    const { LinkDaemon } = await import(daemonModuleUrl);

    const fetchCalls = [];
    global.fetch = async (url, init) => {
      fetchCalls.push({
        url: String(url),
        init,
      });
      return new Response(
        JSON.stringify({
          link: {
            linkId: "cpl_test_link",
          },
          accessToken: {
            token: "cplink_at_refreshed",
            expiresAt: "2026-01-01T01:00:00.000Z",
          },
          connectTokenVerifier: {
            secret: "cplink_ctv_secret",
          },
          versionPolicy: {
            status: "ok",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    const daemon = new LinkDaemon(
      {
        language: "en",
        apiBaseUrl: "https://api.example.com",
        relayBaseUrl: "https://relay.example.com",
      },
      {},
      {
        linkId: "cpl_test_link",
        refreshToken: "cplink_rt_test",
        refreshTokenExpiresAt: "2026-01-02T00:00:00.000Z",
        accessToken: "cplink_at_cached",
        accessTokenExpiresAt: "2026-01-01T01:00:00.000Z",
        accessTokenClientVersion: "1.3.3",
        connectTokenSecret: null,
      },
    );

    const accessToken = await daemon.ensureAccessToken();

    assert.equal(accessToken, "cplink_at_refreshed");
    assert.equal(fetchCalls.length, 1);
    assert.equal(daemon.credentials.accessTokenClientVersion, packageJson.version);

    const savedCredentials = JSON.parse(
      await fsp.readFile(
        path.join(tempHome, ".clawpilot", "link", "credentials.json"),
        "utf8",
      ),
    );
    assert.equal(savedCredentials.accessToken, "cplink_at_refreshed");
    assert.equal(savedCredentials.accessTokenClientVersion, packageJson.version);
  } finally {
    global.fetch = previousFetch;
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }
    await fsp.rm(tempHome, { recursive: true, force: true });
  }
});
