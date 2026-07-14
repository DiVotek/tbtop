<?php

namespace Tbtop\Admin\Dsl;

use InvalidArgumentException;
use Tbtop\Admin\Dsl\Fields\Boolean;
use Tbtop\Admin\Dsl\Fields\Checkbox;
use Tbtop\Admin\Dsl\Fields\CheckboxList;
use Tbtop\Admin\Dsl\Fields\Colorpicker;
use Tbtop\Admin\Dsl\Fields\Date;
use Tbtop\Admin\Dsl\Fields\Daterange;
use Tbtop\Admin\Dsl\Fields\Datetime;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\InFilter;
use Tbtop\Admin\Dsl\Fields\Keyvalue;
use Tbtop\Admin\Dsl\Fields\MediaPicker;
use Tbtop\Admin\Dsl\Fields\Number;
use Tbtop\Admin\Dsl\Fields\Otp;
use Tbtop\Admin\Dsl\Fields\Password;
use Tbtop\Admin\Dsl\Fields\Radio;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\Dsl\Fields\Repeater;
use Tbtop\Admin\Dsl\Fields\Richtext;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Slider;
use Tbtop\Admin\Dsl\Fields\Slug;
use Tbtop\Admin\Dsl\Fields\Tags;
use Tbtop\Admin\Dsl\Fields\Text;
use Tbtop\Admin\Dsl\Fields\Textarea;
use Tbtop\Admin\Dsl\Fields\ToggleButtons;
use Tbtop\Admin\Dsl\Fields\Upload;

/**
 * Structure DSL entry — mirrors the client `s.*` builders; collects request-scoped form/action registries.
 *
 * @method Text text(string $name)
 * @method Textarea textarea(string $name)
 * @method Password password(string $name)
 * @method Otp otp(string $name)
 * @method Number number(string $name)
 * @method Date date(string $name)
 * @method Datetime datetime(string $name)
 * @method \Tbtop\Admin\Dsl\Fields\Boolean boolean(string $name)
 * @method Select select(string $name)
 * @method Radio radio(string $name)
 * @method Tags tags(string $name)
 * @method Checkbox checkbox(string $name)
 * @method Colorpicker colorpicker(string $name)
 * @method Keyvalue keyvalue(string $name)
 * @method Slug slug(string $name)
 * @method Upload upload(string $name)
 * @method MediaPicker media(string $name)
 * @method Relation relation(string $name)
 * @method Repeater repeater(string $name)
 * @method Richtext richtext(string $name)
 * @method CheckboxList checkboxlist(string $name)
 * @method ToggleButtons togglebuttons(string $name)
 * @method Slider slider(string $name)
 */
final class S
{
    /** @var array<string, class-string<Field>> */
    private static array $kindMap = [];

    /**
     * Built-in kind identifiers, exposed for test datasets.
     *
     * @var list<string>
     */
    public const BUILT_IN_KINDS = [
        'text', 'textarea', 'password', 'otp', 'number', 'date', 'datetime', 'boolean',
        'select', 'radio', 'tags', 'in', 'checkbox', 'colorpicker', 'keyvalue',
        'slug', 'upload', 'media', 'relation', 'repeater', 'richtext', 'daterange',
        'checkboxlist', 'togglebuttons', 'slider',
    ];

    /** @var array<string, FormBuilder> */
    private array $forms = [];

    /** @var array<string, ActionBuilder> */
    private array $actions = [];

    /** @var array<string, TableBuilder> */
    private array $tables = [];

    /** @var array<string, ChartBuilder> */
    private array $charts = [];

    /** @var array<string, Stat> */
    private array $stats = [];

    // -------------------------------------------------------------------------
    // Registry
    // -------------------------------------------------------------------------

