<?php // Regenerates phpDates.json: php test/fixtures/phpDates.php > test/fixtures/phpDates.json
date_default_timezone_set('Europe/Kyiv');
$values = ['2024-03-31 02:30:00', '2024-06-15 23:59:59.123456', '2024-06-15T08:05:00+02:00', '2024-01-01T00:30:00Z', '2024-12-30', '2021-01-03 12:00:00', '2024-02-29 13:07:09'];
$formats = ['Y-m-d H:i:s', 'D, jS F Y g:i A', 'N w z t L W o', 'c', 'r', 'U', 'u v', 'P O p e', 'y n G h a'];
$out = [];
foreach ($values as $v) { foreach ($formats as $f) { $out[$v][$f] = (new DateTime($v))->format($f); } }
echo json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
