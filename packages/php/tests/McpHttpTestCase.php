<?php

namespace Tbtop\Admin\Tests;

use Illuminate\Foundation\Auth\User as AuthUser;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Testing\TestResponse;
use Laravel\Mcp\Server\McpServiceProvider;
use Tbtop\Admin\Tests\Fixtures\McpPage;
use Tbtop\Admin\Tests\Fixtures\Panels\McpPanel;

class McpHttpTestCase extends TestCase
{
    public static bool $pageAllowed = true;

    protected function getPackageProviders($app)
    {
        return [McpServiceProvider::class, ...parent::getPackageProviders($app)];
    }

    public function getEnvironmentSetUp($app): void
    {
        parent::getEnvironmentSetUp($app);
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('tbtop-admin.panels', [McpPanel::class]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        McpPage::$ran = [];
        self::$pageAllowed = true;
        Gate::define('view-mcp-page', fn (): bool => self::$pageAllowed);
        $this->actingAs(new AuthUser);

        Schema::create('items', function ($table): void {
            $table->id();
            $table->string('name');
        });
    }

    /**
     * A tools/call through the panel's MCP endpoint (legacy JSON-RPC body: no initialize needed).
     *
     * @param  array<string, mixed>  $arguments
     */
    public function callTool(string $tool, array $arguments = []): TestResponse
    {
        return $this->postJson('/admin/mcp', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'tools/call',
            'params' => ['name' => $tool, 'arguments' => (object) $arguments],
        ]);
    }

    /** @return array{isError: bool, text: string, json: mixed} */
    public function toolResult(TestResponse $response): array
    {
        $response->assertOk();
        $text = (string) $response->json('result.content.0.text');

        return [
            'isError' => (bool) $response->json('result.isError'),
            'text' => $text,
            'json' => json_decode($text, true),
        ];
    }
}