    /**
     * Register (or override) a custom field kind.
     * $fieldClass must extend Field.
     *
     * @param  class-string  $fieldClass
     */
    public static function register(string $kind, string $fieldClass): void
    {
        if (! is_subclass_of($fieldClass, Field::class)) {
            throw new InvalidArgumentException(
                "Cannot register \"{$fieldClass}\" for kind \"{$kind}\": class must extend ".Field::class.'.',
            );
        }
        self::kindMap()[$kind] = $fieldClass;
    }

    /** Instantiate a field by kind string — used by __call and parity tests. */
    public static function makeField(string $kind, string $name): Field
    {
        $map = self::kindMap();
        if (! isset($map[$kind])) {
            throw new InvalidArgumentException("Unknown field kind \"{$kind}\".");
        }

        return $map[$kind]::make($name);
    }

    /**
     * Snapshot of the bootstrapped kind→class map (built-ins plus any
     * registered overrides). Read-only copy — parity tests assert its keys
     * against BUILT_IN_KINDS so the two PHP lists cannot silently drift.
     *
     * @return array<string, class-string<Field>>
     */
    public static function builtInKindClasses(): array
    {
        return self::kindMap();
    }

    // -------------------------------------------------------------------------
    // Magic dispatch
    // -------------------------------------------------------------------------

    /** @param  list<mixed>  $args */
    public function __call(string $kind, array $args): Field
    {
        $name = $args[0] ?? null;
        if (! is_string($name)) {
            throw new InvalidArgumentException("Field \"{$kind}\" needs a name as first argument.");
        }

        return self::makeField($kind, $name);
    }

    /** Generic multi-value IN filter: fixed option list, applies WHERE col IN (...). */
    public function inFilter(string $name): InFilter
    {
        return InFilter::make($name);
    }

    // -------------------------------------------------------------------------
    // Layout builders
    // -------------------------------------------------------------------------

    /** @param  list<mixed>  $children @param  array<string, mixed>  $opts */
    public function stack(array $children, array $opts = []): Node
    {
        return self::layout('stack', $children, $opts);
    }

    /** @param  list<mixed>  $children @param  array<string, mixed>  $opts */
    public function row(array $children, array $opts = []): Node
    {
        return self::layout('row', $children, $opts);
    }

    /**
     * Flex layout node with explicit direction and optional alignment options.
     *
     * @param  list<mixed>  $children
     * @param  'row'|'col'  $direction
     * @param  'start'|'center'|'end'|'between'|'around'|'evenly'|null  $justify
     * @param  'start'|'center'|'end'|'stretch'|'baseline'|null  $align
     * @param  'card'|null  $variant  'card' renders a compact bordered toolbar strip
     * @param  string|null  $class  Extra Tailwind classes merged onto the root element
     */
    public function flex(
        array $children,
        string $direction = 'row',
        ?string $justify = null,
        ?string $align = null,
        ?int $gap = null,
        bool $wrap = false,
        ?string $variant = null,
        ?string $class = null,
    ): Node {
        FlexValidator::direction($direction);
        if ($justify !== null) {
            FlexValidator::justify($justify);
        }
        if ($align !== null) {
            FlexValidator::align($align);
        }
        if ($gap !== null) {
            FlexValidator::gap($gap);
        }
        if ($variant !== null) {
            FlexValidator::variant($variant);
        }

        $opts = ['direction' => $direction, 'children' => $children];
        if ($justify !== null) {
            $opts['justify'] = $justify;
        }
        if ($align !== null) {
            $opts['align'] = $align;
        }
        if ($gap !== null) {
            $opts['gap'] = $gap;
        }
        if ($wrap) {
            $opts['wrap'] = true;
        }
        if ($variant !== null) {
            $opts['variant'] = $variant;
        }
        if ($class !== null) {
            $opts['class'] = $class;
        }

        return new Node('flex', $opts);
    }

