<?php
require_once __DIR__ . '/../bootstrap.php';
require_admin();
$data = json_input();
$id = trim((string)($data['id'] ?? ''));
if ($id === '') respond(['ok'=>false, 'error'=>'Не указан товар.'], 422);
$stmt = db()->prepare('SELECT stock_count FROM products WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
$current = $stmt->fetchColumn();
if ($current === false) respond(['ok'=>false, 'error'=>'Товар не найден.'], 404);
if (isset($data['qty'])) $next = max(0, (int)$data['qty']);
else $next = max(0, (int)$current + (int)($data['delta'] ?? 0));
$stmt = db()->prepare('UPDATE products SET stock_count = ?, in_stock = ? WHERE id = ?');
$stmt->execute([$next, $next > 0 ? 1 : 0, $id]);
respond(['ok'=>true, 'stock'=>(int)$next]);
