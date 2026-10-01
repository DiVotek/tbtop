<?php

namespace Tbtop\Admin\Dsl;

use LogicException;
use Tbtop\Admin\Dsl\Fields\Daterange;
use Tbtop\Admin\Dsl\Fields\Field;
use Tbtop\Admin\Dsl\Fields\Relation;
use Tbtop\Admin\Dsl\Fields\Richtext;
use Tbtop\Admin\Dsl\Fields\Select;
use Tbtop\Admin\Dsl\Fields\Upload;

/**
 * The field endpoints (select options/create, relation search, upload,
 * daterange ranges) resolve a field by class and bare name through
 * StructureWalk::find(), which also reaches the fields inside a richtext's
 * embeds. A field there that shares its class and name with another field of
 * the form would silently answer with the other one's closure and config, so
 * the form refuses to build instead.
 */
final class EmbedFieldCollisions
{
    /** Field classes an endpoint looks up by name. */
    private const RESOLVED_BY_NAME = [Relation::class, Select::class, Upload::class, Daterange::class];

    /** @param  list<mixed>  $children  A form's included children. */
    public static function assertNone(array $children): void
    {
        $formFields = self::fieldsUnder($children);
        $owners = [];
        foreach ($formFields as $field) {
            $key = self::key($field);
            if ($key !== null) {
                $owners[$key] = 'the form';
            }
        }
        foreach ($formFields as $field) {
            if ($field instanceof Richtext) {
                self::claimEmbedFields($field, $owners);
            }
        }
    }

    /** @param  array<string, string>  $owners  Lookup key => who already answers it. */
    private static function claimEmbedFields(Richtext $richtext, array &$owners): void
    {
        foreach ($richtext->getEmbeds() as $embed) {
            foreach (self::fieldsUnder($embed->includedFields()) as $inner) {
                $key = self::key($inner);
                if ($key !== null && isset($owners[$key])) {
                    throw new LogicException(
                        "Field \"{$inner->name}\" in embed \"{$embed->kind}\" of richtext \"{$richtext->name}\" shares its name with a field of {$owners[$key]}; the field endpoints resolve by name, so rename one.",
                    );
                }
                if ($key !== null) {
                    $owners[$key] = "embed \"{$embed->kind}\"";
                }
            }
        }
    }

    /**
     * @param  list<mixed>  $children
     * @return list<Field>
     */
    private static function fieldsUnder(array $children): array
    {
        $out = [];
        foreach ($children as $child) {
            foreach (StructureWalk::collect($child, static fn (mixed $c): bool => $c instanceof Field) as $field) {
                if ($field instanceof Field) {
                    $out[] = $field;
                }
            }
        }

        return $out;
    }

    private static function key(Field $field): ?string
    {
        foreach (self::RESOLVED_BY_NAME as $class) {
            if ($field instanceof $class) {
                return "{$class}:{$field->name}";
            }
        }

        return null;
    }
}