    /**
     * Grid layout. `cols` accepts an int (1-8, back-compat: single column
     * below md) or a breakpoint object {sm?, md?, lg?, xl?} (each 1-8).
     * `gap` (0-12, default 4) reuses the flex gap-N scale. `class` merges
     * extra Tailwind classes onto the root element.
     *
     * @param  array{cols?: int|array<string, int>, gap?: int, class?: string}  $opts
     * @param  list<mixed>  $children
     */
    public function grid(array $opts, array $children): Node
    {
        if (isset($opts['cols'])) {
            ColumnsValidator::validate($opts['cols'], 'grid cols');
        }
        if (isset($opts['gap'])) {
            FlexValidator::gap((int) $opts['gap'], 'grid gap');
        }

        return self::layout('grid', $children, $opts);
    }

    /**
     * Card section. Accepted $opts keys: 'title', 'description' (muted text
     * under the title), 'icon' (string name or {name, position}), 'aside'
     * (a child node rendered as a right-side column on wide screens),
     * 'collapsible' (bool, default false), 'collapsed' (bool, only relevant
     * when collapsible), 'columns' (int|breakpoint-object — lays out the
     * section's children in a grid instead of a stack), 'action'
     * (['label' => string, 'url' => string] — a quiet link rendered right-aligned
     * in the header row, e.g. "Open pages"), 'variant' ('card'|'plain' — 'card'
     * wraps the section in a bordered card with an inline header; 'plain' renders
     * the title as an uppercase muted label. Omitted = current stack render),
     * 'class' (extra Tailwind classes merged onto the section's root element).
     *
     * @param  array<string, mixed>  $opts
     * @param  list<mixed>  $children
     */
    public function section(array $opts, array $children): Node
    {
        if (isset($opts['columns'])) {
            ColumnsValidator::validate($opts['columns'], 'section columns');
        }
        if (isset($opts['icon'])) {
            $opts['icon'] = self::normalizeIcon($opts['icon']);
        }
        if (isset($opts['action'])) {
            $opts['action'] = self::normalizeSectionAction($opts['action']);
        }
        if (isset($opts['variant'])) {
            $opts['variant'] = self::normalizeSectionVariant($opts['variant']);
        }

        return self::layout('section', $children, $opts);
    }

    private static function normalizeSectionVariant(mixed $variant): string
    {
        $allowed = ['card', 'plain'];
        if (! is_string($variant) || ! in_array($variant, $allowed, true)) {
            throw new InvalidArgumentException(
                "Invalid section variant \"{$variant}\". Allowed: ".implode(', ', $allowed).'.'
            );
        }

        return $variant;
    }

    /** @param  array<string, mixed>  $action @return array{label: string, url: string} */
    private static function normalizeSectionAction(array $action): array
    {
        if (! isset($action['label']) || ! isset($action['url'])) {
            throw new InvalidArgumentException(
                "section 'action' requires both 'label' and 'url' keys."
            );
        }

        return ['label' => (string) $action['label'], 'url' => (string) $action['url']];
    }

    /** @param  string|array{name: string, position?: string}  $icon @return array{name: string, position: string} */
    private static function normalizeIcon(string|array $icon): array
    {
        return is_array($icon)
            ? ['name' => $icon['name'], 'position' => $icon['position'] ?? 'left']
            : ['name' => $icon, 'position' => 'left'];
    }

    /**
     * Collapsible layout node: a section with a chevron toggle.
     * $opts must include 'label'; 'collapsed' defaults to false.
     *
     * @param  array<string, mixed>  $opts
     * @param  list<mixed>  $children
     */
    public function collapsible(array $opts, array $children): Node
    {
        $opts = array_merge(['collapsed' => false], $opts);

        return self::layout('collapsible', $children, $opts);
    }

    /**
     * Aside layout node: renders as a right-column sticky panel on wide screens.
     * $opts supports 'class' (extra Tailwind classes merged onto the root element).
     *
     * @param  list<mixed>  $children
     * @param  array{class?: string}  $opts
     */
    public function aside(array $children, array $opts = []): Node
    {
        return self::layout('aside', $children, $opts);
    }

