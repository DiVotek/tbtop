<?php

namespace Tbtop\Admin\Http;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Notifications\DatabaseNotification;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Read/mark/delete API for the authenticated user's database notifications,
 * backing the header bell. Page-independent (registered in the chrome route
 * cluster), scoped to the current user's own rows via the morph columns.
 * Plain JSON transport: the bell polls index() and hits the mutate endpoints.
 */
final class NotificationsController
{
    private const MAX_LIMIT = 50;

    private const DEFAULT_LIMIT = 20;

    public function index(Request $request): JsonResponse
    {
        $scope = $this->scopedQuery($request);
        $limit = $this->resolveLimit($request);

        $items = (clone $scope)->latest()->limit($limit)->get()
            ->map(static fn (DatabaseNotification $n): array => NotificationProjection::item($n))
            ->all();

        return response()->json([
            'data' => $items,
            'unreadCount' => (clone $scope)->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(Request $request, string $notification): Response
    {
        $this->findOwned($request, $notification)->markAsRead();

        return response()->noContent();
    }

    public function destroy(Request $request, string $notification): Response
    {
        $this->findOwned($request, $notification)->delete();

        return response()->noContent();
    }

    public function destroyAll(Request $request): Response
    {
        $this->scopedQuery($request)->delete();

        return response()->noContent();
    }

    private function findOwned(Request $request, string $notification): DatabaseNotification
    {
        $row = $this->scopedQuery($request)->whereKey($notification)->first();
        if ($row === null) {
            throw new NotFoundHttpException('Notification not found.');
        }

        return $row;
    }

    /**
     * Base query scoped to the authenticated user's notifications, addressed
     * by morph columns so no Notifiable-trait dependency is needed.
     *
     * @return Builder<DatabaseNotification>
     */
    private function scopedQuery(Request $request): Builder
    {
        $user = $request->user();
        if (! $user instanceof Model) {
            throw new NotFoundHttpException('No authenticated notifiable user.');
        }

        return DatabaseNotification::query()
            ->where('notifiable_type', $user->getMorphClass())
            ->where('notifiable_id', $user->getKey());
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        return max(1, min(self::MAX_LIMIT, $limit));
    }
}
