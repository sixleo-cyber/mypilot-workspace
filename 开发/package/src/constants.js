import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

export const LINK_PACKAGE_NAME = packageJson.name;
export const LINK_VERSION = packageJson.version;
export const LINK_FLAVOR = "clawpilot-link";
export const OPENCLAW_GATEWAY_MIN_PROTOCOL_VERSION = 3;
export const OPENCLAW_GATEWAY_MAX_PROTOCOL_VERSION = 4;