    /**
     * Action-group node: a button group or dropdown containing multiple action items.
     *
     * @param  list<ActionBuilder>  $actions
     * @param  'buttons'|'dropdown'|null  $as  Render mode — null omits the key (client defaults to buttons).
     */
    public function actionGroup(string $label, array $actions, ?string $as = null): Node
    {
        $opts = ['label' => $label, 'children' => ActionBuilder::filterAuthorized($actions)];
        if ($as !== null) {
            $opts['as'] = $as;
        }

        return new Node('actionGroup', $opts);
    }

    /**
     * Explicit dropdown grouping — its actions render inside a menu (never inline),
     * even for a single action. Sugar over actionGroup(..., 'dropdown').
     *
     * @param  list<ActionBuilder>  $actions
     */
    public function dropdown(string $label, array $actions): Node
    {
        return $this->actionGroup($label, $actions, 'dropdown');
    }

    /**
     * Cascade ->translatable() onto every Field in $children (recursive).
     * A field that explicitly called ->translatable(false) is skipped.
     *
     * @param  list<mixed>  $children
     * @return list<mixed>
     */
    public static function cascadeTranslatable(array $children): array
    {
        return array_map(static function (mixed $child): mixed {
            if (($child instanceof Field)
                && ! $child->isTranslatableOptedOut()
                && ! $child->isTranslatableField()
            ) {
                return $child->translatable();
            }
            if ($child instanceof Node) {
                return $child->translatable();
            }

            return $child;
        }, $children);
    }

    public function displayText(string $content): TextBlock
    {
        return TextBlock::make($content);
    }

    public function displayHtml(string $rawHtml): HtmlBlock
    {
        return HtmlBlock::make($rawHtml);
    }

    /**
     * Markdown display block — converts markdown to HTML server-side and emits
     * a `displayHtml` wire node. Embedded HTML is stripped by default; call
     * ->allowHtml() on the returned block to pass it through.
     */
    public function markdown(string $content): MarkdownBlock
    {
        return MarkdownBlock::make($content);
    }

    public function displayDivider(): Node
    {
        return new Node('displayDivider');
    }

    public function displayAlert(string $message): AlertBlock
    {
        return AlertBlock::make($message);
    }

    /**
     * Read-only display of one value, formatted like a table column. The author
     * passes the value directly; chain a kind-sugar method (->badge / ->boolean
     * / ->icon / ->money / ->date / ->datetime / ->number) on the result.
     */
    public function displayValue(mixed $value): DisplayValueBlock
    {
        return DisplayValueBlock::make($value);
    }

    /**
     * Read-only full-size image (or file-download link via ->asLink()). The
     * author passes a URL they already hold; chain ->alt() / ->caption().
     */
    public function displayImage(string $src): DisplayImageBlock
    {
        return DisplayImageBlock::make($src);
    }

    /**
     * Read-only render of a stored Lexical SerializedEditorState map.
     *
     * @param  array<string, mixed>  $state
     */
    public function displayRichtext(array $state): DisplayRichtextBlock
    {
        return DisplayRichtextBlock::make($state);
    }

    /**
     * Read-only <dl> map render of key/value pairs.
     *
     * @param  array<string, mixed>  $map
     */
    public function displayKeyValue(array $map): DisplayKeyValueBlock
    {
        return DisplayKeyValueBlock::make($map);
    }

    /**
     * @param  list<array{label: string, body?: mixed, children?: list<mixed>, columns?: int|array<string, int>, icon?: string|array{name: string, position?: string}, badge?: string|int}>  $tabs  Each entry needs 'body' XOR 'children' ('columns' only applies with 'children')
     * @param  array<string, mixed>  $opts
     */
    public function tabs(array $tabs, array $opts = []): Node
    {
        [$options, $meta] = Meta::split($opts);
        $items = array_map(self::normalizeTab(...), $tabs);

        return new Node('tabs', [...$options, 'tabs' => $items], null, $meta);
    }

