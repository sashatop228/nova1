<?php
require_once __DIR__ . '/../bootstrap.php';
$products = load_products();
$categories = array_values(array_unique(array_map(fn($x) => $x['category'], $products)));
sort($categories);
respond(['ok'=>true, 'products'=>$products, 'categories'=>$categories]);
