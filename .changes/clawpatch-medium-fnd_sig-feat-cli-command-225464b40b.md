# fix(media): refresh the grid when a folder is mutated

touches: media library

The folder tree and the folder cards inside the grid are fed by two independent
queries — `useMediaFolders` for the tree and breadcrumbs, `useMediaItems` for the
grid. `FolderTree`'s mutation callback refetched only the first, so creating,
renaming, or deleting a folder updated the sidebar while the grid kept showing the
old cards until some unrelated refetch happened to fire.

```mermaid
flowchart LR
    subgraph client["@tbtop/inertia-admin"]
        tree(["FolderTree<br/><small>media/folderTree.tsx</small>"]):::unchanged
        cb["onMutated callback<br/>+refetch items<br/><small>media/mediaLibraryBlock.tsx</small>"]:::changed
        qf(["useMediaFolders<br/><small>tree + breadcrumbs</small>"]):::unchanged
        qi(["useMediaItems<br/><small>grid cards</small>"]):::unchanged
        grid(["MediaGrid"]):::unchanged
    end

    tree --> cb
    cb --> qf
    cb ==>|"hero: the grid's own query is refreshed too"| qi
    qf --> tree
    qi --> grid

    classDef changed fill:#0d3b1e,stroke:#2ea043,color:#fff
    classDef touched fill:#21262d,stroke:#8b949e,stroke-dasharray:4,color:#ddd
    classDef unchanged fill:#21262d,stroke:#484f58,color:#aaa
    classDef removed fill:#3b0d0d,stroke:#da3633,color:#fff
```

One added call, no contract or server change. The finding also floated centralising
folder state into a single source; that is a larger refactor and was deliberately not
taken here.

**Read by eye:**
- `packages/client/src/media/mediaLibraryBlock.tsx`

**Verification:**
- The added test was run against the merge-base and **fails** there, then passes on
  this branch. `mediaLibrary.test.tsx` is 22 pass / 0 fail with the fix.
