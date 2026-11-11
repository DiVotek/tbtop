<?php

namespace Tbtop\Admin\Actions;

use Closure;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use LogicException;

final class ActionCtx
{
    /**
     * @param  array<string, mixed>  $form  Form data when the action declared needs: ['form'].
     * @param  list<int|string>  $selection  Selected row ids when needs: ['selection'].
     * @param  array<string, mixed>  $row  Row payload when needs: ['row'].
     * @param  array<string, string>  $params  Route params of the page the action lives on.
     * @param  bool  $allMatching  The user picked every row matching the table's filters, not just the checked ones.
     * @param  (Closure(): (EloquentBuilder|QueryBuilder))|null  $recordsQuery  Builds the query records() returns.
     */
    public function __construct(
        public readonly Request $request,
        public readonly ?Authenticatable $user,
        public readonly array $form = [],
        public readonly array $selection = [],
        public readonly array $row = [],
        public readonly array $params = [],
        public readonly bool $allMatching = false,
        private readonly ?Closure $recordsQuery = null,
    ) {}

    /** @param  array<string, string>  $routeParams Server-derived params; trusted over client payload. */
    public static function fromRequest(Request $request, array $routeParams = []): self
    {
        $payload = $request->input('payload', []);
        $payload = is_array($payload) ? $payload : [];

        return new self(
            request: $request,
            user: $request->user(),
            form: self::arrayOf($payload, 'form'),
            selection: array_values(self::arrayOf($payload, 'selection')),
            row: self::arrayOf($payload, 'row'),
            params: [...self::arrayOf($payload, 'params'), ...$routeParams],
        );
    }

    /**
     * The clicked row's record key, for whereKey()/find(). Reads `_key`, which
     * table rows always carry, so it stays the raw key when an `id` column is
     * formatted or the model is keyed otherwise; falls back to `id` for rows
     * from a custom endpoint. Null when the action did not declare needs: ['row'].
     */
    public function key(): int|string|null
    {
        $key = $this->row['_key'] ?? $this->row['id'] ?? null;

        return is_int($key) || is_string($key) ? $key : null;
    }

    /**
     * The selected records as a fresh query on the table's own query: the
     * checked keys, or — when $allMatching — every row the table's tab,
     * search and filters match. Use it over $selection for large selections:
     * `$ctx->records()->update([...])` runs as one statement. Only a bulk
     * action of a table has it.
     *
     * @throws LogicException outside a table's bulk actions
     */
    public function records(): EloquentBuilder|QueryBuilder
    {
        if ($this->recordsQuery === null) {
            throw new LogicException('ActionCtx::records() is only available to a table\'s bulk actions (needs: [\'selection\']).');
        }

        return ($this->recordsQuery)();
    }

    /**
     * The selection resolved against its table: the keys the action acts on
     * and the query records() returns.
     *
     * @param  list<int|string>  $selection
     * @param  Closure(): (EloquentBuilder|QueryBuilder)  $records
     */
    public function withRecords(array $selection, bool $allMatching, Closure $records): self
    {
        return new self(
            request: $this->request,
            user: $this->user,
            form: $this->form,
            selection: $selection,
            row: $this->row,
            params: $this->params,
            allMatching: $allMatching,
            recordsQuery: $records,
        );
    }

    /**
     * Replace the client-sent form with its validated counterpart. Null leaves
     * the payload untouched — the action declared no form to validate against,
     * so the handler validates it itself.
     *
     * @param  array<string, mixed>|null  $validated
     */
    public function withValidatedForm(?array $validated): self
    {
        if ($validated === null) {
            return $this;
        }

        return new self(
            request: $this->request,
            user: $this->user,
            form: $validated,
            selection: $this->selection,
            row: $this->row,
            params: $this->params,
            allMatching: $this->allMatching,
            recordsQuery: $this->recordsQuery,
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
