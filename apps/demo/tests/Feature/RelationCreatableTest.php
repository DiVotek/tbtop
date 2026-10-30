<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Country;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** relation()->creatable() on the dependent fields demo: Country by default, City through a closure. */
class RelationCreatableTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/admin/dependent-fields-demo/relation-create';

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_a_country_is_saved_from_the_mini_form(): void
    {
        $response = $this->postJson(self::BASE.'/country_id', ['name' => 'Atlantis']);

        $country = Country::query()->where('name', 'Atlantis')->firstOrFail();
        $response->assertOk()->assertExactJson(['value' => (string) $country->id, 'label' => 'Atlantis']);
    }

    public function test_a_duplicate_country_is_rejected(): void
    {
        Country::create(['name' => 'Atlantis']);

        $this->postJson(self::BASE.'/country_id', ['name' => 'Atlantis'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_a_city_lands_in_the_picked_country(): void
    {
        $country = Country::create(['name' => 'Atlantis']);

        $this->postJson(self::BASE.'/city_id', [
            'name' => 'Poseidonia',
            'deps' => ['country_id' => (string) $country->id],
        ])->assertOk()->assertJsonPath('label', 'Poseidonia');

        $this->assertSame($country->id, City::query()->where('name', 'Poseidonia')->value('country_id'));
    }

    public function test_a_city_without_a_country_is_rejected(): void
    {
        $this->postJson(self::BASE.'/city_id', ['name' => 'Nowhere'])->assertStatus(422);

        $this->assertFalse(City::query()->where('name', 'Nowhere')->exists());
    }

    public function test_a_city_in_an_unknown_country_is_rejected(): void
    {
        $this->postJson(self::BASE.'/city_id', ['name' => 'Nowhere', 'deps' => ['country_id' => '999']])
            ->assertStatus(422);

        $this->assertFalse(City::query()->where('name', 'Nowhere')->exists());
    }
}
