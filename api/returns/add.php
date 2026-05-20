<?php
require_once __DIR__ . '/../bootstrap.php';
$user = require_login();
$data = json_input();
$orderId = trim((string)($data['orderId'] ?? ''));
$productId = trim((string)($data['productId'] ?? ''));
$reason = trim((string)($data['reason'] ?? 'Брак')) ?: 'Брак';
$comment = trim((string)($data['comment'] ?? ''));
$contact = trim((string)($data['contact'] ?? ''));
if ($orderId === '' || $productId === '') respond(['ok'=>false, 'error'=>'Выберите товар из вашей покупки.'], 422);
if (!has_purchased_product((int)$user['id'], $productId, $orderId)) respond(['ok'=>false, 'error'=>'Оформить возврат можно только для купленного товара.'], 422);
if ($comment === '') respond(['ok'=>false, 'error'=>'Опишите проблему с товаром.'], 422);
$p = db()->prepare('SELECT title FROM products WHERE id = ?'); $p->execute([$productId]); $title = $p->fetchColumn() ?: $productId;
$id = 'return-' . time() . '-' . rand(1000,9999);
$createdAt = date('Y-m-d H:i:s');
$stmt = db()->prepare('INSERT INTO return_requests (id, order_id, product_id, product_title, user_email, user_name, reason, comment_text, contact, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([$id, $orderId, $productId, $title, $user['email'], $user['name'], $reason, $comment, $contact, 'new', $createdAt]);
respond(['ok'=>true, 'request'=>['id'=>$id, 'orderId'=>$orderId, 'productId'=>$productId, 'productTitle'=>$title, 'userEmail'=>$user['email'], 'userName'=>$user['name'], 'reason'=>$reason, 'comment'=>$comment, 'contact'=>$contact, 'status'=>'new', 'createdAt'=>$createdAt]]);
