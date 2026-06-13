# ClawPilot Link

`ClawPilot Link` is the local daemon and CLI that connects a local OpenClaw instance to ClawPilot Relay.

## Line boundary

This `package/` directory is the ClawPilot public package line, not the current MyPilot private-product mainline.

| Item | Value |
|------|-------|
| package | `@clawpilot-app/link` |
| flavor | `clawpilot-link` |
| CLI | `clawlink` |

Use this directory for public Link package work, npm release flow, or shared ClawPilot capabilities. For MyPilot App private local experience, diagnostics, scheduled tasks, attachment protocol, or local OpenClaw debugging, prefer `../mypilot-link`.

Do not copy MyPilot-specific behavior from `../mypilot-link` into this package line unless the shared package explicitly needs that capability.

Verification and release gates:

```bash
npm run verify
npm run release
```

## Requirements

- Node.js 22.14.0 or newer
- An OpenClaw setup that already works on the same machine

## Install

```bash
npm install -g @clawpilot-app/link
```

ClawPilot Link follows OpenClaw's runtime baseline. If your Node.js version is older than 22.14.0, the install step will stop early and ask you to upgrade first.

Installing the package only adds the `clawlink` command to your computer. It does not start the Link service yet.

## How to use

### First-time setup

1. Install the package.
2. Run `clawlink pair`.
3. The first time you run `clawlink pair`, Link will ask which language you want to use from now on.
4. If Link cannot finish finding OpenClaw on its own, follow the prompt and give it either:
   - the `openclaw.json` path, or
   - the OpenClaw URL plus token/password
5. Scan the QR code with ClawPilot App.
   - On Windows, Link may open a clean SVG QR image outside the terminal because some console fonts can distort text-mode QR output.
6. Wait for the pairing to finish.

By default, a successful `clawlink pair` will also start ClawPilot Link in the background, so you usually do not need to run a second command right away. After pairing succeeds, Link will also ask whether you want it to start automatically when this computer signs in.

### Daily use

- If Link is already paired and running, just open ClawPilot App and use your gateway.
- If you rebooted the computer or stopped Link earlier, run `clawlink start` to bring it back online.
- If something does not work, run `clawlink status` first, then `clawlink doctor` for a guided check.

## Common commands

```bash
clawlink help
clawlink version
clawlink pair
clawlink start
clawlink status
clawlink doctor
clawlink restart
clawlink stop
clawlink autostart on
clawlink autostart off
clawlink uninstall --yes
```

### `clawlink help`

Lists the common commands in one place with plain-language explanations. This is the best starting point if you forget which command to use and just want Link to tell you what each command is for.

### `clawlink version`

Shows the currently installed ClawPilot Link version number. This is useful right after `npm install -g` when you want to confirm the update really landed on this computer.

### `clawlink pair`

Use this the first time you set up this computer. On the very first interactive pairing run, Link asks which language you want to keep using on this computer and saves that choice before moving on. After that, before showing the QR code, Link checks whether it can already reach a working OpenClaw setup. If it can reach OpenClaw but still cannot read `openclaw.json`, it will ask for that path. If OpenClaw is still not reachable, it will ask for the OpenClaw URL plus token/password manually.

Once that check is complete, `clawlink pair` creates a pairing QR code, waits for ClawPilot App to scan it, saves this computer's Link credentials, installs the helper skill, and then starts the Link service in the background. On Windows, Link now also writes a clean SVG copy of the QR code and tries to open it automatically so the QR is not affected by terminal font rendering.

If this computer is already paired, `clawlink pair` will not create a second Link. It will simply show a new QR code so another phone or tablet can join the same Link.

### `clawlink start`

Starts the Link service in the background and immediately tries to connect. Use this when the computer has already been paired, but the background service is not currently running, such as after a reboot or after you stopped it manually.

If you already upgraded the npm package and an older Link daemon is still running in the background, `clawlink start` now refreshes that old daemon automatically so this computer switches to the new version.

### `clawlink status`

Shows the current Link status in a simple human-readable format, including the installed version, the version currently running in the background, whether OpenClaw was found, whether local network direct access is ready, whether you need to run `clawlink restart` after an update, and a plain-language summary of how ClawPilot App will connect right now.

### `clawlink doctor`

Runs a fuller health check. This is the best command to use when Link cannot connect, when local network direct access is unavailable, or when you want clear fix suggestions before asking for help.

### `clawlink restart`

Restarts the background Link service. This is useful right after updating the npm package, after changing config, or after fixing a local issue like a port conflict.

### `clawlink stop`

Stops the background Link service on this computer.

### `clawlink autostart on`

Installs an OS-level auto-start entry so Link can come back automatically after the next sign-in. This uses LaunchAgent on macOS, a user systemd service on Linux, and Task Scheduler on Windows when available.

On Linux, this is meant for Link running on the host OS. If OpenClaw is inside Docker, that is still fine as long as Docker publishes the OpenClaw port back to the host and Link itself is installed on the host. If Link is running inside Docker or another container, use Docker's own restart policy instead of `clawlink autostart on`.

### `clawlink autostart off`

Removes the auto-start entry that `clawlink autostart on` created earlier.

### `clawlink uninstall --yes`

Stops the Link service, removes the auto-start entry, and prepares this computer for removing the npm package. After this finishes, if you still want to remove the package itself, run:

```bash
npm uninstall -g @clawpilot-app/link
```

If you also want to clear this computer's local Link data at the same time, add `--unpair`:

```bash
clawlink uninstall --yes --unpair
```

## Update

```bash
npm install -g @clawpilot-app/link@latest
clawlink restart
```

If Link was already running during the npm update, the install step will try to print a reminder. Even if you miss that reminder, `clawlink start` will now also refresh an old background daemon automatically.

The npm package name is `@clawpilot-app/link`.
