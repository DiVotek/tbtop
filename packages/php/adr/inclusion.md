---
domain: inclusion
---

# Conditional existence — `when()` and its endpoints

## Decisions

- **`when(false)` means two things at once**: the node is absent from the wire *and* its
  endpoints answer 404. Distinct from the client-side `hiddenIf`/`disabledIf`, which ship a
  node that exists and react to form state. A half-implementation — hidden but still
  served — is the failure mode the rule exists to prevent.
- **Wire exclusion runs in the `Node` constructor**, through `ChildInclusion::filter()`, so
  it covers every node however it was built, including a consumer's `new Node($kind, [...])`.
  `ChildInclusion::isConditionMet()` duck-types on `isIncluded()` rather than a class list:
  the `HasWhen` trait supplies it for mutable builders, `Node` implements it by hand because
  it is immutable, and a consumer's own builder opts in the same way.
- **Endpoint exclusion runs in the lookup, not in the controllers.** Builders register at
  construction, before any serialization decision, so a `when(false)` entity is still in the
  collector map — the verdict has to gate the lookup. `S::reachableTable/Form/Action/Chart/Stat()`
  apply it; controllers call those instead of indexing `collected*()` directly. This mirrors
  what `S::searchIncludedForms()` already did for the field endpoints (upload, select
  options/create, relation search), which is why those controllers never contained the rule.
  > Replaces previous decision (see git history): each controller re-checked `isIncluded()`
  > in its own null-guard. Six near-identical copies with per-entity clause combinations, and
  > the copy that was never written is how `Stat` ended up without the rule at all.
- **The resolver decides reachability only.** Whether an entity can serve a *particular*
  endpoint — a table needs a query closure, a form a submit handler, an action a handler —
  stays with the controller that knows which closure it needs, along with its 404 text.
  Pushing that into the resolver would move HTTP specifics into the DSL and make the
  interface as complex as the calls it replaces.
- **`isAuthorized()` composes into the same lookup.** `reachableAction()` applies the Gate
  check alongside `when()`, the pair `ChildInclusion` already composes for the wire. An arch
  test pins the files allowed to call `isAuthorized()` (`ActionBuilder`, `S`) so a third
  implementation cannot appear quietly.
- **Every entity with an endpoint answers `isIncluded()`.** `Stat` was the one exception —
  no `HasWhen`, so `when()` did not compile and `DataController`'s stat branch had nothing to
  check. It now carries the trait and `Stat::toNode()` propagates the verdict via
  `->when($this->isIncluded())`, matching `ChartBuilder`. A stat reaches its data endpoint
  only through `poll()`, keyed by label.

## Why

A rule that every reader must re-assert is a rule some reader will miss, and the misses are
silent: the page looks right while an endpoint keeps answering. That already happened twice —
the commit adding the guard covered charts and skipped stats three lines below, and a
follow-up had to close three more leaked readers. Moving the verdict into the lookup makes
the rule structural: a new endpoint inherits it from the resolver it has to call anyway,
rather than from remembering a convention. The HTTP suite keeps a hidden/visible pair per
endpoint kind, which catches the one mutation the resolver test cannot — a controller going
back to `collected*()` directly.
