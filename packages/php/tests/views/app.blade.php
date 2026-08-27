<!DOCTYPE html>
<html>
<head><title>tbtop test root</title></head>
{{-- Inertia's @inertia directive expands to this; its provider is not
     discovered in the package test app, so the markup is inlined. --}}
<body><div id="app" data-page="{{ json_encode($page) }}"></div></body>
</html>
