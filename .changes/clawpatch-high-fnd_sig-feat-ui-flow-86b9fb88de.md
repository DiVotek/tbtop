# fix(forms): stop unwrapping records that carry their own data attribute

touches: form record normalization

`normalize()` treated any object with a non-null object-valued `data` property as a
transport envelope and returned that property. A record whose own JSON attribute is
named `data` therefore lost every sibling field: the form controller saw only the
inner object, fields initialised blank, dirty tracking compared against the wrong
record, and a submit could omit the discarded attributes.

```mermaid
flowchart LR
    subgraph server["tbtop/admin (PHP)"]
        adc(["ActionDataController<br/><small>{data: record}</small>"]):::unchanged
    end
    subgraph client["@tbtop/inertia-admin"]
        unwrap(["unwrapData<br/><small>data/envelope.ts</small>"]):::unchanged
        modal(["modalDataQuery<br/><small>inertia/materializeActions.ts</small>"]):::unchanged
        inertia(["materializeForm<br/><small>bare record from page props</small>"]):::unchanged
        norm["normalize<br/>-envelope guess<br/><small>structure/formBlock.tsx</small>"]:::changed
    end

    adc --> unwrap
    unwrap --> modal
    modal --> norm
    inertia --> norm
    norm ==>|"hero: the record arrives intact"| norm

    classDef changed fill:#0d3b1e,stroke:#2ea043,color:#fff
    classDef touched fill:#21262d,stroke:#8b949e,stroke-dasharray:4,color:#ddd
    classDef unchanged fill:#21262d,stroke:#484f58,color:#aaa
    classDef removed fill:#3b0d0d,stroke:#da3633,color:#fff
```

**Why removing the unwrap is safe, not a regression:** the only endpoint that emits a
`{data: …}` envelope is `ActionDataController`, and that response is already unwrapped
one layer up by `unwrapData` inside `modalDataQuery` before it ever reaches
`normalize`. The other producer, `materializeForm`, resolves a bare record straight
from Inertia page props. The deleted branch dates to the original scaffold commit,
predating both the envelope endpoint and its dedicated unwrap handler — it was
speculative duplication, and the only payload it ever actually changed was a
legitimate record with a `data` field.

**Read by eye:**
- `packages/client/src/structure/formBlock.tsx`

**Verification:**
- `formBlock.test.tsx` 21 pass / 2 skip / 0 fail; the whole `src/structure/` tree
  565 pass / 3 skip / 0 fail.
- The envelope boundary keeps its own coverage in `data/envelope.test.ts`, untouched
  by this change and still green.

**Assumptions:**
- No consumer application relies on `FormBlock` receiving a hand-built `{data: …}`
  envelope from a custom query. Nothing in this repo does, but a downstream app that
  wrapped its own form query would now see the envelope instead of the record.
