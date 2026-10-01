<?php

// Rewrites ->visit()/->newTab()/->openInNewTab() to the url() + openUrlInNewTab() canon; idempotent.
// Only `->` calls match: Pest browser tests call a bare visit(). Run: php scripts/codemods/link-canon.php

$root = dirname(__DIR__, 2);
$excluded = ['packages/php/tests/LinkCanonTest.php'];

exec('git -C '.escapeshellarg($root).' ls-files -- packages/php/src packages/php/tests apps/demo/app docs/ai README.md', $files);

$total = 0;
foreach ($files as $file) {
    if (in_array($file, $excluded, true) || str_starts_with($file, 'docs/ai/api/') || ! preg_match('/\.(php|md)$/', $file)) {
        continue;
    }
    $path = "{$root}/{$file}";
    [$rewritten, $count] = rewriteSource((string) file_get_contents($path));
    if ($count === 0) {
        continue;
    }
    file_put_contents($path, $rewritten);
    $total += $count;
    echo "{$file}: {$count}\n";
}
echo "total: {$total}\n";

/** @return array{0: string, 1: int} */
function rewriteSource(string $src): array
{
    $count = 0;
    $out = '';
    $offset = 0;
    while (preg_match('/->(visit|newTab|openInNewTab)\(/', $src, $m, PREG_OFFSET_CAPTURE, $offset)) {
        $start = $m[0][1];
        $argsStart = $start + strlen($m[0][0]);
        $argsEnd = closingParen($src, $argsStart);
        $out .= substr($src, $offset, $start - $offset);
        $args = substr($src, $argsStart, $argsEnd - $argsStart);
        $out .= $m[1][0] === 'visit' ? rewriteVisit($args) : '->openUrlInNewTab('.withoutNewTabName($args).')';
        $offset = $argsEnd + 1;
        $count++;
    }

    return [$out.substr($src, $offset), $count];
}

function rewriteVisit(string $args): string
{
    $parts = splitTopLevel($args);
    $href = $parts[0];
    if (count($parts) < 2) {
        return "->url({$href})";
    }
    $flag = trim(withoutNewTabName($parts[1]));

    return match (strtolower($flag)) {
        'true' => "->url({$href})->openUrlInNewTab()",
        'false', '' => "->url({$href})",
        default => "->url({$href})->openUrlInNewTab({$flag})",
    };
}

/** Drops a `newTab:` named-argument label: the canon's parameter is `$condition`. */
function withoutNewTabName(string $arg): string
{
    return (string) preg_replace('/^\s*newTab\s*:\s*/', '', $arg);
}

/** Index of the `)` closing the call whose arguments start at $i; skips nested parens and quoted strings. */
function closingParen(string $src, int $i): int
{
    $depth = 0;
    $len = strlen($src);
    for (; $i < $len; $i++) {
        $c = $src[$i];
        if ($c === '\'' || $c === '"') {
            $i = stringEnd($src, $i);
        } elseif ($c === '(' || $c === '[') {
            $depth++;
        } elseif (($c === ')' || $c === ']') && $depth > 0) {
            $depth--;
        } elseif ($c === ')') {
            return $i;
        }
    }
    throw new RuntimeException("Unbalanced call at offset {$i}");
}

function stringEnd(string $src, int $i): int
{
    $quote = $src[$i];
    for ($i++; $i < strlen($src) && $src[$i] !== $quote; $i++) {
        if ($src[$i] === '\\') {
            $i++;
        }
    }

    return $i;
}

/** @return list<string> top-level comma-separated arguments, trimmed */
function splitTopLevel(string $args): array
{
    $parts = [];
    $depth = 0;
    $last = 0;
    for ($i = 0; $i < strlen($args); $i++) {
        $c = $args[$i];
        if ($c === '\'' || $c === '"') {
            $i = stringEnd($args, $i);
        } elseif ($c === '(' || $c === '[' || $c === '{') {
            $depth++;
        } elseif ($c === ')' || $c === ']' || $c === '}') {
            $depth--;
        } elseif ($c === ',' && $depth === 0) {
            $parts[] = trim(substr($args, $last, $i - $last));
            $last = $i + 1;
        }
    }
    $parts[] = trim(substr($args, $last));

    return $parts;
}
