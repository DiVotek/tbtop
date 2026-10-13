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
    public readonly string $model;

    public readonly string $folder;

    public readonly string $var;

    public readonly string $path;

    public readonly string $label;

    public readonly string $plural;

    /** @param  class-string<Model>  $modelClass */
    public function __construct(public readonly string $modelClass, public readonly string $appNamespace)
    {
        $this->model = class_basename($modelClass);
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
            '{{ modelClass }}' => $this->modelClass,
            '{{ model }}' => $this->model,
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
