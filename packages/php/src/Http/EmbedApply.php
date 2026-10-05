<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tbtop\Admin\Actions\Effects;
use Tbtop\Admin\Dsl\S;

/**
 * The richtext embed modal's "Apply": validates `payload.form` against the
 * embed's own fields and returns the validated data. Embeds are not registered
 * actions, so they resolve through the page's forms, not S's action registry.
 */
final class EmbedApply
{
    /** Reserved action name; the field and kind travel in `payload.embed`. */
    public const ACTION = '__embed';

    public static function respond(Request $request, S $s): JsonResponse
    {
        $field = $request->input('payload.embed.field');
        $kind = $request->input('payload.embed.kind');
        $embed = is_string($field) && is_string($kind) ? $s->findEmbed($field, $kind) : null;
        if ($embed === null) {
            throw new NotFoundHttpException('No richtext on this page declares that embed.');
        }

        $input = $request->input('payload.form', []);
        $data = $embed->getValidator(is_array($input) ? $input : [])->validate();

        return response()->json(['effects' => Effects::make(), 'data' => $data]);
    }
}
