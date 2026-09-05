# Tabletop Admin

PHP-DSL admin pages rendered by a React client over Inertia.

## Language

**Description**:
A muted secondary line rendered under a table cell's primary content.
_Avoid_: subtitle, helper text, stacked text

**Group**:
A display column that renders several leaf columns in one header and one cell.
_Avoid_: stack (layout block), composite, card cell, merge

**Typed entry**:
Editing a date by keyboard in the date/daterange popover, in the admin locale's
numeric format, alongside picking it on the calendar.
_Avoid_: manual input, text mode, date mask

**Applied value**:
The date a field has actually emitted to the form, as opposed to the text being
typed or a half-picked calendar draft.
_Avoid_: current value, committed date
