export const SUPPORTED_LANGUAGES = Object.freeze(["en", "zh-Hans"]);

const copy = {
  en: {
    pairingCreated: "ClawPilot Link pairing session created.",
    scanPrompt: "Scan this QR with ClawPilot App:",
    manualCode: "Manual code",
    waitingForScan: "Waiting for someone to scan the code...",
    qrWindowsSvgOpened:
      "Some Windows terminals render text QR blocks incorrectly, so Link opened a clean QR image outside the terminal: {{filePath}}",
    qrWindowsSvgSaved:
      "Some Windows terminals render text QR blocks incorrectly. Open this clean QR image instead: {{filePath}}",
    pairingSuccess: "ClawPilot Link is now paired.",
    pairingExpired: "This pairing session expired. Run clawlink pair again.",
    pairNeedsInteractiveSetup:
      "OpenClaw still needs one more setup step before pairing can continue. Run clawlink pair in an interactive terminal.",
    pairConfigPathPromptIntro:
      "OpenClaw is reachable, but Link still needs the openclaw.json path. Expected location: {{configPath}}",
    pairConfigPathPromptWindowsWslHint:
      "If OpenClaw is inside WSL on Windows, you can paste either the Linux path (/home/...) or the Windows WSL path (\\\\wsl$\\Distro\\home\\...).",
    pairConfigPathQuestion:
      "Enter the full openclaw.json path now, or press Enter to type URL + token/password instead: ",
    pairConfigPathNotUsable:
      "That openclaw.json path is still not usable yet: {{reason}}",
    pairBackendNeedsManualSetup:
      "Link still needs OpenClaw details before pairing can continue: {{reason}}",
    pairBackendMissingBeforeManual:
      "OpenClaw was not reachable from this computer yet, so Link needs the URL and token/password manually.",
    pairManualSetupIntro: "Enter the OpenClaw address and shared secret for this Link now.",
    pairManualUrlQuestion: "OpenClaw URL: ",
    pairManualAuthTypeIntro: "Choose what you want to enter next for OpenClaw authentication:",
    pairManualAuthTypeOptionToken: "1. Token",
    pairManualAuthTypeOptionPassword: "2. Password",
    pairManualAuthTypeQuestion: "Enter 1 or 2: ",
    pairManualAuthTypeInvalid: "Please enter 1 or 2.",
    pairManualTokenQuestion: "OpenClaw token: ",
    pairManualPasswordQuestion: "OpenClaw password: ",
    pairManualSetupCancelled:
      "Pairing stopped before OpenClaw was configured. Run clawlink pair again when you are ready.",
    pairManualBackendUnreachable:
      "Link still could not reach OpenClaw at {{url}} with the details you entered.",
    pairManualBackendStartHint:
      "Make sure OpenClaw is already running before you try again.",
    pairManualBackendInstallHint:
      "If OpenClaw lives on another server, install ClawPilot Link on that same server instead.",
    pairManualBackendNeedsAttention:
      "Link did reach OpenClaw, but it still is not ready yet: {{reason}}",
    pairLanguagePromptIntro:
      "Choose the language for ClawPilot Link before continuing. / 继续之前，请先选择 ClawPilot Link 使用的语言。",
    pairLanguagePromptOptionZhHans: "1. 简体中文",
    pairLanguagePromptOptionEn: "2. English",
    pairLanguagePromptQuestion: "Enter 1 or 2 / 请输入 1 或 2: ",
    pairLanguagePromptInvalid: "Please enter 1 or 2. / 请输入 1 或 2。",
    pairLanguageChangedToZhHans: "接下来 ClawPilot Link 会使用简体中文。",
    pairLanguageChangedToEn: "ClawPilot Link will continue in English.",
    approvalRequiredIntro:
      "OpenClaw found this Link, but it still needs your approval before Link can continue.",
    approvalRequiredRequestId: "Approval request ID: {{requestId}}",
    approvalRequiredNoStart:
      "ClawPilot Link will stay in the waiting state and will not start until you approve it.",
    approvalRequiredRunCommand:
      "If this OpenClaw is on this same computer, you can try this approval command:",
    approvalRequiredLocalConfigHint:
      "If the command above is not available, go to that local OpenClaw instance and approve the pending device request there. Its openclaw.json is under: {{configPath}}",
    approvalRequiredLocalHint:
      "Go to the local OpenClaw instance on this computer and approve the pending device request there.",
    approvalRequiredRemoteHint:
      "Go to that OpenClaw server and approve this Link request there, then come back here to retry.",
    approvalRequiredRetryQuestion:
      "After approving in OpenClaw, press Enter here to retry. Enter q to cancel: ",
    approvalRequiredCancelled:
      "Approval is still pending. Link did not start. Run clawlink pair or clawlink start again after you finish approving.",
    approvalAutoWaitingForRequest:
      "Waiting for OpenClaw to finish creating the approval request...",
    approvalAutoApproving:
      "Approval request found. Trying to approve it automatically now...",
    approvalAutoRechecking:
      "Approval sent. Rechecking OpenClaw now...",
    approvalAutoApproved:
      "OpenClaw approval completed automatically.",
    approvalAutoPendingNotFound:
      "OpenClaw still did not expose that approval request yet.",
    approvalAutoFailedWillWait:
      "Automatic approval did not finish yet: {{reason}}",
    approvalRequiredRechecking: "Rechecking OpenClaw approval now...",
    approvalRequiredChangedReason:
      "Approval is no longer the only blocker, but Link still cannot continue yet: {{reason}}",
    approvalRequiredStillPendingWithRequestId:
      "OpenClaw still shows this request as waiting for approval (requestId: {{requestId}}).",
    approvalRequiredStillPending:
      "OpenClaw still shows this Link as waiting for approval.",
    startDaemonAfterPair: "Starting the Link service in the background...",
    daemonStarted: "ClawPilot Link started successfully and is running in the background.",
    daemonAlreadyRunning: "ClawPilot Link is already running.",
    daemonAlreadyStopped: "ClawPilot Link is already stopped.",
    daemonStopped: "ClawPilot Link has been stopped.",
    restartDone: "ClawPilot Link restarted successfully and is running in the background.",
    restartStarted:
      "ClawPilot Link was not running, so it has now started successfully in the background.",
    installUpdateRestartNotice:
      "ClawPilot Link {{installedVersion}} is installed, but the background service is still running {{runningVersion}}.",
    installUpdateRestartHint:
      "Run clawlink restart to finish the update. If you use clawlink start later, Link will refresh the old background service automatically.",
    daemonRestartingForUpdate:
      "ClawPilot Link {{installedVersion}} is installed. Restarting the background service now because it is still running {{runningVersion}}.",
    autostartPrompt:
      "Do you want ClawPilot Link to start automatically when this computer signs in?",
    autostartHintLater:
      "If you want Link to start automatically later, run clawlink autostart on.",
    autostartSkipped:
      "Auto-start was left off. You can turn it on later with clawlink autostart on.",
    autostartEnabledWithMethod:
      "Auto-start is now enabled through {{method}}.",
    autostartAlreadyEnabled:
      "Auto-start was already enabled. The {{method}} entry was refreshed.",
    autostartEnableFailed:
      "Auto-start was not enabled yet: {{reason}}",
    autostartNotAvailableHere:
      "Link cannot set up 'start when this computer signs in' in this environment: {{reason}}",
    autostartDisabled: "Auto-start has been removed.",
    autostartAlreadyDisabled: "Auto-start is already off.",
    autostartUsage: "Use clawlink autostart on or clawlink autostart off.",
    uninstallConfirm:
      "Run clawlink uninstall --yes if you want Link to stop, remove auto-start, and prepare this computer for npm uninstall. Add --unpair if you also want to clear this computer's local Link data.",
    uninstallPrepared:
      "ClawPilot Link is ready to be removed from this computer.",
    uninstallLocalDataRemoved:
      "This computer's local Link data has been removed.",
    uninstallNextStep:
      "If you still want to remove the npm package, run npm uninstall -g @clawpilot-app/link.",
    autostartReasonLinuxContainer:
      "Link is running inside Docker or another container. 'Start when this computer signs in' only works when Link is installed on the host OS. You can keep OpenClaw in Docker, but install Link on the host. If you want the container to come back automatically, use Docker's restart policy instead.",
    autostartReasonLinuxSystemctlMissing:
      "This Linux system does not have systemctl, so Link cannot register login auto-start here.",
    autostartReasonLinuxUserSystemdUnavailable:
      "This Linux session cannot use systemd user services yet, so Link cannot register login auto-start. Run `systemctl --user` on the host first. If this is a headless Linux machine, you may also need `sudo loginctl enable-linger $(whoami)`.",
    autostartReasonLinuxDaemonReloadFailed:
      "Link could not finish registering login auto-start because Linux could not reload user services yet.",
    autostartReasonLinuxDaemonReloadFailedWithDetail:
      "Link could not finish registering login auto-start because Linux could not reload user services yet: {{detail}}",
    autostartReasonLinuxEnableFailed:
      "Link created the auto-start entry, but Linux could not enable it for the next sign-in yet.",
    autostartReasonLinuxEnableFailedWithDetail:
      "Link created the auto-start entry, but Linux could not enable it for the next sign-in yet: {{detail}}",
    autostartReasonGeneric:
      "Link could not turn on auto-start yet.",
    autostartReasonGenericWithDetail:
      "Link could not turn on auto-start yet: {{detail}}",
    directAccessGuideTitle: "Direct connection port:",
    directAccessGuideListening:
      "ClawPilot Link is currently listening on TCP port {{port}} for direct app connections.",
    directAccessGuideNotReady:
      "ClawPilot Link wants to use TCP port {{port}} for direct connections, but it is not ready yet: {{reason}}",
    directAccessGuideFixBeforeDirect:
      "Until that is fixed, LAN direct connection and public direct connection will not work reliably. Apps will fall back to Relay more often.",
    directAccessGuideFirewallAllowed:
      "This machine appears to allow TCP port {{port}} through {{firewall}}.",
    directAccessGuideFirewallInactive:
      "Link did not find an active Linux host firewall manager blocking TCP port {{port}}.",
    directAccessGuideFirewallMayBlock:
      "This machine appears to have {{firewall}} enabled, and TCP port {{port}} may still be blocked there.",
    directAccessGuideFirewallUnknown:
      "Link could not confirm whether this machine is allowing TCP port {{port}} yet. If direct connection does not work, check the OS firewall or security policy first.",
    directAccessGuideKeepPortOpen:
      "If you want LAN direct connection or public direct connection, make sure TCP port {{port}} is open on this computer.",
    directAccessGuideRouterForward:
      "If this machine sits behind a home router and you want public direct connection, also forward TCP port {{port}} from the router to this computer.",
    startOutcomeConnected: "It is connected now. You can go back to ClawPilot App and use it.",
    startOutcomeLocalReady:
      "Local network access is already ready. Relay is still connecting in the background.",
    startOutcomeConnecting:
      "It is still connecting. Give it a few seconds, then run clawlink status if you want to confirm.",
    startOutcomeBackendMissing:
      "Link started, but OpenClaw was not found on this computer yet.",
    startOutcomeApprovalRequired:
      "Link did not finish starting because OpenClaw still needs you to approve this Link first.",
    startOutcomeNeedsAttention:
      "Link started, but something still needs attention before it can stay online. Run clawlink doctor for the next fix.",
    startDetectedAddressesTitle: "Detected direct addresses:",
    startDetectedLanIpv4Label: "LAN IPv4",
    startDetectedPublicIpv4Label: "Public IPv4",
    startDetectedPublicIpv6Label: "Public IPv6",
    startDetectedAddressNone: "Not detected yet",
    notPaired: "This computer is not paired yet. Run clawlink pair first.",
    backendMissing: "OpenClaw was not found on this computer.",
    backendUnsupported: "Your current OpenClaw setup is not supported yet.",
    backendReachableOnPort: "OpenClaw is reachable on port {{port}}.",
    backendApprovalRequired:
      "OpenClaw is reachable, but it still needs you to approve this Link first.",
    backendApprovalRequiredWithRequestId:
      "OpenClaw is reachable, but it still needs you to approve this Link first (request ID: {{requestId}}).",
    localAccessReadyOnPort: "Local access is ready on port {{port}}.",
    localAccessDaemonOffline: "Local access is off because ClawPilot Link is not running.",
    localAccessPortInUse:
      "Local access could not start because port {{port}} is already being used by another app on this computer. Close that app, then run clawlink restart.",
    localAccessPermissionDenied:
      "Local access could not start because this computer denied permission to open port {{port}}. Check your system settings or security software, then run clawlink restart.",
    localAccessStatusUnknown:
      "Link has not confirmed the local access status yet. This usually means the daemon just started, or another Link start attempt is overwriting the status. Wait a few seconds and run clawlink status again. If it still stays this way, run clawlink restart.",
    localAccessConflictWithAnotherDaemon:
      "Local access status could not settle because another ClawPilot Link daemon is already running. This usually means autostart and a manual start collided. Run clawlink restart first. If it keeps happening, check your login item or LaunchAgent setup.",
    localAccessUnavailable:
      "Local access is not available right now. Run clawlink doctor to see what needs attention.",
    localAccessNeedsAttention:
      "ClawPilot Link can still use Relay, but local network direct connection is not ready yet. Run clawlink doctor for help.",
    doctorSummaryOk: "Everything looks good.",
    doctorSummaryFix: "Something needs attention before Link can stay online.",
    statusTitle: "ClawPilot Link status",
    statusAttentionLabel: "Needs attention",
    statusNextStepLabel: "Next step",
    statusInstalledVersionLabel: "Installed version",
    statusRunningVersionLabel: "Running version",
    statusVersionStatusLabel: "Version status",
    statusLinkIdLabel: "Link ID",
    statusStateLabel: "Status",
    statusConnectionPathLabel: "How apps connect",
    statusDaemonLabel: "Daemon",
    statusOpenClawLabel: "OpenClaw",
    statusLocalAccessLabel: "Local access",
    statusLastErrorLabel: "Last error",
    statusBackendUrlLabel: "Backend URL",
    statusNotPairedValue: "Not paired",
    statusUnknownValue: "Unknown",
    statusDaemonOnlineValue: "online",
    statusDaemonOfflineValue: "offline",
    statusStateNew: "This computer has not been set up yet.",
    statusStatePairing: "Waiting for the QR code to be scanned.",
    statusStatePaired: "Paired, but not fully online yet.",
    statusStateConnecting: "Connecting to Relay now.",
    statusStateConnected: "Online and ready.",
    statusStateDegraded: "OpenClaw was found, but something still needs attention.",
    statusStateBackendMissing: "OpenClaw was not found on this computer.",
    statusStateApprovalRequired: "OpenClaw approval is still required.",
    statusStateRevoked: "This Link access was removed and needs to be paired again.",
    statusVersionReady:
      "Everything is already using version {{version}}.",
    statusVersionRestartNeeded:
      "Version {{installedVersion}} is installed, but the background service is still running {{runningVersion}}. Run clawlink restart to finish the update.",
    statusVersionDaemonOffline:
      "Version {{installedVersion}} is installed. The background service is not running right now, so start or restart Link when you want this computer online.",
    statusPathSetupNeeded:
      "This computer is not ready yet. Run clawlink pair first, then scan the QR code in ClawPilot App.",
    statusPathApprovalRequired:
      "Apps cannot connect yet because OpenClaw is still waiting for you to approve this Link.",
    statusPathDaemonOffline:
      "This computer is paired, but the background Link service is not running. Apps cannot connect until you start or restart Link.",
    statusPathBackendMissing:
      "Apps cannot connect yet because OpenClaw was not found on this computer.",
    statusPathDegraded:
      "OpenClaw was found, but Link still needs attention before it can stay reliable. Run clawlink doctor for the next fix.",
    statusPathLanPublicAndRelay:
      "Apps on the same home network should use local direct first. Away from home, ClawPilot has a saved public address for this computer, so it can try public direct before falling back to Relay.",
    statusPathLanAndPublic:
      "Apps on the same home network should use local direct first. Away from home, ClawPilot has a saved public address for this computer and can try public direct when your router is ready.",
    statusPathPublicAndRelay:
      "Local direct is not ready, but ClawPilot has a saved public address for this computer. It can try public direct first and still fall back to Relay if needed.",
    statusPathPublicOnly:
      "ClawPilot has a saved public address for this computer. If your router port forwarding is ready, apps may be able to connect directly.",
    statusPathLanAndRelay:
      "Apps on the same home network should use local direct connection first. When local direct is unavailable, Relay can take over automatically.",
    statusPathLanOnly:
      "Apps on the same home network can connect directly right now. Relay is not ready yet, so outside access is not available yet.",
    statusPathRelayOnly:
      "Local direct is not ready, but Relay is online. Apps can still connect through Relay from anywhere.",
    statusPathRelayConnecting:
      "Link is still bringing Relay online. If you just started it, wait a moment and check status again.",
    statusPathUnavailable:
      "Link is not ready for app connections yet. Run clawlink doctor to see what needs attention.",
    statusNextStepPair:
      "Run clawlink pair, then scan the QR code in ClawPilot App.",
    statusNextStepApprove:
      "Approve this Link in OpenClaw first. If clawlink is already waiting in another terminal, go back there and press Enter after approving.",
    statusNextStepStart:
      "Run clawlink start to bring this computer online.",
    statusNextStepRestart:
      "Run clawlink restart to finish the update and reconnect cleanly.",
    statusNextStepRestoreOpenClaw:
      "Make sure OpenClaw is running on this same computer, then run clawlink restart.",
    statusNextStepDoctor:
      "Run clawlink doctor. It will tell you the next fix in plain language.",
    statusNextStepRestartAfterFix:
      "After you fix the issue above, run clawlink restart.",
    statusNextStepWaitForRelayRetry:
      "Wait about {{waitSeconds}} seconds for Link to retry Relay automatically. If it keeps happening, run clawlink doctor.",
    statusNextStepWait:
      "Wait a few seconds, then run clawlink status again.",
    qrJoinReady: "A new join QR code is ready.",
    qrNeedsPair: "This computer is not paired yet, so we cannot create a join QR code.",
    startForeground: "Running ClawPilot Link in the foreground. Press Ctrl+C to stop.",
    pairedOk: "Link is paired.",
    daemonRunning: "Daemon is running.",
    daemonNotRunning: "Daemon is not running.",
    daemonRuntimeHealthy: "Link did not find stale daemon runtime leftovers.",
    daemonRuntimeNoExtraIssue:
      "Link did not find a stale daemon lock or IPC socket. The background daemon simply is not running right now.",
    daemonRuntimeStaleLockInvalid:
      "Link found a daemon lock file, but it is incomplete or unreadable.",
    daemonRuntimeStaleLockDeadPid:
      "Link found an old daemon lock file, but PID {{pid}} is no longer running.",
    daemonRuntimeStaleLockPidMismatch:
      "Link found an old daemon lock file, but PID {{pid}} now belongs to another process.",
    daemonRuntimeLinkProcessWithoutIpc:
      "A Link daemon-like process is still around (PID {{pid}}), but its IPC socket is not responding.",
    daemonRuntimeStaleSocket:
      "Link found a leftover IPC socket at {{socketPath}}, but no daemon is responding on it.",
    daemonRuntimeLastLaunchFailed:
      "The last daemon launch failed before it could stay online: {{reason}}",
    linkCredentialsMissing: "Link needs to be paired again on this computer.",
    linkCredentialsExpired: "This computer's Link sign-in expired. Run clawlink pair again.",
    linkRevoked: "This computer's Link access was removed. Run clawlink pair again to reconnect.",
    relayDisconnectedRetrying:
      "Relay disconnected unexpectedly. Link will keep retrying in the background.",
    relayDisconnectedBecauseBackendUnavailable:
      "Relay was disconnected because OpenClaw is not available on this computer right now.",
    relayReconnectCoolingDown:
      "Relay kept disconnecting {{reconnectCount}} times in a short period. Link is pausing for {{waitSeconds}} seconds before trying again.",
    relayConfigSecure: "Relay address uses HTTPS.",
    relayConfigInsecure:
      "The Relay address must start with https://. Open {{configFile}} and update relayBaseUrl.",
    relayReachable: "Relay is reachable.",
    relayUnreachable: "Relay is not reachable right now.",
    relayCheckSkipped:
      "Relay health was not checked because the Relay address is not using https://.",
    apiReachable: "API server is reachable.",
    apiUnreachable: "API server is not reachable right now.",
    skillInstalled: "Skill file is installed.",
    skillMissing: "Skill file is missing.",
    unpairConfirm: "Run clawlink unpair --yes if you really want to clear this computer's Link credentials.",
    startDaemonFailed: "ClawPilot Link did not start in time.",
    startDaemonFailedWithReason: "ClawPilot Link did not start in time: {{reason}}",
    restartFailed: "ClawPilot Link did not restart in time.",
    restartFailedWithReason: "ClawPilot Link did not restart in time: {{reason}}",
    stopDaemonFailed: "ClawPilot Link could not be stopped right now.",
    unknownCommand: "Unknown command",
    availableCommands:
      "Available commands: help, version, pair, start, status, doctor, restart, stop, autostart on, autostart off, uninstall, unpair",
    helpIntro: "Use one of these commands:",
    helpDefaultCommand: "If you run clawlink without a command, it shows the current status.",
    helpCommandHelp: "Show this command list.",
    helpCommandVersion: "Show which ClawPilot Link version is installed on this computer.",
    helpCommandPair:
      "Prepare this computer for pairing, bring Link online if needed, and show a QR code.",
    helpCommandStart:
      "Start the Link service in the background and try to connect right away.",
    helpCommandStatus:
      "Show whether this computer is ready, including pairing, service status, OpenClaw, local access, and whether a restart is needed after an update.",
    helpCommandDoctor: "Run a fuller health check and tell you what needs attention.",
    helpCommandRestart: "Restart the background Link service after an update or local fix.",
    helpCommandStop: "Stop the background Link service on this computer.",
    helpCommandAutostartOn:
      "Make Link start automatically when this computer signs in.",
    helpCommandAutostartOff:
      "Remove the automatic start entry that Link installed earlier.",
    helpCommandUninstall:
      "Stop Link and remove auto-start before removing the npm package. Add --unpair to also clear local Link data.",
    helpCommandUnpair: "Clear this computer's Link credentials.",
  },
  "zh-Hans": {
    pairingCreated: "已创建 ClawPilot Link 配对会话。",
    scanPrompt: "请用 ClawPilot App 扫描下面的二维码：",
    manualCode: "手动输入码",
    waitingForScan: "正在等待有人扫码...",
    qrWindowsSvgOpened:
      "有些 Windows 终端会把字符拼出来的二维码渲染坏，所以 Link 已在终端外打开一份清晰二维码：{{filePath}}",
    qrWindowsSvgSaved:
      "有些 Windows 终端会把字符拼出来的二维码渲染坏。请直接打开这份清晰二维码：{{filePath}}",
    pairingSuccess: "ClawPilot Link 已完成配对。",
    pairingExpired: "这次配对已经过期，请重新执行 clawlink pair。",
    pairNeedsInteractiveSetup:
      "在继续配对前，OpenClaw 还差一步配置。请在可交互的终端里重新执行 clawlink pair。",
    pairConfigPathPromptIntro:
      "已经能连到 OpenClaw，但 Link 还需要知道 openclaw.json 在哪里。当前预期路径：{{configPath}}",
    pairConfigPathPromptWindowsWslHint:
      "如果 OpenClaw 是装在 Windows 的 WSL 里，这里可以直接粘贴 Linux 路径（/home/...），也可以粘贴 Windows 的 WSL 路径（\\\\wsl$\\发行版\\home\\...）。",
    pairConfigPathQuestion:
      "现在请输入 openclaw.json 的完整路径；如果你想改为手动输入 URL 和 token/password，直接回车即可：",
    pairConfigPathNotUsable:
      "这个 openclaw.json 路径现在还不能直接用：{{reason}}",
    pairBackendNeedsManualSetup:
      "在继续配对前，Link 还需要你补充 OpenClaw 信息：{{reason}}",
    pairBackendMissingBeforeManual:
      "这台电脑现在还连不到 OpenClaw，所以 Link 需要你手动输入 URL 和 token/password。",
    pairManualSetupIntro: "现在请输入这台 Link 要连接的 OpenClaw 地址和共享密钥。",
    pairManualUrlQuestion: "OpenClaw 地址：",
    pairManualAuthTypeIntro: "请先选择下一步要输入哪一种 OpenClaw 凭证：",
    pairManualAuthTypeOptionToken: "1. Token",
    pairManualAuthTypeOptionPassword: "2. Password",
    pairManualAuthTypeQuestion: "请输入 1 或 2：",
    pairManualAuthTypeInvalid: "请输入 1 或 2。",
    pairManualTokenQuestion: "OpenClaw token：",
    pairManualPasswordQuestion: "OpenClaw password：",
    pairManualSetupCancelled:
      "在 OpenClaw 配置完成前，这次配对已经取消。等你准备好后，再执行一次 clawlink pair。",
    pairManualBackendUnreachable:
      "按你刚才输入的信息，Link 还是连不到 {{url}} 上的 OpenClaw。",
    pairManualBackendStartHint:
      "请先确认 OpenClaw 已经启动，再重新尝试。",
    pairManualBackendInstallHint:
      "如果 OpenClaw 跑在另一台服务器上，建议把 ClawPilot Link 直接安装到那台服务器上。",
    pairManualBackendNeedsAttention:
      "Link 已经连到了 OpenClaw，但它现在还不能继续使用：{{reason}}",
    pairLanguagePromptIntro:
      "Choose the language for ClawPilot Link before continuing. / 继续之前，请先选择 ClawPilot Link 使用的语言。",
    pairLanguagePromptOptionZhHans: "1. 简体中文",
    pairLanguagePromptOptionEn: "2. English",
    pairLanguagePromptQuestion: "Enter 1 or 2 / 请输入 1 或 2: ",
    pairLanguagePromptInvalid: "Please enter 1 or 2. / 请输入 1 或 2。",
    pairLanguageChangedToZhHans: "接下来 ClawPilot Link 会使用简体中文。",
    pairLanguageChangedToEn: "ClawPilot Link will continue in English.",
    approvalRequiredIntro:
      "已经探测到 OpenClaw，但它还需要你先审批这台 Link，后续流程才能继续。",
    approvalRequiredRequestId: "审批请求 ID：{{requestId}}",
    approvalRequiredNoStart:
      "在你完成审批前，ClawPilot Link 会停在等待审批状态，不会继续启动。",
    approvalRequiredRunCommand:
      "如果这个 OpenClaw 就在这台电脑上，你可以先试试这条审批命令：",
    approvalRequiredLocalConfigHint:
      "如果上面的命令不能用，请到这台机器上的 OpenClaw 里手动审批这个待处理设备请求。它的 openclaw.json 在这里：{{configPath}}",
    approvalRequiredLocalHint:
      "请到这台电脑上的 OpenClaw 实例里，手动审批这个待处理的设备请求。",
    approvalRequiredRemoteHint:
      "请到你填写的那个 OpenClaw 服务器上完成审批，然后回到这里重试。",
    approvalRequiredRetryQuestion:
      "在 OpenClaw 里审批完成后，回到这里按回车重试；输入 q 可取消：",
    approvalRequiredCancelled:
      "审批还没有完成，所以 Link 这次没有启动。等你审批好后，再重新执行 clawlink pair 或 clawlink start。",
    approvalAutoWaitingForRequest:
      "正在等待 OpenClaw 把这条审批记录真正创建出来...",
    approvalAutoApproving:
      "已经发现审批记录，正在尝试自动审批...",
    approvalAutoRechecking: "自动审批已发出，正在重新检查 OpenClaw 状态...",
    approvalAutoApproved: "OpenClaw 已自动审批通过这台 Link。",
    approvalAutoPendingNotFound:
      "OpenClaw 现在还没有暴露出这条待审批记录。",
    approvalAutoFailedWillWait:
      "自动审批这次还没有完成：{{reason}}",
    approvalRequiredRechecking: "正在重新检查 OpenClaw 审批状态...",
    approvalRequiredChangedReason:
      "现在已经不只是“等审批”这一个问题了，但 Link 仍然不能继续：{{reason}}",
    approvalRequiredStillPendingWithRequestId:
      "OpenClaw 里这个请求仍然还在等待审批（requestId: {{requestId}}）。",
    approvalRequiredStillPending:
      "OpenClaw 里这个 Link 请求现在仍然还在等待审批。",
    startDaemonAfterPair: "正在后台启动 Link 服务...",
    daemonStarted: "ClawPilot Link 启动成功，现已在后台运行。",
    daemonAlreadyRunning: "ClawPilot Link 已经在运行。",
    daemonAlreadyStopped: "ClawPilot Link 当前已经停止。",
    daemonStopped: "ClawPilot Link 已停止。",
    restartDone: "ClawPilot Link 重启成功，现已在后台运行。",
    restartStarted: "ClawPilot Link 原本没有在运行，这次已启动成功，现已在后台运行。",
    installUpdateRestartNotice:
      "这台电脑已经安装了 ClawPilot Link {{installedVersion}}，但后台服务还在运行 {{runningVersion}}。",
    installUpdateRestartHint:
      "执行 clawlink restart 就能完成更新。如果你之后执行 clawlink start，Link 也会自动把旧后台服务刷新到新版本。",
    daemonRestartingForUpdate:
      "这台电脑已经安装了 ClawPilot Link {{installedVersion}}，当前后台服务还在运行 {{runningVersion}}，现在会自动重启到新版本。",
    autostartPrompt:
      "要不要让 ClawPilot Link 在这台电脑登录后自动启动？",
    autostartHintLater:
      "如果你想之后再打开自动启动，可以执行 clawlink autostart on。",
    autostartSkipped:
      "这次先不打开自动启动。以后如果需要，可以执行 clawlink autostart on。",
    autostartEnabledWithMethod:
      "自动启动已经开启，当前使用的是 {{method}}。",
    autostartAlreadyEnabled:
      "自动启动原本就已经开启，我已经顺手刷新了 {{method}} 入口。",
    autostartEnableFailed:
      "自动启动这次还没有打开：{{reason}}",
    autostartNotAvailableHere:
      "当前这个运行环境里，Link 不能设置“电脑登录后自动启动”：{{reason}}",
    autostartDisabled: "自动启动已经移除。",
    autostartAlreadyDisabled: "自动启动本来就是关闭的。",
    autostartUsage: "请使用 clawlink autostart on 或 clawlink autostart off。",
    uninstallConfirm:
      "如果你要先停止 Link、移除自动启动，并为卸载 npm 包做准备，请执行 clawlink uninstall --yes。如果还想一并清掉这台电脑上的本地 Link 数据，请加上 --unpair。",
    uninstallPrepared:
      "这台电脑上的 ClawPilot Link 已经整理到可卸载状态。",
    uninstallLocalDataRemoved:
      "这台电脑上的本地 Link 数据已经清理。",
    uninstallNextStep:
      "如果你还要移除 npm 包，请继续执行 npm uninstall -g @clawpilot-app/link。",
    autostartReasonLinuxContainer:
      "Link 当前跑在 Docker 或其他容器里。“电脑登录后自动启动”这件事只支持把 Link 安装在宿主机系统上。OpenClaw 继续放在 Docker 里没问题，但 Link 应该装在宿主机上；如果你只是想让这个容器自动恢复，请改用 Docker 自己的重启策略。",
    autostartReasonLinuxSystemctlMissing:
      "这台 Linux 机器上没有可用的 systemctl，所以 Link 现在没法在这里注册“登录后自动启动”。",
    autostartReasonLinuxUserSystemdUnavailable:
      "当前这个 Linux 会话还不能使用 systemd 的用户服务，所以 Link 现在没法注册“登录后自动启动”。请先在宿主机上确认 `systemctl --user` 能正常工作；如果这是无桌面的 Linux，通常还需要执行 `sudo loginctl enable-linger $(whoami)`。",
    autostartReasonLinuxDaemonReloadFailed:
      "Link 已经开始写入自动启动入口，但 Linux 这边还没法重新加载用户服务，所以这次没有完成。",
    autostartReasonLinuxDaemonReloadFailedWithDetail:
      "Link 已经开始写入自动启动入口，但 Linux 这边还没法重新加载用户服务，所以这次没有完成：{{detail}}",
    autostartReasonLinuxEnableFailed:
      "Link 已经创建了自动启动入口，但 Linux 这边还没法把它正式启用到下次登录。",
    autostartReasonLinuxEnableFailedWithDetail:
      "Link 已经创建了自动启动入口，但 Linux 这边还没法把它正式启用到下次登录：{{detail}}",
    autostartReasonGeneric:
      "Link 这次还没能打开自动启动。",
    autostartReasonGenericWithDetail:
      "Link 这次还没能打开自动启动：{{detail}}",
    directAccessGuideTitle: "直连端口说明：",
    directAccessGuideListening:
      "当前 ClawPilot Link 正在监听 TCP {{port}} 端口，App 走直连时会用到这个端口。",
    directAccessGuideNotReady:
      "ClawPilot Link 原本想用 TCP {{port}} 端口来做直连，但它现在还没准备好：{{reason}}",
    directAccessGuideFixBeforeDirect:
      "在这个问题修好之前，局域网直连和公网直连都不会稳定工作，App 会更频繁地回落到 Relay。",
    directAccessGuideFirewallAllowed:
      "我检测到这台机器上的 {{firewall}} 看起来已经放行了 TCP {{port}} 端口。",
    directAccessGuideFirewallInactive:
      "当前没有检测到正在工作的 Linux 主机防火墙管理器在拦这个 TCP {{port}} 端口。",
    directAccessGuideFirewallMayBlock:
      "我检测到这台机器启用了 {{firewall}}，而 TCP {{port}} 端口在那里可能还没有放行。",
    directAccessGuideFirewallUnknown:
      "我暂时没法确认这台机器是否已经放行 TCP {{port}} 端口。如果后面直连不通，请优先检查系统防火墙或安全策略。",
    directAccessGuideKeepPortOpen:
      "如果你希望 App 走局域网直连或公网直连，请确保这台电脑对外放开 TCP {{port}} 端口。",
    directAccessGuideRouterForward:
      "如果这台机器在家庭路由器后面，并且你希望公网直连，还需要把路由器上的 TCP {{port}} 端口转发到这台电脑。",
    startOutcomeConnected: "现在已经连接成功，你可以直接回到 ClawPilot App 使用了。",
    startOutcomeLocalReady: "局域网直连已经就绪，Relay 仍会继续在后台连接。",
    startOutcomeConnecting: "现在还在连接中。等几秒后，如果你想确认结果，可以执行 clawlink status。",
    startOutcomeBackendMissing: "Link 已经启动，但这台电脑上暂时还没有找到 OpenClaw。",
    startOutcomeApprovalRequired:
      "Link 这次没有完成启动，因为 OpenClaw 还在等你先审批这台 Link。",
    startOutcomeNeedsAttention:
      "Link 已经启动，但还有问题需要处理后才能稳定在线。你可以执行 clawlink doctor 看下一步怎么修。",
    startDetectedAddressesTitle: "检测到的直连地址：",
    startDetectedLanIpv4Label: "局域网 IPv4",
    startDetectedPublicIpv4Label: "公网 IPv4",
    startDetectedPublicIpv6Label: "公网 IPv6",
    startDetectedAddressNone: "暂时还没检测到",
    notPaired: "这台电脑还没有配对，请先执行 clawlink pair。",
    backendMissing: "这台电脑上没有找到 OpenClaw。",
    backendUnsupported: "当前 OpenClaw 配置暂时还不支持 Link。",
    backendReachableOnPort: "已经在 {{port}} 端口找到 OpenClaw。",
    backendApprovalRequired:
      "已经连到 OpenClaw，但它还在等你先审批这台 Link。",
    backendApprovalRequiredWithRequestId:
      "已经连到 OpenClaw，但它还在等你先审批这台 Link（请求 ID：{{requestId}}）。",
    localAccessReadyOnPort: "局域网直连已经在 {{port}} 端口就绪。",
    localAccessDaemonOffline: "由于 ClawPilot Link 没有运行，局域网直连当前不可用。",
    localAccessPortInUse:
      "{{port}} 端口已经被这台电脑上的其他程序占用，所以局域网直连没能启动。先关闭占用它的程序，再执行 clawlink restart。",
    localAccessPermissionDenied:
      "这台电脑没有允许 ClawPilot Link 打开 {{port}} 端口，所以局域网直连没能启动。请检查系统设置或安全软件，然后再执行 clawlink restart。",
    localAccessStatusUnknown:
      "Link 现在还没有拿到局域网直连的状态结果。通常是后台刚启动，或者另一次 Link 启动正在把状态覆盖掉。先等几秒再执行 clawlink status；如果一直这样，再执行 clawlink restart。",
    localAccessConflictWithAnotherDaemon:
      "局域网直连状态一直没有确认，因为已经有另一个 ClawPilot Link 后台进程在运行了。通常是系统自启动和你手动启动撞在了一起。先执行 clawlink restart；如果还会反复出现，再检查系统登录项或 LaunchAgent。",
    localAccessUnavailable: "局域网直连暂时还不可用。你可以执行 clawlink doctor 看看哪里需要处理。",
    localAccessNeedsAttention:
      "现在仍然可以走 Relay，但局域网直连还没有准备好。你可以执行 clawlink doctor 查看提示。",
    doctorSummaryOk: "当前看起来一切正常。",
    doctorSummaryFix: "还有问题需要先处理，Link 才能稳定在线。",
    statusTitle: "ClawPilot Link 状态",
    statusAttentionLabel: "需要处理",
    statusNextStepLabel: "下一步",
    statusInstalledVersionLabel: "已安装版本",
    statusRunningVersionLabel: "后台运行版本",
    statusVersionStatusLabel: "版本状态",
    statusLinkIdLabel: "Link ID",
    statusStateLabel: "当前状态",
    statusConnectionPathLabel: "App 连接方式",
    statusDaemonLabel: "后台服务",
    statusOpenClawLabel: "OpenClaw",
    statusLocalAccessLabel: "局域网直连",
    statusLastErrorLabel: "上次错误",
    statusBackendUrlLabel: "本地地址",
    statusNotPairedValue: "还没有配对",
    statusUnknownValue: "未知",
    statusDaemonOnlineValue: "在线",
    statusDaemonOfflineValue: "离线",
    statusStateNew: "这台电脑还没有开始配置。",
    statusStatePairing: "正在等待 App 扫描二维码。",
    statusStatePaired: "已经配对，但还没有完全上线。",
    statusStateConnecting: "正在连接 Relay。",
    statusStateConnected: "已经在线，可以使用。",
    statusStateDegraded: "已经找到 OpenClaw，但还有问题需要处理。",
    statusStateBackendMissing: "这台电脑上没有找到 OpenClaw。",
    statusStateApprovalRequired: "还需要先完成 OpenClaw 审批。",
    statusStateRevoked: "这台电脑上的 Link 权限已经被移除，需要重新配对。",
    statusVersionReady: "当前前后台都已经在使用 {{version}} 版本。",
    statusVersionRestartNeeded:
      "这台电脑已经安装了 {{installedVersion}}，但后台服务还在运行 {{runningVersion}}。执行 clawlink restart 就能完成更新。",
    statusVersionDaemonOffline:
      "这台电脑已经安装了 {{installedVersion}}，但后台服务当前没有运行。等你要让这台电脑重新上线时，再启动或重启 Link 即可。",
    statusPathSetupNeeded:
      "这台电脑还没有准备好。先执行 clawlink pair，再用 ClawPilot App 扫描二维码。",
    statusPathApprovalRequired:
      "App 现在还不能连接，因为 OpenClaw 还在等你审批这台 Link。",
    statusPathDaemonOffline:
      "这台电脑虽然已经配对，但后台 Link 服务没有运行，所以 App 现在还连不上。先启动或重启 Link。",
    statusPathBackendMissing:
      "App 现在还不能连接，因为这台电脑上没有找到 OpenClaw。",
    statusPathDegraded:
      "已经找到 OpenClaw，但 Link 还有问题需要处理后才能稳定使用。你可以执行 clawlink doctor 看下一步怎么修。",
    statusPathLanPublicAndRelay:
      "在同一个家庭局域网里，App 会优先走局域网直连；离家在外时，如果这台电脑记录到了公网地址，ClawPilot 会先尝试公网直连，不行再自动切到 Relay。",
    statusPathLanAndPublic:
      "在同一个家庭局域网里，App 会优先走局域网直连；离家在外时，如果你的路由器已经配好端口转发，ClawPilot 也会尝试公网直连。",
    statusPathPublicAndRelay:
      "局域网直连暂时不可用，但这台电脑已经记录到了公网地址。ClawPilot 会先尝试公网直连，必要时仍可自动回退到 Relay。",
    statusPathPublicOnly:
      "这台电脑已经记录到了公网地址。如果你的路由器端口转发已经配好，App 可能可以直接从公网连上来。",
    statusPathLanAndRelay:
      "在同一个家庭局域网里，App 会优先走局域网直连；当局域网直连不可用时，会自动切到 Relay 兜底。",
    statusPathLanOnly:
      "现在同一个家庭局域网里的 App 可以直接连上，但 Relay 还没准备好，所以外网暂时还不能用。",
    statusPathRelayOnly:
      "局域网直连暂时还没准备好，但 Relay 已经在线，所以 App 仍然可以通过 Relay 使用。",
    statusPathRelayConnecting:
      "Link 还在把 Relay 拉起来。如果你刚启动它，等一会再执行一次 clawlink status 看看。",
    statusPathUnavailable:
      "Link 现在还没有准备好供 App 连接。你可以执行 clawlink doctor 看看哪里需要处理。",
    statusNextStepPair:
      "先执行 clawlink pair，然后用 ClawPilot App 扫码。",
    statusNextStepApprove:
      "先去 OpenClaw 里审批这台 Link。如果另一个终端里的 clawlink 已经在等待，就审批后回到那个终端按回车。",
    statusNextStepStart:
      "执行 clawlink start，把这台电脑重新拉上线。",
    statusNextStepRestart:
      "执行 clawlink restart，完成更新并重新连上。",
    statusNextStepRestoreOpenClaw:
      "先确认 OpenClaw 正在这台电脑上运行，然后执行 clawlink restart。",
    statusNextStepDoctor:
      "执行 clawlink doctor，它会直接告诉你下一步怎么处理。",
    statusNextStepRestartAfterFix:
      "先解决上面的提示，再执行 clawlink restart。",
    statusNextStepWaitForRelayRetry:
      "先等大约 {{waitSeconds}} 秒，Link 会自动再试一次 Relay。如果这种情况一直重复，再执行 clawlink doctor。",
    statusNextStepWait:
      "等几秒后，再执行一次 clawlink status 看看。",
    qrJoinReady: "新的加入二维码已经生成。",
    qrNeedsPair: "这台电脑还没有完成配对，所以现在不能生成加入二维码。",
    startForeground: "ClawPilot Link 正在前台运行。按 Ctrl+C 可停止。",
    pairedOk: "这台电脑已经完成 Link 配对。",
    daemonRunning: "后台服务正在运行。",
    daemonNotRunning: "后台服务还没有运行。",
    daemonRuntimeHealthy: "当前没有发现陈旧的 daemon 运行时残留。",
    daemonRuntimeNoExtraIssue:
      "当前没有发现陈旧的 daemon 锁文件或 IPC socket。后台服务现在只是单纯还没有运行。",
    daemonRuntimeStaleLockInvalid:
      "我发现了一个 daemon 锁文件，但它的内容已经不完整，或者现在读不出来了。",
    daemonRuntimeStaleLockDeadPid:
      "我发现了一个旧的 daemon 锁文件，但里面记录的 PID {{pid}} 现在已经不在运行了。",
    daemonRuntimeStaleLockPidMismatch:
      "我发现了一个旧的 daemon 锁文件，但里面记录的 PID {{pid}} 现在已经属于别的进程了。",
    daemonRuntimeLinkProcessWithoutIpc:
      "我发现还有一个像 Link daemon 的进程残留着（PID {{pid}}），但它的 IPC socket 已经没有正常响应了。",
    daemonRuntimeStaleSocket:
      "我发现了一个残留的 IPC socket：{{socketPath}}，但现在并没有 daemon 在响应它。",
    daemonRuntimeLastLaunchFailed:
      "上一次 daemon 启动在真正稳定运行前就失败了：{{reason}}",
    linkCredentialsMissing: "这台电脑需要重新配对 Link。",
    linkCredentialsExpired: "这台电脑上的 Link 登录已经失效，请重新执行 clawlink pair。",
    linkRevoked: "这台电脑的 Link 访问权限已被移除，请重新执行 clawlink pair。",
    relayDisconnectedRetrying:
      "Relay 刚刚意外断开了，Link 会继续在后台自动重试。",
    relayDisconnectedBecauseBackendUnavailable:
      "因为这台电脑当前连不上 OpenClaw，所以 Relay 已先断开。",
    relayReconnectCoolingDown:
      "Relay 在短时间内已经连续断开 {{reconnectCount}} 次。Link 会先暂停 {{waitSeconds}} 秒，再继续重试。",
    relayConfigSecure: "Relay 地址已使用 HTTPS。",
    relayConfigInsecure:
      "Relay 地址必须以 https:// 开头。请打开 {{configFile}}，把 relayBaseUrl 改成 https:// 地址。",
    relayReachable: "Relay 服务可以连通。",
    relayUnreachable: "现在还连不上 Relay 服务。",
    relayCheckSkipped: "由于 Relay 地址不是 https://，所以这次没有继续检测 Relay 连通性。",
    apiReachable: "API 服务可以连通。",
    apiUnreachable: "现在还连不上 API 服务。",
    skillInstalled: "SKILL 文件已经安装。",
    skillMissing: "还没有找到 SKILL 文件。",
    unpairConfirm: "如果你确定要清掉这台电脑上的 Link 凭据，请执行 clawlink unpair --yes。",
    startDaemonFailed: "ClawPilot Link 没有在预期时间内启动。",
    startDaemonFailedWithReason: "ClawPilot Link 没有在预期时间内启动：{{reason}}",
    restartFailed: "ClawPilot Link 没有在预期时间内重新启动。",
    restartFailedWithReason: "ClawPilot Link 没有在预期时间内重新启动：{{reason}}",
    stopDaemonFailed: "现在还没能成功停止 ClawPilot Link，请稍后再试。",
    unknownCommand: "不支持这个命令",
    availableCommands:
      "可用命令：help、version、pair、start、status、doctor、restart、stop、autostart on、autostart off、uninstall、unpair",
    helpIntro: "你可以使用下面这些命令：",
    helpDefaultCommand: "如果你直接执行 clawlink 而不带命令，它会显示当前状态。",
    helpCommandHelp: "显示这份命令列表。",
    helpCommandVersion: "显示这台电脑上安装的是哪个 ClawPilot Link 版本。",
    helpCommandPair: "把这台电脑准备到可配对状态，必要时自动拉起 Link，然后显示二维码。",
    helpCommandStart: "在后台启动 Link 服务，并立即尝试连上。",
    helpCommandStatus:
      "查看这台电脑当前是否已经就绪，包括是否已配对、后台服务是否在运行、OpenClaw 和局域网直连是否正常，以及升级后是否需要重启。",
    helpCommandDoctor: "做一次更完整的检查，并告诉你哪里需要处理。",
    helpCommandRestart: "在升级之后或修复本地问题之后，重新启动后台 Link 服务。",
    helpCommandStop: "停止这台电脑上后台运行的 Link 服务。",
    helpCommandAutostartOn: "让 Link 在这台电脑登录后自动启动。",
    helpCommandAutostartOff: "移除 Link 之前安装的自动启动入口。",
    helpCommandUninstall:
      "在移除 npm 包前，先停止 Link 并移除自动启动；加上 --unpair 还会清理本地 Link 数据。",
    helpCommandUnpair: "清掉这台电脑上的 Link 凭据。",
  },
};

export function detectLanguage() {
  const envCandidates = [
    process.env.CLAWPILOT_LINK_LANG,
    process.env.LC_ALL,
    process.env.LC_MESSAGES,
    process.env.LANG,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.toLowerCase());

  for (const candidate of envCandidates) {
    if (candidate.includes("zh")) {
      return "zh-Hans";
    }
    if (candidate.includes("en")) {
      return "en";
    }
  }

  return "en";
}

export function isSupportedLanguage(language) {
  return SUPPORTED_LANGUAGES.includes(language);
}

export function resolveLanguage(configLanguage) {
  if (isSupportedLanguage(configLanguage)) {
    return configLanguage;
  }
  return detectLanguage();
}

export function createTranslator(language) {
  const resolvedLanguage = language === "zh-Hans" ? "zh-Hans" : "en";
  return {
    language: resolvedLanguage,
    t(key, vars = undefined) {
      const template = copy[resolvedLanguage][key] ?? copy.en[key] ?? key;
      if (!vars || typeof vars !== "object") {
        return template;
      }
      return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
        const value = vars[name];
        return value === undefined || value === null ? "" : String(value);
      });
    },
  };
}
