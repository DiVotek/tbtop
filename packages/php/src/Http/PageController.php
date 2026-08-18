<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Tbtop\Admin\Navigation\BreadcrumbsBuilder;
use Tbtop\Admin\Panels\CurrentPanel;
use Tbtop\Admin\Uploads\UploadFieldUrl;

final class PageController
{
    use AuthorizesPage;

    public function show(Request $request, CurrentPanel $panel): Response
    {
        $this->authorizePageGate($request);

        $resolved = ResolvedPage::fromRequest($request);
        $pageRoute = $request->route()->getName();
        $pageParams = ResolvedPage::routeParams($request);
        $data = [];
        foreach ($resolved->s->collectedForms() as $name => $form) {
            // Forms register at construction, before any when() verdict — an
            // excluded one is still here, and its record would ship to a
            // browser that never receives the form.
            if (! $form->isIncluded()) {
                continue;
            }
            $data[$name] = UploadFieldUrl::applyToRecord($form->recordData(), $form->uploadFields(), $pageRoute, $pageParams);
        }

        $layout = $resolved->page->layout();
        if (! in_array($layout, ['admin', 'center'], strict: true)) {
            throw new \InvalidArgumentException(
                "Invalid page layout '{$layout}'. Allowed values: 'admin', 'center'."
            );
        }

        $props = [
            'slug' => $resolved->page::slug(),
            'title' => $resolved->page->title(),
            'layout' => $layout,
            'structure' => $resolved->tree,
            'data' => $data,
        ];

        if ($resolved->page->subtitle() !== null) {
            $props['subtitle'] = $resolved->page->subtitle();
        }

        if ($resolved->headerActions !== []) {
            $props['headerActions'] = $resolved->headerActions;
        }

        if ($panel->breadcrumbs()) {
            $props['breadcrumbs'] = BreadcrumbsBuilder::build($resolved->page, $panel);
        }

        return Inertia::render('admin/page', $props)->rootView($panel->rootView());
    }
}
