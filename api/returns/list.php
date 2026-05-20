<?php
require_once __DIR__ . '/../bootstrap.php';
$user = require_login();
if (($user['role'] ?? '') === 'admin') {
    $stmt = db()->query('SELECT * FROM return_requests ORDER BY created_at DESC');
} else {
    $stmt = db()->prepare('SELECT * FROM return_requests WHERE user_email = ? ORDER BY created_at DESC');
    $stmt->execute([$user['email']]);
}
$rows = $stmt->fetchAll();
$requests = array_map(function($r){ return [
    'id'=>(string)$r['id'], 'orderId'=>(string)$r['order_id'], 'productId'=>(string)$r['product_id'], 'productTitle'=>(string)$r['product_title'],
    'userEmail'=>(string)$r['user_email'], 'userName'=>(string)$r['user_name'], 'reason'=>(string)$r['reason'], 'comment'=>(string)$r['comment_text'],
    'contact'=>(string)$r['contact'], 'status'=>(string)$r['status'], 'createdAt'=>(string)$r['created_at']
]; }, $rows);
respond(['ok'=>true, 'requests'=>$requests]);
