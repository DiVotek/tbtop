<?php

namespace Tbtop\Admin\Testing;

use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Assert;
use Tbtop\Admin\Pages\Page;

/**
 * One visited page and the endpoint calls made from it: the state every
 * tester narrowed from a PageTester shares.
 *
 * @internal
 */
final class PageVisit
{
    public readonly Client $http;

    public readonly string $url;

    public readonly TestResponse $response;

    /**
     * @param  class-string<Page>  $page
     * @param  array<string, mixed>  $params
     */
    public function __construct(public readonly string $page, array $params, ?string $panel)
    {
        $this->http = new Client;
        $this->url = $page::url($params, $panel);
        $this->response = $this->http->visit($this->url);
    }

    public function endpoint(string $endpoint, ?string $name = null): string
    {
        $segment = Endpoints::SEGMENTS[$endpoint] ?? null;
        if ($segment === null) {
            Assert::fail("Unknown endpoint [{$endpoint}]. Known: ".implode(', ', array_keys(Endpoints::SEGMENTS)).'.');
        }
        $base = rtrim($this->url, '/')."/{$segment}";

        return $name === null ? $base : "{$base}/{$name}";
    }

    /** @return array<string, mixed> */
    public function props(): array
    {
        $status = $this->response->getStatusCode();
        if ($status !== 200) {
            Assert::fail("Page [{$this->page}] responded {$status}, so it has no structure to check.");
        }
        $props = $this->response->json('props');

        return is_array($props) ? $props : [];
    }

    /**
     * The body and the header actions.
     *
     * @return array<int, mixed>
     */
    public function trees(): array
    {
        $props = $this->props();

        return [$props['structure'] ?? [], $props['headerActions'] ?? []];
    }

    /**
     * The record a form was prefilled with.
     *
     * @return array<string, mixed>
     */
    public function record(?string $form): array
    {
        $data = $form === null ? [] : $this->props()['data'][$form] ?? [];

        return is_array($data) ? $data : [];
    }

    /**
     * Field name → label: the attribute validation messages render.
     *
     * @return array<string, string>
     */
    public function labels(?string $form): array
    {
        if ($form === null || $this->response->getStatusCode() !== 200) {
            return [];
        }
        $labels = [];
        foreach (Wire::fields($this->trees()) as $entry) {
            $label = $entry['node']['options']['label'] ?? null;
            if ($entry['form'] === $form && is_string($label)) {
                $labels[(string) $entry['node']['name']] = $label;
            }
        }

        return $labels;
    }

    /** @return list<string> */
    public function fieldNames(string $form): array
    {
        $entries = array_filter(Wire::fields($this->trees()), static fn (array $e): bool => $e['form'] === $form);

        return array_values(array_unique(array_map(static fn (array $e): string => (string) $e['node']['name'], $entries)));
    }

    /**
     * @param  array<mixed>|null  $tree  where to look; the whole page when null
     * @return array{node: array<string, mixed>, form: ?string, modal: ?string}
     */
    public function action(string $name, ?array $tree = null): array
    {
        if ($this->response->getStatusCode() !== 200) {
            return self::blind('action', $name);
        }
        $tree ??= $this->trees();
        $found = Wire::named($tree, 'action', $name);
        if ($found === []) {
            Assert::fail($this->missing('Action', $name, Wire::ofKind($tree, 'action')));
        }

        return $found[0];
    }

    /**
     * A stand-in node for a page that did not render: the call still goes to
     * the endpoint, so a test can assert the gate refuses it there too.
     *
     * @return array{node: array<string, mixed>, form: null, modal: null}
     */
    public static function blind(string $kind, string $name): array
    {
        $spec = ['type' => 'server', 'needs' => ['form', 'row', 'selection']];

        return ['node' => ['kind' => $kind, 'name' => $name, 'options' => $kind === 'action' ? ['spec' => $spec] : [], 'meta' => []], 'form' => null, 'modal' => null];
    }

    /** @return array<string, mixed> */
    public function field(string $name): array
    {
        $found = Wire::fields($this->trees(), $name);
        if ($found === []) {
            Assert::fail($this->missing('Field', $name, Wire::fields($this->trees())));
        }

        return $found[0];
    }

