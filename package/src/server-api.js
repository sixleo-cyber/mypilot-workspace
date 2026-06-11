import { normalizeNonEmptyString } from "./runtime.js";

export class ServerApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ServerApiError";
    this.status = Number.isInteger(options.status) ? options.status : 0;
    this.errorCode = normalizeNonEmptyString(options.errorCode);
    this.details = options.details;
    this.payload = options.payload ?? null;
  }
}

async function requestJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new ServerApiError(
      error instanceof Error ? error.message : "Network request failed",
      {
        status: 0,
      },
    );
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      payload.error &&
      typeof payload.error === "object" &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : `Request failed with HTTP ${response.status}`;
    throw new ServerApiError(message, {
      status: response.status,
      errorCode:
        payload &&
        typeof payload === "object" &&
        payload.error &&
        typeof payload.error === "object"
          ? normalizeNonEmptyString(payload.error.error_code)
          : null,
      details:
        payload &&
        typeof payload === "object" &&
        payload.error &&
        typeof payload.error === "object"
          ? payload.error.details
          : undefined,
      payload,
    });
  }

  return payload;
}

function joinApiUrl(baseUrl, pathname) {
  return `${baseUrl.replace(/\/+$/, "")}${pathname}`;
}

export async function createPairingSession(params) {
  return await requestJson(joinApiUrl(params.apiBaseUrl, "/api/v1/openclaw/link/pairing-sessions"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      installId: params.installId,
      displayName: params.displayName,
      hostname: params.hostname,
      platform: params.platform,
    }),
  });
}

export async function bootstrapLink(params) {
  return await requestJson(joinApiUrl(params.apiBaseUrl, "/api/v1/openclaw/link/bootstrap"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      pairingSessionId: params.pairingSessionId,
      pairingToken: params.pairingToken,
      installId: params.installId,
      displayName: params.displayName,
      hostname: params.hostname,
      platform: params.platform,
    }),
  });
}

export async function createAccessToken(params) {
  return await requestJson(joinApiUrl(params.apiBaseUrl, "/api/v1/openclaw/link/access-token"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: params.refreshToken,
      clientVersion: params.clientVersion,
      clientCapabilities: params.clientCapabilities,
    }),
  });
}

export async function updateLinkStatus(params) {
  const accessToken = normalizeNonEmptyString(params.accessToken);
  if (!accessToken) {
    return null;
  }

  return await requestJson(joinApiUrl(params.apiBaseUrl, "/api/v1/openclaw/link/status"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      accessToken,
      connectionStatus: params.connectionStatus,
      backendUrl: params.backendUrl ?? undefined,
      lastErrorMessage: params.lastErrorMessage ?? undefined,
      lanDirectAddresses:
        params.lanDirectAddresses === undefined ? undefined : params.lanDirectAddresses,
      publicDirectRoutes:
        params.publicDirectRoutes === undefined ? undefined : params.publicDirectRoutes,
    }),
  });
}
