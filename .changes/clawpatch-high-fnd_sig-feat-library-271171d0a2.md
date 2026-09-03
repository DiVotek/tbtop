# fix(fields): resolve slug sources against the repeater row

touches: slug field, field dependencies

A slug sub-field inside a repeater row derived its value from the **root** form's
source field instead of its own row's. Two rows with different titles produced the
same slug. `SlugForm` called `useNearestFormController()` directly, which always
returns the single root form controller, bypassing the row-scoped
`DependencyValuesContext` that `RepeaterRow` already provides.

```mermaid
flowchart LR
    subgraph client["@tbtop/inertia-admin"]
        row(["RepeaterRow<br/><small>repeaterRow.tsx</small>"]):::unchanged
        ctx["DependencyValuesContext<br/><small>row-local item bag</small>"]:::unchanged
        source["field source resolution<br/>+useFieldSourceData<br/><small>fieldDependencies.ts</small>"]:::changed
        slug["slug derivation<br/>+reads row bag, not root<br/><small>slugField.tsx</small>"]:::changed
        deps(["useFieldDependencies<br/><small>already row-aware</small>"]):::unchanged
    end

    row --> ctx
    ctx --> source
    ctx --> deps
    source ==>|"hero: slug now reads the row bag"| slug

    classDef changed fill:#0d3b1e,stroke:#2ea043,color:#fff
    classDef touched fill:#21262d,stroke:#8b949e,stroke-dasharray:4,color:#ddd
    classDef unchanged fill:#21262d,stroke:#484f58,color:#aaa
    classDef removed fill:#3b0d0d,stroke:#da3633,color:#fff
```

`useFieldSourceData()` mirrors what `useFieldDependencies` already did: prefer
`DependencyValuesContext` when present, fall back to the nearest controller. No
wire-contract, PHP, or DSL surface is touched.

Intent says the finding covered both `dependsOn` and slug; the diff shows only the
slug half changed — `dependsOn` was already row-aware on the base commit, so the
patch is narrower than its finding, not incomplete.

**Read by eye:**
- `packages/client/src/fields/fieldDependencies.ts`
- `packages/client/src/fields/slugField.tsx`

**Verification:**
- The added test in `repeaterField.test.tsx` was run against the base commit and
  fails there (root title leaks into a row slug), then passes with the patch.
- No-controller case preserved: `useFieldSourceData()` yields `{}`, and
  `sourceAt({}, …)` returns `""`, matching the old `ctrl ? … : ""` guard.
