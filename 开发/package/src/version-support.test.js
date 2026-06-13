import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLinkClientCapabilities,
  isUnsupportedLinkVersionClose,
  shouldReuseAccessToken,
  shouldStopForVersionPolicy,
} from './version-support.js'

test('buildLinkClientCapabilities marks the current Link release as version-aware', () => {
  assert.deepEqual(buildLinkClientCapabilities(), {
    versionAware: true,
    unsupportedVersionAware: true,
  })
})

test('shouldStopForVersionPolicy only stops on upgrade_required', () => {
  assert.equal(shouldStopForVersionPolicy({ status: 'ok' }), false)
  assert.equal(shouldStopForVersionPolicy({ status: 'upgrade_recommended' }), false)
  assert.equal(shouldStopForVersionPolicy({ status: 'upgrade_required' }), true)
})

test('isUnsupportedLinkVersionClose detects relay version cutoff closes', () => {
  assert.equal(isUnsupportedLinkVersionClose(4003, 'Link version unsupported'), true)
  assert.equal(isUnsupportedLinkVersionClose(1012, 'superseded by newer link connection'), false)
  assert.equal(isUnsupportedLinkVersionClose(1000, ''), false)
})

test('shouldReuseAccessToken rejects cached tokens without the current Link version', () => {
  const oneHourFromNow = new Date(Date.UTC(2026, 0, 1, 1, 0, 0)).toISOString()

  assert.equal(
    shouldReuseAccessToken({
      accessToken: 'cplink_at_cached',
      accessTokenExpiresAt: oneHourFromNow,
      accessTokenClientVersion: null,
      currentClientVersion: '1.3.5',
      nowMs: Date.UTC(2026, 0, 1, 0, 0, 0),
      refreshThresholdMs: 60_000,
    }),
    false,
  )
  assert.equal(
    shouldReuseAccessToken({
      accessToken: 'cplink_at_cached',
      accessTokenExpiresAt: oneHourFromNow,
      accessTokenClientVersion: '1.3.4',
      currentClientVersion: '1.3.5',
      nowMs: Date.UTC(2026, 0, 1, 0, 0, 0),
      refreshThresholdMs: 60_000,
    }),
    false,
  )
})

test('shouldReuseAccessToken allows valid cached tokens issued for the current Link version', () => {
  assert.equal(
    shouldReuseAccessToken({
      accessToken: 'cplink_at_cached',
      accessTokenExpiresAt: new Date(Date.UTC(2026, 0, 1, 1, 0, 0)).toISOString(),
      accessTokenClientVersion: '1.3.5',
      currentClientVersion: '1.3.5',
      nowMs: Date.UTC(2026, 0, 1, 0, 0, 0),
      refreshThresholdMs: 60_000,
    }),
    true,
  )
})
