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
     */
    public function flex(
        array $children,
        string $direction = 'row',
        ?string $justify = null,
        ?string $align = null,
        ?int $gap = null,
        bool $wrap = false,
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

        return new Node('flex', $opts);
    }

    /** @param  array<string, mixed>  $opts @param  list<mixed>  $children */
    public function grid(array $opts, array $children): Node
    {
        return self::layout('grid', $children, $opts);
    }

    /** @param  array<string, mixed>  $opts @param  list<mixed>  $children */
    public function section(array $opts, array $children): Node
    {
        return self::layout('section', $children, $opts);
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
     *
     * @param  list<mixed>  $children
     */
    public function aside(array $children): Node
    {
        return self::layout('aside', $children, []);
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
                $nested = $child->options['children'] ?? $child->options['fields'] ?? null;
                if (is_array($nested)) {
                    $key = isset($child->options['children']) ? 'children' : 'fields';
                    $newOpts = array_merge($child->options, [$key => self::cascadeTranslatable($nested)]);

                    return new Node($child->kind, $newOpts, $child->name, $child->meta);
                }
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

    /** @param  list<array{label: string, body: mixed, icon?: string|array{name: string, position?: string}, badge?: string|int}>  $tabs @param  array<string, mixed>  $opts */
    public function tabs(array $tabs, array $opts = []): Node
    {
        [$options, $meta] = Meta::split($opts);
        $items = array_map(self::normalizeTab(...), $tabs);

        return new Node('tabs', [...$options, 'tabs' => $items], null, $meta);
    }

    /**
     * Normalize a form-tab entry to the wire shape (string icon → {name, position}).
     *
     * @param  array<string, mixed>  $tab
     * @return array<string, mixed>
     */
    private static function normalizeTab(array $tab): array
    {
        $out = ['label' => $tab['label'], 'body' => $tab['body']];
        if (isset($tab['icon'])) {
            $icon = $tab['icon'];
            $out['icon'] = is_array($icon)
                ? ['name' => $icon['name'], 'position' => $icon['position'] ?? 'left']
                : ['name' => (string) $icon, 'position' => 'left'];
        }
        if (isset($tab['badge'])) {
            $out['badge'] = (string) $tab['badge'];
        }

        return $out;
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

    /** Profile dropdown: user identity, theme, locale, logout. */
    public function userMenu(): Node
    {
        return new Node('userMenu');
    }

    /** Panel brand text (falls back to the nav.title translation). */
    public function logo(): Node
    {
        return new Node('logo');
    }

    /** Standalone UI-locale switcher; hidden when the panel has one locale. */
    public function localeSwitcher(): Node
    {
        return new Node('localeSwitcher');
    }

    /** Flex spacer pushing the following siblings to the far edge. */
    public function spacer(): Node
    {
        return new Node('spacer');
    }

    /** Header notifications bell: unread badge + polled dropdown list. */
    public function notifications(): Node
    {
        return new Node('notifications');
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
        return Stat::make($label);
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

    /** @param  list<ActionBuilder>  $actions */
    public function actionsRow(array $actions): Node
    {
        return new Node('row', ['children' => ActionBuilder::filterAuthorized($actions)]);
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