    /**
     * Normalize a form-tab entry to the wire shape. Either 'body' (a single
     * Node) or 'children' (a list, optionally laid out via 'columns') must
     * be given, not both.
     *
     * @param  array<string, mixed>  $tab
     * @return array<string, mixed>
     */
    private static function normalizeTab(array $tab): array
    {
        $out = ['label' => $tab['label'], 'body' => self::normalizeTabBody($tab)];
        if (isset($tab['icon'])) {
            $out['icon'] = self::normalizeIcon($tab['icon']);
        }
        if (isset($tab['badge'])) {
            $out['badge'] = (string) $tab['badge'];
        }

        return $out;
    }

    /** @param  array<string, mixed>  $tab */
    private static function normalizeTabBody(array $tab): mixed
    {
        if (isset($tab['body'])) {
            if (isset($tab['children']) || isset($tab['columns'])) {
                throw new InvalidArgumentException("Tab \"{$tab['label']}\" cannot combine 'body' with 'children'/'columns'.");
            }

            return $tab['body'];
        }
        if (! isset($tab['children'])) {
            throw new InvalidArgumentException("Tab \"{$tab['label']}\" needs either 'body' or 'children'.");
        }
        if (isset($tab['columns'])) {
            return (new self)->grid(['cols' => $tab['columns']], $tab['children']);
        }

        return (new self)->stack($tab['children']);
    }

    // -------------------------------------------------------------------------
    // Chrome blocks
    // -------------------------------------------------------------------------
    // Option-less by design: the client reads their data from shared props
    // (nav, auth user, locales, brand). Used by Chrome trees; pages may embed
    // them too, but the shell is their home.

    /** Sidebar navigation groups built from the panel pages. */
    public function navMenu(): Node
    {
        return new Node('navMenu');
    }

    /**
     * Profile dropdown: user identity, custom items, locale, logout.
     * Pass ['locales' => false] to hide the built-in language section
     * when the panel offers locale switching elsewhere.
     *
     * @param  array<string, mixed>  $opts
     */
    public function userMenu(array $opts = []): Node
    {
        return new Node('userMenu', $opts);
    }

    /** Panel brand text (falls back to the nav.title translation). */
    public function logo(): Node
    {
        return new Node('logo');
    }

    /**
     * Standalone UI-locale switcher; hidden when the panel has one locale.
     *
     * @param  'buttons'|'dropdown'|null  $variant  'buttons' (default) shows a
     *                                              button per locale; 'dropdown' collapses them into a single menu.
     */
    public function localeSwitcher(?string $variant = null): Node
    {
        return new Node('localeSwitcher', $variant !== null ? ['variant' => $variant] : []);
    }

    /** Flex spacer pushing the following siblings to the far edge. */
    public function spacer(): Node
    {
        return new Node('spacer');
    }

    /**
     * "Unsaved changes" indicator for the nearest enclosing form. Renders
     * nothing when that form is clean. $label overrides the default
     * translated text.
     */
    public function unsavedIndicator(?string $label = null): Node
    {
        return new Node('unsavedIndicator', $label !== null ? ['label' => $label] : []);
    }

    /** Header notifications bell: unread badge + polled dropdown list. */
    public function notifications(): Node
    {
        return new Node('notifications');
    }

    /** Standalone theme toggle; one click cycles light → dark → system. */
    public function themeToggle(): Node
    {
        return new Node('themeToggle');
    }

    // -------------------------------------------------------------------------
    // Data builders
    // -------------------------------------------------------------------------

    /** @param  list<mixed>  $children */
    public function form(string $name, array $children): FormBuilder
    {
        return $this->forms[$name] = new FormBuilder($name, $children);
    }

    public function table(string $name): TableBuilder
    {
        return $this->tables[$name] = new TableBuilder($name);
    }

    public function stat(string $label): Stat
    {
        return $this->stats[$label] = Stat::make($label);
    }

    /** Generic row list — "Recently updated pages" style widget. */
    public function list(string $name): ListBuilder
    {
        return ListBuilder::make($name);
    }

