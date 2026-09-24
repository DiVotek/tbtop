<?php

namespace Tbtop\Admin\Mcp;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Session\Store;
use Inertia\Support\SessionKey;
use Tbtop\Admin\Http\ActionController;
use Tbtop\Admin\Http\FormSubmitController;
use Tbtop\Admin\Pages\Page;

/** Runs an action or an onSubmit form through its own controller (gate, reachability, validation). */
final class Execution
{
    /**
     * @param  class-string<Page>  $class
     * @param  array<string, string>  $params
     */
    public function __construct(
        private readonly PanelPages $pages,
        private readonly string $class,
        private readonly array $params,
    ) {}

    /**
     * @param  array<string, mixed>  $payload  form / row / selection
     * @return array{ok: true, effects: mixed}
     */
    public function action(string $name, array $payload): array
    {
        $response = RouteBoundRequest::run(
            $this->pages->routeName($this->class, '.action'),
            [...$this->params, 'tbtopAction' => $name],
            'POST',
            ['payload' => $payload],
            static fn ($request): JsonResponse => app(ActionController::class)($request),
        );

        return ['ok' => true, 'effects' => $response->getData(true)['effects'] ?? []];
    }

    /**
     * Effects arrive as the Inertia flash FormSubmitController sets; a handler
     * that returns a URL redirects instead and flashes nothing.
     *
     * @param  array<string, mixed>  $data
     * @return array{ok: true, effects?: mixed, redirect?: string}
     */
    public function form(string $name, array $data): array
    {
        $session = self::session();
        $session->forget(SessionKey::FLASH_DATA);

        $response = RouteBoundRequest::run(
            $this->pages->routeName($this->class, '.form'),
            [...$this->params, 'tbtopForm' => $name],
            'POST',
            $data,
            static fn ($request): RedirectResponse => app(FormSubmitController::class)($request),
        );

        $flash = $session->pull(SessionKey::FLASH_DATA, []);
        if (is_array($flash) && array_key_exists('tbtop.effects', $flash)) {
            return ['ok' => true, 'effects' => $flash['tbtop.effects']];
        }

        return ['ok' => true, 'redirect' => $response->getTargetUrl()];
    }

    /** The store Inertia::flash() writes to: session()'s default driver, started or not. */
    private static function session(): Store
    {
        /** @var Store */
        return app('session')->driver();
    }
}
