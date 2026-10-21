#!/usr/bin/env bash
# Vercel ignoreCommand: exit 0 skips the build, exit 1 builds.
# gate/* branches are `pnpm gate` snapshots for CI only; the lane's real branch builds the preview.
case "${VERCEL_GIT_COMMIT_REF:-}" in
  gate/*) echo "vercel-ignore: ${VERCEL_GIT_COMMIT_REF} is a gate snapshot, skipping"; exit 0 ;;
esac
exit 1
