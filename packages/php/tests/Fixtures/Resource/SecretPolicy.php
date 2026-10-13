<?php

namespace Tbtop\Admin\Tests\Fixtures\Resource;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;

/** Lets everyone in, except to a record titled or named "Secret". */
class SecretPolicy
{
    public function viewAny(Authenticatable $user): bool
    {
        return true;
    }

    public function create(Authenticatable $user): bool
    {
        return true;
    }

    public function view(Authenticatable $user, Model $record): bool
    {
        return ! $this->secret($record);
    }

    public function update(Authenticatable $user, Model $record): bool
    {
        return ! $this->secret($record);
    }

    public function delete(Authenticatable $user, Model $record): bool
    {
        return ! $this->secret($record);
    }

    public function restore(Authenticatable $user, Model $record): bool
    {
        return ! $this->secret($record);
    }

    public function forceDelete(Authenticatable $user, Model $record): bool
    {
        return ! $this->secret($record);
    }

    private function secret(Model $record): bool
    {
        return in_array('Secret', [$record->getAttribute('title'), $record->getAttribute('name')], true);
    }
}
