#!/usr/bin/env bash
# Renders the release being cut with git-cliff (config: cliff.toml).
#
#   scripts/changelog.sh               regenerate CHANGELOG.md with it (the version-bump PR)
#   scripts/changelog.sh --notes FILE  write the GitHub Release notes (release.yml)
#
# Both modes first refuse a release that carries a breaking commit without the
# bump VERSIONING.md asks for: the next minor in 0.x, the next major from 1.0.
set -euo pipefail
cd "$(dirname "$0")/.."

# The root devDependency, so bun.lock pins its integrity (run `bun install` first).
cliff() { ./node_modules/.bin/git-cliff "$@"; }

version="$(bun -p "require('./packages/client/package.json').version")"
tag="v$version"
previous="$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' || echo v0.0.0)"

breaking="$(cliff --unreleased --context |
	bun -e 'const r = JSON.parse(await Bun.stdin.text()); console.log(r[0]?.commits.filter((c) => c.conventional && c.breaking).map((c) => `  ${c.message}`).join("\n") ?? "")')"
# The part of the version a breaking change must move: major.minor in 0.x, major after.
line() { case "$1" in v0.*) echo "${1%.*}" ;; *) echo "${1%%.*}" ;; esac; }
if [ -n "$breaking" ] && [ "$(line "$previous")" = "$(line "$tag")" ]; then
	echo "error: breaking commits since $previous, but $tag does not bump the version they need:" >&2
	echo "$breaking" >&2
	echo "see VERSIONING.md" >&2
	exit 1
fi

if [ "${1:-}" = "--notes" ]; then
	# The release title already names the version: drop the heading line.
	cliff --unreleased --tag "$tag" --strip all | sed '1{/^## /d;}' | sed '/./,$!d' > "$2"
	exit 0
fi

# The whole file is a function of git history + cliff.toml: regenerate, never patch
# it. Safe to rerun when more PRs merge before the bump does.
cliff --tag "$tag" | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' > CHANGELOG.md
echo "CHANGELOG.md: regenerated with $version (since $previous)"
