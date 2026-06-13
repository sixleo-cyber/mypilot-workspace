import process from "node:process";

const MINIMUM_NODE_VERSION = "22.14.0";

function parseVersion(input) {
  const normalized = String(input ?? "")
    .trim()
    .replace(/^v/i, "");
  const [major = "0", minor = "0", patch = "0"] = normalized.split(".");
  return [
    Number.parseInt(major, 10) || 0,
    Number.parseInt(minor, 10) || 0,
    Number.parseInt(patch, 10) || 0,
  ];
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) {
      return 1;
    }
    if (left[index] < right[index]) {
      return -1;
    }
  }
  return 0;
}

const current = parseVersion(process.versions.node);
const minimum = parseVersion(MINIMUM_NODE_VERSION);

if (compareVersions(current, minimum) < 0) {
  console.error("");
  console.error("ClawPilot Link needs Node.js 22.14.0 or newer.");
  console.error(`You are using Node.js ${process.versions.node}.`);
  console.error("");
  console.error("Why this is required:");
  console.error("- OpenClaw itself already requires Node.js 22.14.0 or newer.");
  console.error("- If Link allowed an older Node.js, installation might succeed but pairing or background service could fail later.");
  console.error("");
  console.error("Please update Node.js first, then run the install command again.");
  console.error("");
  process.exit(1);
}
