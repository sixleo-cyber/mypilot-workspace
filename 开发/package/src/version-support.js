export function buildLinkClientCapabilities() {
  return {
    versionAware: true,
    unsupportedVersionAware: true,
  }
}

export function shouldStopForVersionPolicy(policy) {
  return policy?.status === 'upgrade_required'
}

export function shouldReuseAccessToken({
  accessToken,
  accessTokenExpiresAt,
  accessTokenClientVersion,
  currentClientVersion,
  nowMs = Date.now(),
  refreshThresholdMs = 0,
}) {
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    return false
  }

  const expiresAtMs = Date.parse(accessTokenExpiresAt ?? '')
  if (!Number.isFinite(expiresAtMs) || expiresAtMs - nowMs <= refreshThresholdMs) {
    return false
  }

  if (typeof currentClientVersion !== 'string' || !currentClientVersion.trim()) {
    return false
  }

  return accessTokenClientVersion === currentClientVersion
}

export function isUnsupportedLinkVersionClose(closeCode, closeReason) {
  if (closeCode === 4003) {
    return true
  }
  return typeof closeReason === 'string' && /version unsupported/i.test(closeReason)
}

export function resolveVersionPolicy(source) {
  if (!source || typeof source !== 'object') {
    return null
  }

  if (source.versionPolicy && typeof source.versionPolicy === 'object') {
    return source.versionPolicy
  }

  if (source.details && typeof source.details === 'object' && source.details.versionPolicy && typeof source.details.versionPolicy === 'object') {
    return source.details.versionPolicy
  }

  if (source.payload && typeof source.payload === 'object' && source.payload.error && typeof source.payload.error === 'object') {
    const details = source.payload.error.details
    if (details && typeof details === 'object' && details.versionPolicy && typeof details.versionPolicy === 'object') {
      return details.versionPolicy
    }
  }

  return null
}

export function buildUnsupportedVersionMessage(policy, fallbackCommand) {
  const minSupportedVersion =
    typeof policy?.minSupportedVersion === 'string' && policy.minSupportedVersion.trim()
      ? policy.minSupportedVersion.trim()
      : null
  const upgradeCommand =
    typeof policy?.upgradeCommand === 'string' && policy.upgradeCommand.trim()
      ? policy.upgradeCommand.trim()
      : fallbackCommand

  if (minSupportedVersion && upgradeCommand) {
    return `This Link version is no longer supported. Upgrade to ${minSupportedVersion}+ with: ${upgradeCommand}`
  }
  if (upgradeCommand) {
    return `This Link version is no longer supported. Run: ${upgradeCommand}`
  }
  if (minSupportedVersion) {
    return `This Link version is no longer supported. Upgrade to ${minSupportedVersion}+ on this computer.`
  }
  return 'This Link version is no longer supported on this computer.'
}
