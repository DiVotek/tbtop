<?php

namespace Tbtop\Admin\Panels;

use Tbtop\Admin\Dsl\Node;
use Tbtop\Admin\Dsl\S;

/**
 * Per-panel shell chrome authored in the structure DSL. Plain stateless
 * class, instantiated at share-time per request (like Page — never a
 * container singleton). The defaults reproduce the stock admin shell;
 * consumers extend and either append to the item lists (headerItems /
 * sidebarItems) or replace a whole area (header / sidebar / footer).
 *
 * Chrome trees are page-independent: server-closure actions (->handle())
 * resolve against a page's action endpoint, which does not exist for the
 * shell. Serialization throws when one is found in a chrome tree — use
 * ->visit() or ->custom() actions instead.
 */
class Chrome
{
    /** Topbar content. The shell right-aligns it. */
    public function header(S $s): ?Node
    {
        return $s->row($this->headerItems($s));
    }

    /** Sidebar content: logo on top, nav groups below. */
    public function sidebar(S $s): ?Node
    {
        return $s->stack($this->sidebarItems($s));
    }

    /** No footer in the stock shell. */
    public function footer(S $s): ?Node
    {
        return null;
    }

    /**
     * Default header items — override to spread these and append your own
     * blocks: `return [...parent::headerItems($s), $s->action(...)];`
     *
     * @return list<mixed>
     */
    protected function headerItems(S $s): array
    {
        return [$s->userMenu()];
    }

    /**
     * Default sidebar items, top to bottom.
     *
     * @return list<mixed>
     */
    protected function sidebarItems(S $s): array
    {
        return [$s->logo(), $s->navMenu()];
    }
}
