---
name: capturing-orb-screenshots
description: "Captures authenticated Tabletop demo screenshots with agent-browser and returns reviewable PNG artifacts. Use only for screenshot or visual-inspection requests while working in an Amp orb; do not use for local development."
compatibility: Requires an Amp orb, agent-browser, jq, and the repository's declared demo service.
---

# Capturing Orb Screenshots

Create direct browser screenshots as visual artifacts. This is not a correctness test and does
not replace the project's Pest browser smoke suite.

## Workflow

1. Confirm this is an Amp orb. If `amp orb services ensure` is unavailable because execution is
   local, stop using this skill and follow the local development workflow instead.
2. From the repository root, run `amp orb services ensure`.
3. Read the dynamic supervised-service port:

   ```bash
   port="$(jq -er '.servicePorts.demo' .amp/portals/.service-ports)"
   ```

4. Read the installed agent-browser core guide before the first browser command in a thread:

   ```bash
   agent-browser skills get core --full
   ```

5. Use a dedicated session, set the requested viewport, and open the service through orb-local
   loopback. Never expose or present this loopback URL to the user.

   ```bash
   session="tbtop-screenshot"
   agent-browser --session "$session" set viewport 1728 1000
   agent-browser --session "$session" open "http://127.0.0.1:$port/login"
   agent-browser --session "$session" wait --load networkidle
   agent-browser --session "$session" snapshot -i
   ```

6. Log in with the seeded demo account (`admin@admin.com` / `password`). Use refs from the fresh
   interactive snapshot, then re-snapshot after navigation because refs become stale.
7. Open the requested page, wait for network idle and page-specific visible text. For Recharts
   pages, wait another 1200 ms so the captured chart is not mid-animation.
8. Save a full-page image under `.amp/in/artifacts/` using an absolute, unique path:

   ```bash
   repo_root="$(pwd)"
   artifact="$repo_root/.amp/in/artifacts/dashboard-$(date +%Y%m%d-%H%M%S).png"
   mkdir -p "$repo_root/.amp/in/artifacts"
   agent-browser --session "$session" screenshot "$artifact"
   ```

9. Read `agent-browser console` and `agent-browser errors`, then close the session even when the
   screenshot fails. Use `view_media` to inspect the PNG for blank content, incomplete chart
   animation, clipping, or obvious layout breakage before sharing it.
10. Return the image inline with a workspace file URI. If the user asks for a clickable running
    app, share the portal URL from `.amp/portals/demo.json`, never the loopback URL.

## Verification Boundary

- A screenshot request means direct `agent-browser` capture only.
- Run the `smoke` skill and Pest browser suite only when the user also asks to verify behavior or
  when required after UI code changes.
- Do not describe a screenshot as proof that interactions or business behavior work.