    /** @param  array<string, mixed>  $opts */
    public function chart(string $name, string $type, array $opts = []): ChartBuilder
    {
        return $this->charts[$name] = new ChartBuilder($name, $type, $opts);
    }

    public function action(string $name): ActionBuilder
    {
        return $this->actions[$name] = new ActionBuilder($name);
    }

    /**
     * @param  list<ActionBuilder>  $actions
     * @param  array{variant?: 'grid'}  $opts  'grid' lays the actions out as a
     *                                         responsive card grid instead of an inline row.
     */
    public function actionsRow(array $actions, array $opts = []): Node
    {
        $options = ['children' => ActionBuilder::filterAuthorized($actions)];
        if (isset($opts['variant'])) {
            $options['variant'] = self::normalizeRowVariant($opts['variant']);
        }

        return new Node('row', $options);
    }

    private static function normalizeRowVariant(mixed $variant): string
    {
        if ($variant !== 'grid') {
            throw new InvalidArgumentException(
                "Invalid actionsRow variant \"{$variant}\". Allowed: grid."
            );
        }

        return $variant;
    }

    // -------------------------------------------------------------------------
    // Collectors
    // -------------------------------------------------------------------------

    /** @return array<string, FormBuilder> */
    public function collectedForms(): array
    {
        return $this->forms;
    }

    /** @return array<string, ActionBuilder> */
    public function collectedActions(): array
    {
        return $this->actions;
    }

    /** @return array<string, TableBuilder> */
    public function collectedTables(): array
    {
        return $this->tables;
    }

    /** @return array<string, ChartBuilder> */
    public function collectedCharts(): array
    {
        return $this->charts;
    }

    /** @return array<string, Stat> */
    public function collectedStats(): array
    {
        return $this->stats;
    }

    /**
     * Find a Select field with a creatable closure by name, walking all registered forms.
     */
    public function findCreatableSelect(string $fieldName): ?Select
    {
        foreach ($this->forms as $form) {
            $found = $form->findCreatableSelect($fieldName);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    /**
     * Find a Relation field with a query closure by name, walking all registered forms.
     */
    public function findRelationField(string $fieldName): ?Relation
    {
        foreach ($this->forms as $form) {
            $found = $form->findRelationField($fieldName);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    /**
     * Find an Upload field by name, walking all registered forms.
     */
    public function findUploadField(string $fieldName): ?Upload
    {
        foreach ($this->forms as $form) {
            $found = $form->findUploadField($fieldName);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    // -------------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------------

    /** @param  list<mixed>  $children @param  array<string, mixed>  $opts */
    private static function layout(string $kind, array $children, array $opts): Node
    {
        [$options, $meta] = Meta::split($opts);

        return new Node($kind, [...$options, 'children' => $children], null, $meta);
    }

    /**
     * Returns the mutable kind→class map, bootstrapping the built-in entries
     * on first call.
     *
     * @return array<string, class-string<Field>>
     */
    private static function &kindMap(): array
    {
        if (self::$kindMap === []) {
            self::$kindMap = [
                'text' => Text::class,
                'textarea' => Textarea::class,
                'password' => Password::class,
                'otp' => Otp::class,
                'number' => Number::class,
                'date' => Date::class,
                'datetime' => Datetime::class,
                'boolean' => Boolean::class,
                'select' => Select::class,
                'radio' => Radio::class,
                'tags' => Tags::class,
                'in' => InFilter::class,
                'checkbox' => Checkbox::class,
                'colorpicker' => Colorpicker::class,
                'keyvalue' => Keyvalue::class,
                'slug' => Slug::class,
                'upload' => Upload::class,
                'media' => MediaPicker::class,
                'relation' => Relation::class,
                'repeater' => Repeater::class,
                'richtext' => Richtext::class,
                'daterange' => Daterange::class,
                'checkboxlist' => CheckboxList::class,
                'togglebuttons' => ToggleButtons::class,
                'slider' => Slider::class,
            ];
        }

        return self::$kindMap;
    }
}
