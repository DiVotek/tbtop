{{-- Demo-only: floating style preset switcher. Each link visits ?style=<preset>, which DemoStylePreset keeps for the session. --}}
@php($activeStyle = \App\Http\Middleware\DemoStylePreset::active())
<nav id="demo-style-switcher" aria-label="Style preset" style="position:fixed;right:12px;bottom:12px;z-index:2147483647;display:flex;gap:4px;flex-wrap:wrap;max-width:420px;padding:6px;border-radius:8px;background:rgba(20,20,20,.85);font:12px/1 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)">
    @foreach (\App\Http\Middleware\DemoStylePreset::STYLES as $style)
        <a href="{{ request()->fullUrlWithQuery(['style' => $style]) }}" title="style-preset-{{ $style }}" @if ($style === $activeStyle) aria-current="true" @endif style="all:unset;cursor:pointer;padding:5px 8px;border-radius:5px;color:#fff;background:{{ $style === $activeStyle ? '#10b981' : '#333' }}">{{ $style }}</a>
    @endforeach
</nav>
<script>
    // Inertia visits move the page under this static nav, so build the link from the current URL on click.
    document.getElementById('demo-style-switcher').addEventListener('click', function (event) {
        var link = event.target.closest('a');
        if (!link) return;
        event.preventDefault();
        var url = new URL(window.location.href);
        url.searchParams.set('style', new URL(link.href).searchParams.get('style'));
        window.location.assign(url);
    });
</script>
