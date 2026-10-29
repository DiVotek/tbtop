# Changelog

Every release of `tbtop/admin` (Packagist) and `@tbtop/inertia-admin` (npm) —
both ship in lockstep from one tag. Versioning rules: [VERSIONING.md](VERSIONING.md).
Upgrade steps for breaking releases: [UPGRADE.md](UPGRADE.md).

## [0.7.3](https://github.com/DiVotek/tbtop/releases/tag/v0.7.3) — 2026-10-29

### Features

- **tables:** sort and translate by group children; harden auth forms ([#391](https://github.com/DiVotek/tbtop/pull/391))
- **tables:** poll() refreshes table rows on an interval ([#392](https://github.com/DiVotek/tbtop/pull/392))
- **tables:** sticky columns pinned on horizontal scroll ([#394](https://github.com/DiVotek/tbtop/pull/394))
- **panels:** environment indicator ([#393](https://github.com/DiVotek/tbtop/pull/393))
- **auth:** profile page for name, email and password ([#395](https://github.com/DiVotek/tbtop/pull/395))
- **tables:** simplePagination() — pages without a count query ([#396](https://github.com/DiVotek/tbtop/pull/396))
- **tables:** resize columns by dragging and reorder them from the Columns menu ([#397](https://github.com/DiVotek/tbtop/pull/397))
- **php:** NavItem::can() gates a nav or user-menu link ([#404](https://github.com/DiVotek/tbtop/pull/404))

### Fixes

- **client:** keep an action's badge on its trigger for modal and handler actions ([#402](https://github.com/DiVotek/tbtop/pull/402))
- **client:** resolve numbered lucide icons by their lucide.dev name ([#405](https://github.com/DiVotek/tbtop/pull/405))

## [0.7.2](https://github.com/DiVotek/tbtop/releases/tag/v0.7.2) — 2026-10-26

### Features

- **client:** shadcn style presets — all eight styles, chosen from PHP ([#344](https://github.com/DiVotek/tbtop/pull/344))
- **demo:** floating style preset switcher ([#384](https://github.com/DiVotek/tbtop/pull/384))
- **fields:** per-locale placeholders on translatable text and textarea ([#385](https://github.com/DiVotek/tbtop/pull/385))
- **media:** responsive webp variants by default and tbtop:media-regenerate ([#383](https://github.com/DiVotek/tbtop/pull/383))

### Fixes

- **client:** keep blur validation alive on PCRE-only regex, check url ([#370](https://github.com/DiVotek/tbtop/pull/370))
- **validation:** put distinct on the element key of multiple selects and uploads ([#372](https://github.com/DiVotek/tbtop/pull/372))
- **client:** boolean and checkbox fields read 1/"true" as on ([#371](https://github.com/DiVotek/tbtop/pull/371))
- **client:** fold Polish ł in slugs and keep multi-line notification bodies ([#379](https://github.com/DiVotek/tbtop/pull/379))
- **client:** fix the slug once focus leaves its source field ([#381](https://github.com/DiVotek/tbtop/pull/381))

### Documentation

- **tables:** say gated-out columns are dropped from search and sort ([#376](https://github.com/DiVotek/tbtop/pull/376))
- **install:** say where the Inertia middleware must sit for public pages ([#382](https://github.com/DiVotek/tbtop/pull/382))

## [0.7.1](https://github.com/DiVotek/tbtop/releases/tag/v0.7.1) — 2026-10-22

### Features

- **commands:** make:tbtop-resource generates list, create, edit and view pages from a model's table ([#343](https://github.com/DiVotek/tbtop/pull/343))

### Fixes

- date field accepts Eloquent's ISO instant; admin:install --auth hints the panel config ([#346](https://github.com/DiVotek/tbtop/pull/346))
- **uploads:** skip image conversion above 40 megapixels ([#348](https://github.com/DiVotek/tbtop/pull/348))
- **media:** refuse XML-family uploads regardless of the accept list ([#349](https://github.com/DiVotek/tbtop/pull/349))
- **auth:** harden the demo's two-factor setup, challenge and replay ([#352](https://github.com/DiVotek/tbtop/pull/352))
- **media:** optional panel gate for the media API ([#353](https://github.com/DiVotek/tbtop/pull/353))
- **uploads:** accept only current or session-issued upload paths ([#355](https://github.com/DiVotek/tbtop/pull/355))
- **auth:** end other sessions when a password changes ([#354](https://github.com/DiVotek/tbtop/pull/354))
- **tables:** escape LIKE wildcards in search and filter input ([#350](https://github.com/DiVotek/tbtop/pull/350))
- **uploads:** bind upload paths in modal forms and richtext embeds ([#356](https://github.com/DiVotek/tbtop/pull/356))
- **client:** toggle buttons show int-backed record values ([#359](https://github.com/DiVotek/tbtop/pull/359))
- **actions:** fire model events from the bulk restore and force-delete actions ([#360](https://github.com/DiVotek/tbtop/pull/360))
- **fields:** accept an enum case as an explicit option value ([#363](https://github.com/DiVotek/tbtop/pull/363))
- **client:** radio and checkbox-list show int-backed record values ([#365](https://github.com/DiVotek/tbtop/pull/365))
- **tables:** don't search or sort by a gated-out column ([#364](https://github.com/DiVotek/tbtop/pull/364))
- **client:** apply resetForm from a form-submit handler ([#368](https://github.com/DiVotek/tbtop/pull/368))
- **client:** name the per-page selector and flag invalid keyvalue rows ([#366](https://github.com/DiVotek/tbtop/pull/366))
- **tables:** block drag-reorder while a column search is active ([#367](https://github.com/DiVotek/tbtop/pull/367))
- **forms:** keep the action click when blur validation moves the button ([#374](https://github.com/DiVotek/tbtop/pull/374))
- **client:** stop richtext with an HTML value from stealing focus on load ([#375](https://github.com/DiVotek/tbtop/pull/375))
- **media:** encode palette PNGs to webp instead of a 500, and clean up stored files on failure ([#377](https://github.com/DiVotek/tbtop/pull/377))

## [0.7.0](https://github.com/DiVotek/tbtop/releases/tag/v0.7.0) — 2026-10-15

### Features

- **auth:** ship panel logout and the signed-in user from the package ([#339](https://github.com/DiVotek/tbtop/pull/339))
- **auth:** admin:install --auth publishes sign-in and password reset from package base pages ([#340](https://github.com/DiVotek/tbtop/pull/340))

## [0.6.1](https://github.com/DiVotek/tbtop/releases/tag/v0.6.1) — 2026-10-09

### Fixes

- **media:** bump svg-sanitize to 1.0 and release 0.6.1 ([#341](https://github.com/DiVotek/tbtop/pull/341))

## [0.6.0](https://github.com/DiVotek/tbtop/releases/tag/v0.6.0) — 2026-10-08

### Features

- **mcp:** expose panel pages to a trusted agent over MCP ([#309](https://github.com/DiVotek/tbtop/pull/309))
- **mcp:** list dynamic field options through query, describe masks ([#331](https://github.com/DiVotek/tbtop/pull/331))
- **mcp:** fill richtext and describe repeater rows over MCP ([#333](https://github.com/DiVotek/tbtop/pull/333))

### Fixes

- **charts:** keep materialized chart queries stable ([#304](https://github.com/DiVotek/tbtop/pull/304))
- **navigation:** expire unconsumed server-redirect marker ([#270](https://github.com/DiVotek/tbtop/pull/270))
- **tables:** ship only the record key and declared columns in table rows ([#265](https://github.com/DiVotek/tbtop/pull/265))
- **upload:** give the filled single-upload preview a labelled, validated input with replace ([#325](https://github.com/DiVotek/tbtop/pull/325))
- **auth:** accept recovery codes on the admin 2FA challenge ([#293](https://github.com/DiVotek/tbtop/pull/293))
- **demo:** support HTTPS behind orb portal ([#296](https://github.com/DiVotek/tbtop/pull/296))
- **upload:** render the upload cell from its own value only ([#328](https://github.com/DiVotek/tbtop/pull/328))
- **tables:** leave an image cell empty when its image fails to load ([#329](https://github.com/DiVotek/tbtop/pull/329))
- **fields:** size the async option loader like the control it replaces ([#334](https://github.com/DiVotek/tbtop/pull/334))
- **fields:** derive a slug from a translatable source's default content locale ([#335](https://github.com/DiVotek/tbtop/pull/335))
- **mcp:** check a browser Origin against app.url, not the request Host ([#336](https://github.com/DiVotek/tbtop/pull/336))
- **tables:** identify rows by a _key no column can overwrite ([#338](https://github.com/DiVotek/tbtop/pull/338))

### Documentation

- **repo:** add contributor source map and fix stale agent pointers ([#323](https://github.com/DiVotek/tbtop/pull/323))
- **panels:** show a non-access middleware in the authStack() example ([#337](https://github.com/DiVotek/tbtop/pull/337))

## [0.5.6](https://github.com/DiVotek/tbtop/releases/tag/v0.5.6) — 2026-10-01

### Features

- **actions:** one link canon, url() plus openUrlInNewTab() ([#319](https://github.com/DiVotek/tbtop/pull/319))
- **layout:** section links and header actions, list item links ([#321](https://github.com/DiVotek/tbtop/pull/321))

### Fixes

- **navigation:** send off-origin links past the Inertia router ([#320](https://github.com/DiVotek/tbtop/pull/320))

## [0.5.5](https://github.com/DiVotek/tbtop/releases/tag/v0.5.5) — 2026-10-01

### Features

- **navigation:** rail labels, group descriptions, stat links and badge labels ([#317](https://github.com/DiVotek/tbtop/pull/317))
- **richtext:** embed DSL-form blocks into the richtext editor ([#316](https://github.com/DiVotek/tbtop/pull/316))
- **tables:** badges and options from an enum or an inline map (0.5.5) ([#318](https://github.com/DiVotek/tbtop/pull/318))

### Documentation

- **navigation:** cover rail-sidebar and nav sections everywhere ([#315](https://github.com/DiVotek/tbtop/pull/315))

## [0.5.4](https://github.com/DiVotek/tbtop/releases/tag/v0.5.4) — 2026-09-28

### Features

- **navigation:** named sections inside nav groups ([#312](https://github.com/DiVotek/tbtop/pull/312))
- **navigation:** rail + sidebar navigation layout ([#313](https://github.com/DiVotek/tbtop/pull/313))

## [0.5.3](https://github.com/DiVotek/tbtop/releases/tag/v0.5.3) — 2026-09-25

### Fixes

- **client:** wrap overflowing tab lists instead of clipping them (0.5.3) ([#311](https://github.com/DiVotek/tbtop/pull/311))

## [0.5.2](https://github.com/DiVotek/tbtop/releases/tag/v0.5.2) — 2026-09-25

### Fixes

- **validation:** parse quoted Rule::in values for client constraints ([#310](https://github.com/DiVotek/tbtop/pull/310))

### Documentation

- **core:** correct the hand-written docs against source before release ([#306](https://github.com/DiVotek/tbtop/pull/306))
- **core:** correct the ADRs and the authoring guide against the code ([#307](https://github.com/DiVotek/tbtop/pull/307))

## [0.5.1](https://github.com/DiVotek/tbtop/releases/tag/v0.5.1) — 2026-09-15

### Features

- **panels:** discover host pages with a persistent cache ([#303](https://github.com/DiVotek/tbtop/pull/303))

### Documentation

- **core:** resurvey stale documentation against source ([#298](https://github.com/DiVotek/tbtop/pull/298))

## [0.5.0](https://github.com/DiVotek/tbtop/releases/tag/v0.5.0) — 2026-09-05

### Features

- **fields:** typed date entry in the date and daterange popovers ([#297](https://github.com/DiVotek/tbtop/pull/297))

## [0.4.21](https://github.com/DiVotek/tbtop/releases/tag/v0.4.21) — 2026-09-04

### Features

- **table:** grouped cells and column descriptions ([#294](https://github.com/DiVotek/tbtop/pull/294))

### Fixes

- **core:** reviewed clawpatch batch — 21 verified fixes ([#286](https://github.com/DiVotek/tbtop/pull/286))

## [0.4.20](https://github.com/DiVotek/tbtop/releases/tag/v0.4.20) — 2026-09-01

### Features

- **fields:** year picker and bounds for the date field ([#292](https://github.com/DiVotek/tbtop/pull/292))

### Fixes

- **auth:** return to the intended URL after sign-in ([#291](https://github.com/DiVotek/tbtop/pull/291))

## [0.4.19](https://github.com/DiVotek/tbtop/releases/tag/v0.4.19) — 2026-09-01

### Fixes

- **charts:** render static data ([#289](https://github.com/DiVotek/tbtop/pull/289))

## [0.4.18](https://github.com/DiVotek/tbtop/releases/tag/v0.4.18) — 2026-08-31

### Fixes

- **select:** scroll dropdowns by wheel inside modals ([#287](https://github.com/DiVotek/tbtop/pull/287))

## [0.4.16](https://github.com/DiVotek/tbtop/releases/tag/v0.4.16) — 2026-08-27

### Features

- **table:** pass the row to Column::formatUsing ([#284](https://github.com/DiVotek/tbtop/pull/284))

## [0.4.14](https://github.com/DiVotek/tbtop/releases/tag/v0.4.14) — 2026-08-25

### Documentation

- **ai:** generate API reference from docblocks and fix drifted prose ([#277](https://github.com/DiVotek/tbtop/pull/277))

## [0.4.10](https://github.com/DiVotek/tbtop/releases/tag/v0.4.10) — 2026-08-24

### Features

- **media:** add reorderable picker

### Fixes

- **uploads:** drop imagedestroy() calls deprecated in PHP 8.5 ([#253](https://github.com/DiVotek/tbtop/pull/253))
- **media:** fail closed when DNS pinning for a remote fetch is unavailable ([#261](https://github.com/DiVotek/tbtop/pull/261))
- **commands:** reject page names that are not valid class identifiers ([#262](https://github.com/DiVotek/tbtop/pull/262))
- CurrentPanel is registered as a persistent container instance rather than request-scoped state ([#263](https://github.com/DiVotek/tbtop/pull/263))
- **uploads:** keep the original upload when image conversion or its write fails ([#268](https://github.com/DiVotek/tbtop/pull/268))
- Cell-save and row-reorder handlers capture a stale action context ([#254](https://github.com/DiVotek/tbtop/pull/254))
- URL-template values are inserted without percent-encoding ([#255](https://github.com/DiVotek/tbtop/pull/255))
- A pending search debounce can undo folder-navigation search reset ([#256](https://github.com/DiVotek/tbtop/pull/256))
- Unknown custom action handlers silently report success ([#258](https://github.com/DiVotek/tbtop/pull/258))
- Column search inputs do not reflect externally reset or replaced search values ([#259](https://github.com/DiVotek/tbtop/pull/259))
- Editable cells retain stale local state when the row prop changes ([#260](https://github.com/DiVotek/tbtop/pull/260))
- **client:** translate built-in UI labels ([#272](https://github.com/DiVotek/tbtop/pull/272))
- **media:** preserve unresolved previews on reorder

### Documentation

- **media:** document reorderable picker

## [0.4.9](https://github.com/DiVotek/tbtop/releases/tag/v0.4.9) — 2026-08-20

### Features

- **media:** persist image dimensions for originals and conversion variants ([#249](https://github.com/DiVotek/tbtop/pull/249))
- **media:** configurable format and quality for conversion variants ([#250](https://github.com/DiVotek/tbtop/pull/250))
- **install:** admin:install publishes the host wiring ([#215](https://github.com/DiVotek/tbtop/pull/215))

### Fixes

- **client:** preserve nested repeater paths ([#224](https://github.com/DiVotek/tbtop/pull/224))
- **client:** reset media detail state on selection ([#226](https://github.com/DiVotek/tbtop/pull/226))
- **client:** ignore stale editable-cell saves ([#227](https://github.com/DiVotek/tbtop/pull/227))
- **client:** ignore stale row reorder responses ([#228](https://github.com/DiVotek/tbtop/pull/228))
- **client:** flush richtext changes before submit ([#229](https://github.com/DiVotek/tbtop/pull/229))
- **client:** preserve text after slash commands ([#234](https://github.com/DiVotek/tbtop/pull/234))
- **client:** reconcile removed tab values ([#237](https://github.com/DiVotek/tbtop/pull/237))
- **client:** preserve inline text spacing ([#241](https://github.com/DiVotek/tbtop/pull/241))
- **client:** isolate table URL-state clearing ([#243](https://github.com/DiVotek/tbtop/pull/243))
- **client:** enforce integer pagination values ([#244](https://github.com/DiVotek/tbtop/pull/244))
- **client:** preserve URL fragments in table state ([#245](https://github.com/DiVotek/tbtop/pull/245))
- **client:** reset state when table names change ([#246](https://github.com/DiVotek/tbtop/pull/246))
- **client:** preserve Enter submission with disabled buttons ([#247](https://github.com/DiVotek/tbtop/pull/247))
- **client:** surface unexpected schema errors ([#248](https://github.com/DiVotek/tbtop/pull/248))
- **client:** serialize notification mutations ([#239](https://github.com/DiVotek/tbtop/pull/239))
- **client:** preserve builtin registrations ([#238](https://github.com/DiVotek/tbtop/pull/238))
- **client:** coordinate multiple dirty-form guards ([#235](https://github.com/DiVotek/tbtop/pull/235))
- **client:** focus the confirm button when a confirm dialog opens ([#251](https://github.com/DiVotek/tbtop/pull/251))
- **client:** respect disabled creatable selects ([#223](https://github.com/DiVotek/tbtop/pull/223))

## [0.4.8](https://github.com/DiVotek/tbtop/releases/tag/v0.4.8) — 2026-08-19

### Fixes

- **validation:** implicit rules and in-constraint on multiple fields ([#232](https://github.com/DiVotek/tbtop/pull/232))

## [0.4.7](https://github.com/DiVotek/tbtop/releases/tag/v0.4.7) — 2026-08-19

### Fixes

- **client:** preserve existing media selections ([#222](https://github.com/DiVotek/tbtop/pull/222))
- **client:** keep halted confirmed actions open ([#221](https://github.com/DiVotek/tbtop/pull/221))
- **effects:** deliver refreshTable to tables outside the effect's React context ([#230](https://github.com/DiVotek/tbtop/pull/230))

## [0.4.6](https://github.com/DiVotek/tbtop/releases/tag/v0.4.6) — 2026-08-19

### Fixes

- **validation:** handle translatable field errors ([#218](https://github.com/DiVotek/tbtop/pull/218))
- **validation:** collect client constraints inside tabs and repeater rows ([#220](https://github.com/DiVotek/tbtop/pull/220))

## [0.4.5](https://github.com/DiVotek/tbtop/releases/tag/v0.4.5) — 2026-08-18

### Fixes

- **validation:** return action errors by field name ([#216](https://github.com/DiVotek/tbtop/pull/216))

## [0.4.4](https://github.com/DiVotek/tbtop/releases/tag/v0.4.4) — 2026-08-18

### Features

- **tabs:** add named URL state ([#210](https://github.com/DiVotek/tbtop/pull/210))
- **client:** native beforeunload prompt for dirty forms ([#211](https://github.com/DiVotek/tbtop/pull/211))
- **actions:** withoutValidation() — form rules as a schema filter, not a gate ([#214](https://github.com/DiVotek/tbtop/pull/214))
- **forms:** setFormData effect — server-computed values into the open form ([#213](https://github.com/DiVotek/tbtop/pull/213))

### Fixes

- **fields:** refresh disabled ranges after late mount ([#209](https://github.com/DiVotek/tbtop/pull/209))
- **client:** open Revola modals as configured — centered animation + slide-over/size wire-through ([#208](https://github.com/DiVotek/tbtop/pull/208))
- **validation:** apply rules to nested action forms ([#212](https://github.com/DiVotek/tbtop/pull/212))

## [0.4.3](https://github.com/DiVotek/tbtop/releases/tag/v0.4.3) — 2026-08-12

### Fixes

- **fields:** keep a saved child value when the record hydrates late (0.4.3) ([#207](https://github.com/DiVotek/tbtop/pull/207))

## [0.4.2](https://github.com/DiVotek/tbtop/releases/tag/v0.4.2) — 2026-08-12

### Features

- **liveregion:** actions in region content + stale initial-deps detection ([#204](https://github.com/DiVotek/tbtop/pull/204))
- **client:** form-aware custom blocks via useNearestFormController ([#205](https://github.com/DiVotek/tbtop/pull/205))
- **fields:** deps-driven disabled ranges on daterange ([#206](https://github.com/DiVotek/tbtop/pull/206))

## [0.4.1](https://github.com/DiVotek/tbtop/releases/tag/v0.4.1) — 2026-08-12

### Features

- **fields:** add input prefixes and suffixes

### Fixes

- **client:** preserve same-page redirect state
- **fields:** disable input affix interactions
- **fields:** reject a field nested in an input affix

## [0.4.0](https://github.com/DiVotek/tbtop/releases/tag/v0.4.0) — 2026-08-12

### Features

- **deps:** resolve dotted dependencies through translatable locale maps

### Fixes

- **client:** detect translatable fields inside tabs blocks

## [0.3.0](https://github.com/DiVotek/tbtop/releases/tag/v0.3.0) — 2026-08-11

### Features

- **liveregion:** server re-rendered region on form dependency change ([#197](https://github.com/DiVotek/tbtop/pull/197))

### Fixes

- **table:** ignore filter params on tables that declare no filters ([#191](https://github.com/DiVotek/tbtop/pull/191))
- **contracts:** mirror haltModal and copyToClipboard in the effects grammar ([#193](https://github.com/DiVotek/tbtop/pull/193))
- **dsl:** resolve when() at the lookup instead of in every controller ([#195](https://github.com/DiVotek/tbtop/pull/195))
- **relation:** send the typed search and share the async-select protocol ([#196](https://github.com/DiVotek/tbtop/pull/196))

### Documentation

- **core:** replace the scaffold readme and add license, contributing, security ([#194](https://github.com/DiVotek/tbtop/pull/194))

## [0.2.41](https://github.com/DiVotek/tbtop/releases/tag/v0.2.41) — 2026-08-10

### Features

- **daterange:** localize the calendar through Intl ([#170](https://github.com/DiVotek/tbtop/pull/170))
- **fields:** let a registered kind materialize its own endpoints ([#173](https://github.com/DiVotek/tbtop/pull/173))

### Fixes

- **select:** mark the selected option and anchor the multiselect dropdown ([#167](https://github.com/DiVotek/tbtop/pull/167))
- **select:** show the multiselect empty message only when the list is empty ([#168](https://github.com/DiVotek/tbtop/pull/168))
- **dsl:** annotate daterange on S and guard the annotations with a test ([#169](https://github.com/DiVotek/tbtop/pull/169))
- **uploads:** close the svg and text/html gap in the upload field ([#172](https://github.com/DiVotek/tbtop/pull/172))
- **uploads:** reject unparseable SVGs instead of silently emptying them ([#175](https://github.com/DiVotek/tbtop/pull/175))
- **layout:** respect gap and class on stack and row ([#178](https://github.com/DiVotek/tbtop/pull/178))
- **layout:** give center-layout pages the same provider tree as shell pages ([#179](https://github.com/DiVotek/tbtop/pull/179))
- **table:** reconcile persisted column visibility with current columns ([#180](https://github.com/DiVotek/tbtop/pull/180))
- **dsl:** collect rules from sub-fields attached under either child key ([#181](https://github.com/DiVotek/tbtop/pull/181))
- **actions:** escape row values in visit action url templates ([#183](https://github.com/DiVotek/tbtop/pull/183))
- **upload:** honor disabled on remove and reorder controls ([#184](https://github.com/DiVotek/tbtop/pull/184))
- **select:** stop shredding multi-character ids in async multi-select ([#182](https://github.com/DiVotek/tbtop/pull/182))
- **composer:** declare svg-sanitize on the published root manifest ([#185](https://github.com/DiVotek/tbtop/pull/185))
- **field:** connect error and helper text to the control as aria-describedby ([#187](https://github.com/DiVotek/tbtop/pull/187))
- **actions:** validate an action's form payload server-side ([#186](https://github.com/DiVotek/tbtop/pull/186))
- **actions:** admit newTab on a visit spec across the wire contract ([#188](https://github.com/DiVotek/tbtop/pull/188))
- **select:** keep resolved chips visible while the next load is in flight ([#189](https://github.com/DiVotek/tbtop/pull/189))

## [0.2.40](https://github.com/DiVotek/tbtop/releases/tag/v0.2.40) — 2026-08-06

### Features

- **time:** add public shadcn-style time picker ([#165](https://github.com/DiVotek/tbtop/pull/165))
- **daterange:** replace native inputs with a shadcn range calendar ([#164](https://github.com/DiVotek/tbtop/pull/164))

### Fixes

- **select:** send the typed search to the async single select ([#166](https://github.com/DiVotek/tbtop/pull/166))

## [0.2.39](https://github.com/DiVotek/tbtop/releases/tag/v0.2.39) — 2026-08-04

### Features

- **dsl:** add when() and guard the endpoints it hides (M-120) ([#156](https://github.com/DiVotek/tbtop/pull/156))

### Fixes

- **table:** align filter toolbar controls ([#163](https://github.com/DiVotek/tbtop/pull/163))

## [0.2.38](https://github.com/DiVotek/tbtop/releases/tag/v0.2.38) — 2026-08-04

### Features

- **client:** open the block-registry reset and Button to consumers ([#152](https://github.com/DiVotek/tbtop/pull/152))
- **select:** make query() serve real dynamic options (M-140) ([#153](https://github.com/DiVotek/tbtop/pull/153))
- **client:** publish the ui primitives as public surface ([#154](https://github.com/DiVotek/tbtop/pull/154))
- **select:** render image, subtitle and html in options ([#160](https://github.com/DiVotek/tbtop/pull/160))
- **richtext:** allow custom Suspense fallback for lazy wrappers ([#158](https://github.com/DiVotek/tbtop/pull/158))

### Fixes

- **relation:** make the search cap configurable and unify storage keys (M-137) ([#149](https://github.com/DiVotek/tbtop/pull/149))
- **i18n:** cascade translatable() on a repeater to its sub-fields ([#150](https://github.com/DiVotek/tbtop/pull/150))
- **client:** keep materialize failures inside the error boundary ([#151](https://github.com/DiVotek/tbtop/pull/151))
- **php:** restore layout node column placement ([#157](https://github.com/DiVotek/tbtop/pull/157))
- **table:** reuse the cell formatter for group header labels ([#159](https://github.com/DiVotek/tbtop/pull/159))

## [0.2.37](https://github.com/DiVotek/tbtop/releases/tag/v0.2.37) — 2026-07-30

### Features

- **table:** no-wrap column option ([#133](https://github.com/DiVotek/tbtop/pull/133))

### Fixes

- **table:** stack pagination controls on narrow viewports ([#131](https://github.com/DiVotek/tbtop/pull/131))
- **fields:** align select and slug fields with the shared Input ([#132](https://github.com/DiVotek/tbtop/pull/132))
- **fields:** give tags and multi-select the shared input metrics ([#135](https://github.com/DiVotek/tbtop/pull/135))
- **table:** render row selection through the shared Checkbox ([#136](https://github.com/DiVotek/tbtop/pull/136))
- **fields:** apply ->default() to form records ([#137](https://github.com/DiVotek/tbtop/pull/137))
- **fields:** stop the relation field re-resolving known labels ([#138](https://github.com/DiVotek/tbtop/pull/138))
- **fields:** resolve translatable labelKey in relation search ([#139](https://github.com/DiVotek/tbtop/pull/139))
- **fields:** mark invalid controls and honour the input font rule ([#140](https://github.com/DiVotek/tbtop/pull/140))
- **table:** make sortable headers keyboard-operable and unify chrome buttons ([#141](https://github.com/DiVotek/tbtop/pull/141))
- **nav:** rebuild the profile menu on the shared dropdown ([#142](https://github.com/DiVotek/tbtop/pull/142))
- **nav:** align the topbar row and even out its control heights ([#143](https://github.com/DiVotek/tbtop/pull/143))
- **ui:** replace hardcoded Tailwind values with theme tokens ([#144](https://github.com/DiVotek/tbtop/pull/144))
- **richtext:** align the editor with the admin design system ([#146](https://github.com/DiVotek/tbtop/pull/146))
- **i18n:** translate client chrome and media library (M-136) ([#147](https://github.com/DiVotek/tbtop/pull/147))

### media

- centralize the upload size ceiling ([#145](https://github.com/DiVotek/tbtop/pull/145))

## [0.2.35](https://github.com/DiVotek/tbtop/releases/tag/v0.2.35) — 2026-07-27

### Fixes

- **client:** render rounded image shape distinctly from square ([#108](https://github.com/DiVotek/tbtop/pull/108))
- **dsl:** strip synthetic attributes before editable-column save ([#128](https://github.com/DiVotek/tbtop/pull/128))

## [0.2.34](https://github.com/DiVotek/tbtop/releases/tag/v0.2.34) — 2026-07-23

### Features

- **dsl:** step option for NumberField across DSL, client, and schema ([#117](https://github.com/DiVotek/tbtop/pull/117))
- **client:** render per-page document titles via Inertia Head ([#118](https://github.com/DiVotek/tbtop/pull/118))

### Fixes

- **dsl:** section() rejects unknown option keys with a did-you-mean hint ([#119](https://github.com/DiVotek/tbtop/pull/119))
- **dsl:** layout builders reject unknown option keys ([#122](https://github.com/DiVotek/tbtop/pull/122))
- **media:** closed picker modal no longer fires eager media requests ([#123](https://github.com/DiVotek/tbtop/pull/123))
- **demo:** repair browser smoke tests, wire admin logout route ([#124](https://github.com/DiVotek/tbtop/pull/124))
- **panels:** keep the panel root redirect serializable for route:cache ([#125](https://github.com/DiVotek/tbtop/pull/125))

## [0.2.33](https://github.com/DiVotek/tbtop/releases/tag/v0.2.33) — 2026-07-21

### Features

- **dsl:** per-row column tooltips via tooltip(Closure), shadcn rendering ([#112](https://github.com/DiVotek/tbtop/pull/112))

### Fixes

- **notifications:** edge-flush slide-over + aligned action links ([#110](https://github.com/DiVotek/tbtop/pull/110))
- **client:** center modal entrance animation ([#106](https://github.com/DiVotek/tbtop/pull/106))

## [0.2.32](https://github.com/DiVotek/tbtop/releases/tag/v0.2.32) — 2026-07-17

### Features

- **repeater:** translatable sub-fields with per-locale rendering and summary fallback ([#101](https://github.com/DiVotek/tbtop/pull/101))
- **forms:** action field-error channel + tab error visibility ([#102](https://github.com/DiVotek/tbtop/pull/102))
- **admin:** multiline display, repeater field errors, clipboard effect, chrome gates, media error feedback ([#104](https://github.com/DiVotek/tbtop/pull/104))

### Fixes

- **fields:** slug field starts in manual mode over any pre-existing slug ([#100](https://github.com/DiVotek/tbtop/pull/100))
- **admin:** iconMap string entry, table search hydration, action i18n ([#103](https://github.com/DiVotek/tbtop/pull/103))

## [0.2.31](https://github.com/DiVotek/tbtop/releases/tag/v0.2.31) — 2026-07-16

### Fixes

- **admin:** CMS audit admin batch — media migration, DSL i18n, inline checkbox ([#99](https://github.com/DiVotek/tbtop/pull/99))

## [0.2.30](https://github.com/DiVotek/tbtop/releases/tag/v0.2.30) — 2026-07-14

### Features

- **repeater:** collapsible summary rows + prove nested repeaters ([#98](https://github.com/DiVotek/tbtop/pull/98))

## [0.2.29](https://github.com/DiVotek/tbtop/releases/tag/v0.2.29) — 2026-07-14

### Features

- **chrome:** userMenu locales option + shell-level theme apply ([#97](https://github.com/DiVotek/tbtop/pull/97))

## [0.2.28](https://github.com/DiVotek/tbtop/releases/tag/v0.2.28) — 2026-07-14

### Features

- **nav:** closure labels for NavItem + form resync fix ([#96](https://github.com/DiVotek/tbtop/pull/96))

## [0.2.27](https://github.com/DiVotek/tbtop/releases/tag/v0.2.27) — 2026-07-14

### Fixes

- **inertia:** strip trailing slash from page basePath ([#94](https://github.com/DiVotek/tbtop/pull/94))

## [0.2.26](https://github.com/DiVotek/tbtop/releases/tag/v0.2.26) — 2026-07-13

### Fixes

- **media:** normalize API ids to strings so picker previews hydrate ([#93](https://github.com/DiVotek/tbtop/pull/93))

## [0.2.25](https://github.com/DiVotek/tbtop/releases/tag/v0.2.25) — 2026-07-13

### Features

- **media:** inline and preview variants for the media picker field ([#92](https://github.com/DiVotek/tbtop/pull/92))

## [0.2.24](https://github.com/DiVotek/tbtop/releases/tag/v0.2.24) — 2026-07-13

### Fixes

- **client:** post logout to the panel-prefixed endpoint ([#90](https://github.com/DiVotek/tbtop/pull/90))
- **client:** hide the page-header chrome on center-layout pages ([#91](https://github.com/DiVotek/tbtop/pull/91))

## [0.2.23](https://github.com/DiVotek/tbtop/releases/tag/v0.2.23) — 2026-07-13

### Fixes

- **client:** visible boolean icons, in-app unsaved guard, dirty-state fix, preflight i18n ([#89](https://github.com/DiVotek/tbtop/pull/89))

## [0.2.22](https://github.com/DiVotek/tbtop/releases/tag/v0.2.22) — 2026-07-13

### Features

- **admin:** validation attribute labels, text placeholders, built-in action i18n ([#87](https://github.com/DiVotek/tbtop/pull/87))

### Fixes

- **i18n:** prefer the server-resolved locale over a stale stored preference ([#86](https://github.com/DiVotek/tbtop/pull/86))

## [0.2.21](https://github.com/DiVotek/tbtop/releases/tag/v0.2.21) — 2026-07-10

### Features

- **dsl:** layout visual primitives — class escape hatch, flex card, grid gap, padded card sections ([#85](https://github.com/DiVotek/tbtop/pull/85))

## [0.2.20](https://github.com/DiVotek/tbtop/releases/tag/v0.2.20) — 2026-07-10

### Fixes

- form-submit dirty-guard, Cyrillic slugify, translatable slug locale ([#84](https://github.com/DiVotek/tbtop/pull/84))

## [0.2.19](https://github.com/DiVotek/tbtop/releases/tag/v0.2.19) — 2026-07-10

### Fixes

- forms/actions batch — tab data loss, header-action 404, silent validation, dirty-guard redirect ([#83](https://github.com/DiVotek/tbtop/pull/83))

## [0.2.18](https://github.com/DiVotek/tbtop/releases/tag/v0.2.18) — 2026-07-09

### Features

- **table:** Column::emphasized() primary link-style cell text ([#82](https://github.com/DiVotek/tbtop/pull/82))

## [0.2.17](https://github.com/DiVotek/tbtop/releases/tag/v0.2.17) — 2026-07-09

### Features

- **table:** link columns, toolbar toggles, auto-hide pagination, tab subtitles, page error boundary ([#81](https://github.com/DiVotek/tbtop/pull/81))

## [0.2.16](https://github.com/DiVotek/tbtop/releases/tag/v0.2.16) — 2026-07-09

### Fixes

- **dashboard:** pin the admin topbar to the viewport ([#80](https://github.com/DiVotek/tbtop/pull/80))

## [0.2.15](https://github.com/DiVotek/tbtop/releases/tag/v0.2.15) — 2026-07-09

### Fixes

- **dashboard:** StatCard reference sizing, icon resolver, pinned sidebar ([#79](https://github.com/DiVotek/tbtop/pull/79))

## [0.2.14](https://github.com/DiVotek/tbtop/releases/tag/v0.2.14) — 2026-07-09

### Features

- **dashboard:** list block, card sections, live polling widgets ([#76](https://github.com/DiVotek/tbtop/pull/76))

### Fixes

- **dashboard:** stabilize no-poll chart test on slow runners ([#77](https://github.com/DiVotek/tbtop/pull/77))
- **dashboard:** cap fake-timer windows in polling tests ([#78](https://github.com/DiVotek/tbtop/pull/78))

## [0.2.13](https://github.com/DiVotek/tbtop/releases/tag/v0.2.13) — 2026-07-09

### Features

- **dashboard:** widget variants for dashboard pages ([#75](https://github.com/DiVotek/tbtop/pull/75))

## [0.2.12](https://github.com/DiVotek/tbtop/releases/tag/v0.2.12) — 2026-07-09

### Fixes

- **ui:** compact button text size and group label tracking ([#71](https://github.com/DiVotek/tbtop/pull/71))
- **shell:** respect appearance maxWidth in page content, link logo to panel home ([#72](https://github.com/DiVotek/tbtop/pull/72))
- **routing:** redirect panel prefix root to its first page ([#73](https://github.com/DiVotek/tbtop/pull/73))

## [0.2.11](https://github.com/DiVotek/tbtop/releases/tag/v0.2.11) — 2026-07-08

### Features

- **panel:** compact density variant, page subtitle, token polish ([#69](https://github.com/DiVotek/tbtop/pull/69))

### Fixes

- **nav:** stable group key for react reconciliation and locale-switcher contract ([#68](https://github.com/DiVotek/tbtop/pull/68))
- **ci:** pin npm to 11.18.0 in release workflow ([#70](https://github.com/DiVotek/tbtop/pull/70))

## [0.2.10](https://github.com/DiVotek/tbtop/releases/tag/v0.2.10) — 2026-07-08

### Features

- **nav:** collapsible sidebar rail, stable group keys, locale dropdown ([#66](https://github.com/DiVotek/tbtop/pull/66))

## [0.2.9](https://github.com/DiVotek/tbtop/releases/tag/v0.2.9) — 2026-07-08

### Features

- **chrome:** topbar+sidebar layout, action badges, notifications slide-over ([#64](https://github.com/DiVotek/tbtop/pull/64))

## [0.2.8](https://github.com/DiVotek/tbtop/releases/tag/v0.2.8) — 2026-07-06

### Features

- **theme:** shadcn-preset theming + panel appearance knobs ([#54](https://github.com/DiVotek/tbtop/pull/54))
- **dsl:** color column kind with square/rounded/circular shapes ([#55](https://github.com/DiVotek/tbtop/pull/55))
- **dsl:** copyable trait and input masks ([#56](https://github.com/DiVotek/tbtop/pull/56))
- **fields:** add dependent relation fields ([#58](https://github.com/DiVotek/tbtop/pull/58))
- **palette:** add Cmd+K command palette ([#59](https://github.com/DiVotek/tbtop/pull/59))
- **nav:** nested navigation, custom items, and user menu ([#60](https://github.com/DiVotek/tbtop/pull/60))
- **dsl:** action trigger polish — authorize, slide-over, Create/View presets, halt ([#61](https://github.com/DiVotek/tbtop/pull/61))
- **dsl:** form layout polish — section, grid breakpoints, columns, radio ([#62](https://github.com/DiVotek/tbtop/pull/62))
- **table:** table polish — defer filters, grouping, per-column search ([#63](https://github.com/DiVotek/tbtop/pull/63))

### Fixes

- **fields:** resolve async relation label for int FK values ([#57](https://github.com/DiVotek/tbtop/pull/57))

## [0.2.7](https://github.com/DiVotek/tbtop/releases/tag/v0.2.7) — 2026-06-24

### Fixes

- **table:** resolve dotted relation columns on Eloquent projection path ([#52](https://github.com/DiVotek/tbtop/pull/52))

## [0.2.6](https://github.com/DiVotek/tbtop/releases/tag/v0.2.6) — 2026-06-24

### Features

- **nav:** add icon, badge, and collapsible-group support to the sidebar ([#48](https://github.com/DiVotek/tbtop/pull/48))
- **panels:** optional topbar navigation layout ([#49](https://github.com/DiVotek/tbtop/pull/49))
- **dsl:** Tier A Filament-parity polish ([#50](https://github.com/DiVotek/tbtop/pull/50))
- **notifications:** database notifications center with header bell ([#51](https://github.com/DiVotek/tbtop/pull/51))

## [0.2.5](https://github.com/DiVotek/tbtop/releases/tag/v0.2.5) — 2026-06-23

### Features

- **fields:** multi-file upload with drag-to-reorder support ([#40](https://github.com/DiVotek/tbtop/pull/40))
- **dsl:** universal icon and tooltip traits for actions, stats, and tabs ([#41](https://github.com/DiVotek/tbtop/pull/41))
- **dsl:** image column kind with square/circular shape variants ([#43](https://github.com/DiVotek/tbtop/pull/43))

### Fixes

- **forms:** submit DSL form on Enter keypress ([#45](https://github.com/DiVotek/tbtop/pull/45))
- **fields:** use safeUuid for repeater/keyvalue row ids in insecure contexts ([#46](https://github.com/DiVotek/tbtop/pull/46))

## [0.2.4](https://github.com/DiVotek/tbtop/releases/tag/v0.2.4) — 2026-06-22

### Fixes

- **fields:** select shows created label and standard value color ([#37](https://github.com/DiVotek/tbtop/pull/37))
- **uploads:** private upload on parametrised pages + list/comma accept ([#38](https://github.com/DiVotek/tbtop/pull/38))

## [0.2.3](https://github.com/DiVotek/tbtop/releases/tag/v0.2.3) — 2026-06-22

### Features

- **table:** drag-and-drop row reordering with persistence (M-94)
- **fields:** add CheckboxList, ToggleButtons, Slider field kinds (M-89)
- **actions:** prebuilt CRUD action helpers + modal query schema fix (M-92)
- **table:** soft-delete macro with trashed filter + restore/forceDelete actions (M-91)
- **blocks:** read-only display primitives (value/image/richtext/keyvalue) (M-96)
- **fields:** fluent validation rule helpers via traits ([#34](https://github.com/DiVotek/tbtop/pull/34))

### Fixes

- **table:** source rows from reorder state only when reorder is active
- **testing:** stop mock.module Link pollution dropping data-testid, re-enable client Test gate (M-95)
- **fields:** make kindMap completeness guard a subset check, not equality
- **fields:** fire slider onBlur on focus loss, not on value commit
- **charts:** bind chart/sparkline colors to theme tokens for dark mode (M-90)
- **table:** bulk-restore color + reconcile soft-delete docs
- **blocks:** correct money assertion in record-detail browser test
- **table:** translatable columns survive serialization for Spatie HasTranslations models ([#35](https://github.com/DiVotek/tbtop/pull/35))

### Documentation

- **fields:** reconcile canonical field-kind inventory + parity completeness guard (M-93)
- **fields:** describe parity guard as a subset check, not set-equality

## [0.2.2](https://github.com/DiVotek/tbtop/releases/tag/v0.2.2) — 2026-06-19

### Features

- **auth:** add OTP field for 2FA code entry ([#15](https://github.com/DiVotek/tbtop/pull/15))
- **table:** conditional action visibility + agnostic modal data query ([#17](https://github.com/DiVotek/tbtop/pull/17))
- **upload:** page-scoped inline-config upload + private-disk signed previews ([#19](https://github.com/DiVotek/tbtop/pull/19))
- **media:** unified files library for a document CRM ([#16](https://github.com/DiVotek/tbtop/pull/16))

### Fixes

- **release:** upgrade npm for OIDC and publish before tagging ([#18](https://github.com/DiVotek/tbtop/pull/18))
- **release:** add repository url so npm provenance verifies ([#21](https://github.com/DiVotek/tbtop/pull/21))

## [0.2.1](https://github.com/DiVotek/tbtop/releases/tag/v0.2.1) — 2026-06-17

### Features

- **fields:** multi-select with combobox UI and creatable ([#8](https://github.com/DiVotek/tbtop/pull/8))
- **table:** editable columns — toggle and text-input inline cell editing ([#9](https://github.com/DiVotek/tbtop/pull/9))
- **auth:** per-page middleware override + DSL auth pages inside the panel ([#12](https://github.com/DiVotek/tbtop/pull/12))

### Fixes

- **validation:** size arrays by item count, not stringified length ([#7](https://github.com/DiVotek/tbtop/pull/7))
- **release:** set git identity before creating the annotated tag ([#14](https://github.com/DiVotek/tbtop/pull/14))

## [0.2.0](https://github.com/DiVotek/tbtop/releases/tag/v0.2.0) — 2026-06-15

### Features

- **inertia:** PHP DSL core + HTTP layer, demo + package scaffolds
- **inertia:** table + chart data endpoints, client render-layer port
- **inertia:** walking skeleton e2e green - materializer + AdminPage
- **inertia:** admin shell - persistent layout, nav shared props, auth user
- **inertia:** wire-grammar contract pipeline
- **inertia:** upload module + demo backbone + DSL gap fixes
- **inertia:** declarative table cells by field kind + nested 422 lifting
- **inertia:** demo acceptance complete - media, nav, session auth
- **inertia:** richtext field kind with lexical editor
- **inertia:** admin UI i18n with session locale switcher
- **inertia:** translatable field modifier with form-level locale tabs
- **inertia:** declared params for chart/data endpoints
- **inertia:** condition AST for hiddenIf/disabledIf
- **inertia:** repeater-scoped conditions and disabled threading
- **inertia:** disabled threading for tags and keyvalue fields
- **inertia:** class-based field DSL with open kind registry
- **inertia:** page gates with role-filtered nav
- **inertia:** admin auth with totp 2fa and passkeys
- **inertia:** table filters, search and column visibility
- **inertia:** searchable selects with create-on-the-fly
- **inertia:** layout nodes, admin shell upgrades and bundle split
- **inertia:** passkey management ui and auth response renames
- **form:** PHP guardUnsaved DSL, config key, and i18n strings
- **form:** unsaved-changes guard and scroll-to-first-error on submit
- **table:** Column DSL class + Color enum + ColumnProjection pipeline
- **contracts:** add column properties + pagination to wire schema
- **demo:** migrate PostsIndexPage to Column DSL showcase
- **nav:** breadcrumbs as page chrome
- **table:** client table core — pagination, sort, keep-previous-data, empty state, select-all, new column kinds, i18n
- **table:** add table i18n keys to PHP lang files (en + uk)
- **action:** actionGroup->as('dropdown'|'buttons') + table rowClick PHP DSL
- **ui:** add Radix DropdownMenu wrapper + happy-dom pointer-capture polyfill
- **action:** visit-template interpolation from row context
- **action:** actionGroup as=dropdown renders via Radix DropdownMenu
- **table:** rowClick — row click triggers named row action
- **media:** client media library renderer for mediaLibrary kind
- **media:** SsrfGuard, models, migrations, MediaResource, config and i18n
- **media:** HTTP endpoints, MediaLibraryPage, and pest test suite
- **media:** MediaPicker field DSL + GET /media/{id} endpoint + lang sync
- **media:** media picker field + folder dialogs + contract nodes
- **media:** demo — cover_media_id migration + media field in post form
- **media:** load package migrations without publish, idempotent up()
- **media:** broaden default accept to docs, text, archives, av
- **ui:** modal-shell + confirm-dialog composition over revola
- **demo:** enable rowClick edit on the posts table
- **schema:** stat widgets and static display blocks
- **panels:** multi-panel core, chrome DSL, layouts and feature wave ([#1](https://github.com/DiVotek/tbtop/pull/1))
- **admin:** async relation field and generic in filter ([#2](https://github.com/DiVotek/tbtop/pull/2))

### Fixes

- **inertia:** demo bug sweep - slug, selects, uploads, grid, table cells
- **inertia:** project translatable table columns to default content locale
- **inertia:** enforce page gates on action, form and data endpoints
- **inertia:** table filters refetch via xhr with url-persisted state
- **inertia:** qa bug sweep - slug prefill, searchable select, responsive dialog, rating, locale menu
- **form:** wire unsaved_guard config default into form serialization
- **unsaved-guard:** skip POST/non-GET Inertia visits in router.on('before')
- **table-filters:** seed filterValues UI state from URL-persisted queryParams.filters
- **i18n:** replace :count Laravel placeholders with {count} in PHP lang files
- **i18n:** add missing nav.language key to defaultMessages and PHP lang files
- **table:** skip rowClick when event.target is detached from DOM
- **fields:** cast select/radio option values to strings on wire
- **media:** move media API under {prefix}/api/media and wire baseUrl into ClientProvider
- **test:** unleak inertia module mock and assert root view by name
- **media:** scope apiBase to media client, unbreak absolute-path queries
- **fields:** coerce int record values to strings in select controls
- **form:** drop mount-time writebacks that falsely dirtied untouched forms
- **effects:** deliver form effects via Inertia native flash
- **ui:** restore modal padding, shared z-layer and scrollable body
- **ui:** default radix select content to popper positioning
- **media:** unnest the folder-row button from the menu trigger
- **table:** apply filter values synchronously, debounce only the refetch
- **table:** rowClick ignores events bubbling from portalled row modals
- **translatable:** normalize legacy scalar record values to locale maps
- **client:** resolve bun types and base tsconfig path post-extraction

### Documentation

- **inertia:** prototype mini-docs - DSL, actions, forms, contract, gates
- **roadmap:** inertia release roadmap and package CLAUDE.md
- **repo:** translate README to English, add English-only docs rule
- **ai:** agent-facing authoring guide for the DSL + client ([#4](https://github.com/DiVotek/tbtop/pull/4))
