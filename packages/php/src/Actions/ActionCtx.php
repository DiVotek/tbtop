<?php

namespace Tbtop\Admin\Actions;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;

final class ActionCtx
{
    /**
     * @param  array<string, mixed>  $form  Form data when the action declared needs: ['form'].
     * @param  list<int|string>  $selection  Selected row ids when needs: ['selection'].
     * @param  array<string, mixed>  $row  Row payload when needs: ['row'].
     * @param  array<string, string>  $params  Route params of the page the action lives on.
     */
    public function __construct(
        public readonly Request $request,
        public readonly ?Authenticatable $user,
        public readonly array $form = [],
        public readonly array $selection = [],
        public readonly array $row = [],
        public readonly array $params = [],
    ) {}

    public static function fromRequest(Request $request): self
    {
        $payload = $request->input('payload', []);
        $payload = is_array($payload) ? $payload : [];

        return new self(
            request: $request,
            user: $request->user(),
            form: self::arrayOf($payload, 'form'),
            selection: array_values(self::arrayOf($payload, 'selection')),
            row: self::arrayOf($payload, 'row'),
            params: self::arrayOf($payload, 'params'),
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int|string, mixed>
     */
    private static function arrayOf(array $payload, string $key): array
    {
        $value = $payload[$key] ?? [];

        return is_array($value) ? $value : [];
    }
}
