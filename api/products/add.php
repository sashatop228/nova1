<?php
require_once __DIR__ . '/../bootstrap.php';
require_admin();
$data = json_input();
$title = trim((string)($data['title'] ?? ''));
if ($title === '') respond(['ok'=>false, 'error'=>'Укажите название товара.'], 422);
$id = trim((string)($data['id'] ?? ''));
if ($id === '') $id = preg_replace('~[^a-zа-яё0-9]+~iu', '-', mb_strtolower($title));
$id = trim($id, '-');
if ($id === '') $id = 'item-' . time();
$id .= '-' . substr((string)time(), -6);
$stock = max(0, (int)($data['stockCount'] ?? 0));
$stmt = db()->prepare('INSERT INTO products (id, image, title, category, price, old_price, tags_json, material, color, in_stock, stock_count, delivery_days, size_text, description_text, created_by_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)');
$stmt->execute([
    $id,
    trim((string)($data['image'] ?? 'assets/img/logo.png')),
    $title,
    trim((string)($data['category'] ?? 'Другое')) ?: 'Другое',
    max(0, (int)($data['price'] ?? 0)),
    max(0, (int)($data['oldPrice'] ?? 0)),
    json_encode($data['tags'] ?? [], JSON_UNESCAPED_UNICODE),
    trim((string)($data['material'] ?? 'Не указан')) ?: 'Не указан',
    trim((string)($data['color'] ?? 'Не указан')) ?: 'Не указан',
    $stock > 0 ? 1 : 0,
    $stock,
    max(1, (int)($data['deliveryDays'] ?? 3)),
    trim((string)($data['size'] ?? '—')) ?: '—',
    trim((string)($data['description'] ?? 'Описание пока не добавлено.')),
    date('Y-m-d H:i:s'),
]);
$stmt = db()->prepare('SELECT * FROM products WHERE id = ?');
$stmt->execute([$id]);
respond(['ok'=>true, 'product'=>product_row_to_api($stmt->fetch())]);
