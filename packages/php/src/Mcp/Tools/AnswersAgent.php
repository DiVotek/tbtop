<?php

namespace Tbtop\Admin\Mcp\Tools;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Laravel\Mcp\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Tbtop\Admin\Mcp\AgentError;

/**
 * Turns the outcomes an agent can act on into tool errors with a readable
 * message; anything else stays a 500 for laravel/mcp to report.
 */
trait AnswersAgent
{
    /** @param  Closure(): array<string, mixed>  $work */
    private function answer(Closure $work): Response
    {
        try {
            return Response::json($work());
        } catch (ValidationException $e) {
            return self::error('Validation failed; nothing was run.', ['errors' => $e->errors()]);
        } catch (AuthorizationException $e) {
            return self::error('Forbidden: '.$e->getMessage());
        } catch (ModelNotFoundException $e) {
            return self::error('Record not found: '.class_basename($e->getModel()).' '.implode(', ', $e->getIds()).'.');
        } catch (HttpExceptionInterface $e) {
            return self::error($e->getMessage() !== '' ? $e->getMessage() : "HTTP {$e->getStatusCode()}");
        } catch (AgentError $e) {
            return self::error($e->getMessage());
        }
    }

    /** Every tool error has one shape: {message, errors?}. @param  array<string, mixed>  $extra */
    private static function error(string $message, array $extra = []): Response
    {
        return Response::error((string) json_encode(
            ['message' => $message, ...$extra],
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE,
        ));
    }

    /** @return array<string, mixed> */
    private static function objectArg(mixed $value): array
    {
        return is_array($value) ? $value : [];
    }
}
