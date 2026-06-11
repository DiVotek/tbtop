<?php

namespace Tbtop\Admin\Http;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Tbtop\Admin\Navigation\BreadcrumbsBuilder;
use Tbtop\Admin\Panels\CurrentPanel;

final class PageController
{
    use AuthorizesPage;

    public function show(Request $request, CurrentPanel $panel): Response
    {
        $this->authorizePageGate($request);

        $resolved = ResolvedPage::fromRequest($request);
        $data = [];
        foreach ($resolved->s->collectedForms() as $name => $form) {
            $data[$name] = $form->recordData();
        }

        $props = [
            'slug' => $resolved->page::slug(),
            'title' => $resolved->page->title(),
            'structure' => $resolved->tree,
            'data' => $data,
        ];

        if ($panel->breadcrumbs()) {
            $props['breadcrumbs'] = BreadcrumbsBuilder::build($resolved->page, $panel);
        }

        return Inertia::render('admin/page', $props)->rootView($panel->rootView());
    }
}
