<?php

namespace Tbtop\Admin\Mcp\Tools;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\ValidationException;
use Laravel\Mcp\Response;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Tbtop\Admin\Mcp\AgentError;
use Throwable;

/**
 * Turns the outcomes an agent can act on into tool errors with a readable
 * message. Anything else — and any HTTP status >= 500 — is reported and
 * answered with a generic message, so exception text (SQL, paths) never
 * reaches the agent.
 */
trait AnswersAgent
{
    private const SERVER_ERROR = 'Server error; see the application log.';

    /** @param  Closure(): array<string, mixed>  $work */
    private function answer(Closure $work): Response
    {
        try {
            return Response::json($work());
        } catch (ValidationException $e) {
            return self::error('Validation failed; nothing was run.', ['errors' => $e->errors()]);
        } catch (AuthorizationException $e) {
            return self::error('Forbidden: '.$e->getMessage());
        } catch (AuthenticationException) {
            return self::error('Unauthenticated.');
        } catch (ModelNotFoundException $e) {
            $ids = implode(', ', $e->getIds());

            return self::error('Record not found: '.class_basename($e->getModel()).($ids === '' ? '' : ' '.$ids).'.');
        } catch (HttpResponseException $e) {
            return self::httpResponse($e);
        } catch (HttpExceptionInterface $e) {
            $status = $e->getStatusCode();

            return $status >= 500
                ? self::serverError($status, $e)
                : self::error($e->getMessage() !== '' ? $e->getMessage() : "HTTP {$status}");
        } catch (AgentError $e) {
            return self::error($e->getMessage());
        } catch (Throwable $e) {
            report($e);

            return self::error(self::SERVER_ERROR);
        }
    }

    /** A response thrown mid-request: its JSON `message` (or the status) below 500, the generic error above. */
    private static function httpResponse(HttpResponseException $e): Response
    {
        $response = $e->getResponse();
        $status = $response->getStatusCode();
        if ($status >= 500) {
            return self::serverError($status, $e);
        }
        $body = json_decode((string) $response->getContent(), true);
        $message = is_array($body) ? ($body['message'] ?? null) : null;

        return self::error(is_string($message) && $message !== '' ? $message : "HTTP {$status}");
    }

    /**
     * Laravel never reports HTTP exceptions (Handler::$internalDontReport), so
     * a wrapper carries the original to the log as its previous exception.
     */
    private static function serverError(int $status, Throwable $e): Response
    {
        report(new RuntimeException("MCP tool failed: HTTP {$status}", 0, $e));

        return self::error(self::SERVER_ERROR);
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
