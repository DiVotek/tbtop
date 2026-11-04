<?php

namespace Tbtop\Admin\Testing;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Foundation\Testing\Concerns\MakesHttpRequests;
use Illuminate\Support\ViewErrorBag;
use Illuminate\Testing\TestResponse;
use Inertia\Inertia;

/**
 * The requests a tester sends, shaped the way the React client sends them:
 * Inertia visits for pages, a plain form post for submits, JSON for the rest.
 * Runs on the test's application, so actingAs() and the database carry over.
 *
 * @internal
 */
final class Client
{
    use MakesHttpRequests;

    /** @var Application */
    protected $app;

    public function __construct()
    {
        $this->app = app();
    }

    /**
     * An Inertia visit. The asset version is only known once the host's
     * Inertia middleware has run, so a 409 version conflict retries once.
     */
    public function visit(string $url): TestResponse
    {
        $response = $this->get($url, $this->inertiaHeaders());
        if ($response->getStatusCode() === 409) {
            $response = $this->get($url, $this->inertiaHeaders());
        }

        return $response;
    }

    /** @param  array<string, mixed>  $data */
    public function submit(string $url, array $data, string $from): TestResponse
    {
        return $this->from($from)->post($url, $data);
    }

    /** @param  array<string, mixed>  $payload */
    public function action(string $url, array $payload): TestResponse
    {
        return $this->postJson($url, ['payload' => $payload]);
    }

    /** @param  array<string, mixed>  $query */
    public function fetch(string $url, array $query = []): TestResponse
    {
        return $this->getJson($query === [] ? $url : $url.'?'.http_build_query($query));
    }

    /**
     * Messages the last form submit flashed into the session, per field.
     *
     * @return array<string, list<string>>
     */
    public function sessionErrors(): array
    {
        $bag = $this->app['session.store']->get('errors');

        return $bag instanceof ViewErrorBag ? $bag->getBag('default')->toArray() : [];
    }

    /**
     * Effects a form submit flashed for the page it redirected back to.
     *
     * @return list<array<string, mixed>>
     */
    public function flashedEffects(TestResponse $response): array
    {
        $effects = $response->baseRequest === null ? [] : Inertia::getFlashed($response->baseRequest)['tbtop.effects'] ?? [];

        return is_array($effects) ? array_values($effects) : [];
    }

    /** @return array<string, string> */
    private function inertiaHeaders(): array
    {
        return ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) Inertia::getVersion()];
    }
}
