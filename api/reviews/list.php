<?php
require_once __DIR__ . '/../bootstrap.php';
$productId = trim((string)($_GET['productId'] ?? ''));
$status = trim((string)($_GET['status'] ?? ''));
$sql = 'SELECT * FROM reviews WHERE 1=1';
$params = [];
if ($productId !== '') { $sql .= ' AND product_id = ?'; $params[] = $productId; }
if ($status !== '') { $sql .= ' AND status = ?'; $params[] = $status; }
$sql .= ' ORDER BY created_at DESC';
$stmt = db()->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();
$reviews = array_map(function($r){ return [
    'id'=>(string)$r['id'], 'orderId'=>(string)$r['order_id'], 'productId'=>(string)$r['product_id'], 'productTitle'=>(string)$r['product_title'],
    'userEmail'=>(string)$r['user_email'], 'userName'=>(string)$r['user_name'], 'city'=>(string)$r['city'], 'rating'=>(int)$r['rating'], 'text'=>(string)$r['text_content'],
    'status'=>(string)$r['status'], 'createdAt'=>(string)$r['created_at']
]; }, $rows);
respond(['ok'=>true, 'reviews'=>$reviews]);
