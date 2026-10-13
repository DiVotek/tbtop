<?php

namespace Tbtop\Admin\Commands\Resource;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Every name a generated resource derives from its model: the page folder and
 * namespace, the URL path, the route parameter and the human labels.
 *
 * @internal
 */
final class ResourceNames
{
    /** Short names the stubs import themselves, plus the sibling pages. */
    public const STUB_IMPORTS = [
        'ActionCtx', 'Effects', 'Field', 'CreateAction', 'DeleteAction', 'EditAction', 'FormActions', 'RecordAction',
        'Column', 'Node', 'S', 'Page', 'Gate', 'IndexPage', 'CreatePage', 'EditPage', 'ViewPage',
    ];

    public readonly string $model;

    /** What the generated code calls the model: its short name, or `{Model}Model` when that clashes with a stub import. */
    public readonly string $alias;

    public readonly string $folder;

    public readonly string $var;

    public readonly string $path;

    public readonly string $label;

    public readonly string $plural;

    /** @param  class-string<Model>  $modelClass */
    public function __construct(public readonly string $modelClass, public readonly string $appNamespace)
    {
        $this->model = class_basename($modelClass);
        $this->alias = in_array($this->model, self::STUB_IMPORTS, true) ? $this->model.'Model' : $this->model;
        $this->folder = Str::pluralStudly($this->model);
        $this->var = Str::camel($this->model);
        $this->path = Str::kebab($this->folder);
        $this->label = Str::headline($this->model);
        $this->plural = Str::headline($this->folder);
    }

    public function namespace(): string
    {
        return rtrim($this->appNamespace, '\\').'\\Admin\\Pages\\'.$this->folder;
    }

    public function trait(): string
    {
        return $this->model.'FormFields';
    }

    /** @return array<string, string> placeholder => value, shared by every stub */
    public function replacements(): array
    {
        return [
            '{{ namespace }}' => $this->namespace(),
            '{{ modelClass }}' => $this->alias === $this->model ? $this->modelClass : "{$this->modelClass} as {$this->alias}",
            '{{ model }}' => $this->alias,
            '{{ var }}' => $this->var,
            '{{ path }}' => $this->path,
            '{{ slug }}' => $this->path,
            '{{ trait }}' => $this->trait(),
            '{{ label }}' => $this->label,
            '{{ labelLower }}' => Str::lower($this->label),
            '{{ plural }}' => $this->plural,
            '{{ pluralLower }}' => Str::lower($this->plural),
        ];
    }
}
