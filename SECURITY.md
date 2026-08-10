# Security Policy

## Reporting a vulnerability

If you believe you've found a security vulnerability in Tabletop, please
report it privately by emailing **support@divotek.com** rather than opening a
public issue. Include as much detail as you can (affected package and
version, reproduction steps, potential impact) so it can be triaged quickly.

## Scope

This covers the two packages published from this repository:

- `tbtop/admin` (Packagist) — `packages/php`
- `@tbtop/inertia-admin` (npm) — `packages/client`

Issues in the `apps/demo` reference app or in third-party dependencies should
be reported to those projects directly, unless the issue is caused by how
this repository uses them.

## Supported versions

Tabletop is pre-1.0. Both packages ship in lockstep from a single version
(see `packages/client/package.json`). Only the latest published `0.2.x`
release is supported — please upgrade before reporting an issue against an
older version.