    /** @param  list<array{node: array<string, mixed>, form: ?string, modal: ?string}>  $present */
    public function missing(string $what, string $name, array $present): string
    {
        $plural = strtolower($what).'s';

        return "{$what} [{$name}] is not on page [{$this->page}]: hidden, excluded or unknown. On the page: {$plural} ".Wire::nameList($present).'.';
    }

    /**
     * Run an action node the way a click does.
     *
     * @param  array{node: array<string, mixed>, form: ?string, modal: ?string}  $entry
     * @param  array<string, mixed>  $form
     * @param  array<string, mixed>  $row
     * @param  list<int|string>  $selection
     */
    public function run(array $entry, array $form, array $row, array $selection): Result
    {
        $node = $entry['node'];
        $name = (string) $node['name'];
        $spec = $node['options']['spec'] ?? [];

        return match ($spec['type'] ?? null) {
            'server' => $this->post($name, $spec['needs'] ?? [], [...$this->record($entry['form']), ...$form], $row, $selection, $entry['form']),
            'modal' => $this->open($node, $row, $selection)->fill($form)->submit(),
            'submit' => $this->submitAction($name, $spec['form'] ?? $entry['form'])->fill($form)->submit(),
            default => Assert::fail("Action [{$name}] is a [".($spec['type'] ?? '?').'] action and makes no server call.'),
        };
    }

    /**
     * POST an action endpoint with the payload the client builds.
     *
     * @param  list<string>  $needs
     * @param  array<string, mixed>  $form
     * @param  array<string, mixed>  $row
     * @param  list<int|string>  $selection
     */
    public function post(string $name, array $needs, array $form, array $row, array $selection, ?string $formName): Result
    {
        $payload = array_filter([
            'form' => in_array('form', $needs, true) ? $form : null,
            'row' => $row === [] ? null : $row,
            'selection' => $selection === [] && ! in_array('selection', $needs, true) ? null : $selection,
        ], static fn ($v): bool => $v !== null);
        $response = $this->http->action($this->endpoint('action', $name), $payload);
        $errors = $response->getStatusCode() === 422 ? (array) ($response->json('errors') ?? []) : [];
        $effects = $response->isOk() ? (array) ($response->json('effects') ?? []) : [];

        return new Result($response, array_values($effects), $errors, "Action [{$name}]", $this->labels($formName));
    }

    /**
     * Submit a form the way Inertia does: a post, then back to the page with
     * flashed effects or session errors.
     *
     * @param  array<string, mixed>  $data
     */
    public function submit(string $form, array $data): Result
    {
        $response = $this->http->submit($this->endpoint('form', $form), $data, $this->url);
        $location = $response->isRedirect() ? (string) $response->headers->get('Location') : null;
        $back = $location !== null && url($location) === url($this->url);
        $errors = $back ? $this->http->sessionErrors() : [];
        $effects = $back && $errors === [] ? $this->http->flashedEffects($response) : [];

        return new Result($response, $effects, $errors, "Form [{$form}]", $this->labels($form), $back ? null : $location);
    }

    /**
     * Open a modal action: run its query() when it has one.
     *
     * @param  array<string, mixed>  $node
     * @param  array<string, mixed>  $row
     * @param  list<int|string>  $selection
     */
    public function open(array $node, array $row, array $selection): ModalTester
    {
        $name = (string) $node['name'];
        $spec = $node['options']['spec'] ?? [];
        if (($spec['type'] ?? null) !== 'modal') {
            Assert::fail("Action [{$name}] is not a modal.");
        }
        $body = is_array($spec['body'] ?? null) ? $spec['body'] : [];
        $form = Wire::ofKind([$body], 'form')[0]['node']['name'] ?? null;
        $form = is_string($form) ? $form : null;
        $data = $this->record($form);
        $response = null;
        if (($spec['query'] ?? false) === true) {
            $response = $this->http->action($this->endpoint('action', $name).'/data', array_filter(['row' => $row, 'selection' => $selection]));
            $loaded = $response->isOk() ? $response->json('data') : null;
            $data = is_array($loaded) ? $loaded : $data;
        }

        return new ModalTester($this, $name, $body, $form, $data, $row, $selection, $response);
    }

    private function submitAction(string $action, mixed $form): FormTester
    {
        if (! is_string($form)) {
            Assert::fail("Submit action [{$action}] sits in no form.");
        }

        return new FormTester($this, $form, $this->record($form));
    }
}
