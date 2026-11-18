---
domain: fields
---

# Form fields

## Decisions

- **Stored secrets: `Password::secret()`, opt-in, server-stripped.** A secret field's
  value is removed from `FormBuilder::recordData()` (so from page props and HTML); the node
  carries only `options.secret = {filled, clearable?, preview?}`. `preview()` is a server
  closure and only its result ships, so the author decides how much of the value to show —
  nothing by default. Chosen over a fixed mask or a fixed "last 4": a mask says nothing a
  "Set" badge does not, and a fixed last-4 leaks part of every secret, passwords included.
- **Submit semantics: absent keeps, `null` clears, string replaces.** The client does not
  send a secret the user left alone (or opened with Replace and left empty), so
  `$model->update($ctx->form)` keeps it. A `null` counts only on a `clearable()` field;
  elsewhere `SecretRecord::applyInput()` drops it, so a hand-made request or an MCP agent
  cannot wipe the secret by sending one. Applied in `FormSubmitController` and in
  `ActionController` for an action reading the page form.
- **`required()` holds while a stored secret is left alone.** The field's rules gain
  `nullable` always and `sometimes` once a value is stored; the client drops `required`
  from a stored secret's constraints. A required secret shows no Clear.
- **Scope: top-level form fields** (layout containers included), read with the same
  traversal as `RecordDefaults`. A `secret()` inside a repeater throws rather than leak its
  row value; modal forms loaded by `query()` are documented as out of scope.

## Why

A form that renders an empty input after save reads as "nothing stored", and the only way
to show more was to put the decrypted value into the record, which ships it to the browser.
Opt-in keeps every existing `password()` unchanged inside the 0.x additive window.
