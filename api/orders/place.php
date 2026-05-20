<?php
require_once __DIR__ . '/../bootstrap.php';
$user = require_login();
$data = json_input();
$items = $data['items'] ?? [];
if (!is_array($items) || !$items) respond(['ok'=>false, 'error'=>'Корзина пуста.'], 422);
$pdo = db();
$pdo->beginTransaction();
try {
    $getProduct = $pdo->prepare('SELECT * FROM products WHERE id = ? LIMIT 1 FOR UPDATE');
    $subtotal = 0;
    $prepared = [];
    foreach ($items as $item) {
        $id = trim((string)($item['id'] ?? ''));
        $qty = max(1, (int)($item['qty'] ?? 1));
        $getProduct->execute([$id]);
        $product = $getProduct->fetch();
        if (!$product) throw new Exception('Товар не найден: ' . $id);
        if ((int)$product['stock_count'] < $qty) throw new Exception('Для товара «' . $product['title'] . '» доступно только ' . (int)$product['stock_count'] . ' шт.');
        $prepared[] = ['id'=>$id, 'qty'=>$qty, 'price'=>(int)$product['price'], 'title'=>$product['title'], 'image'=>$product['image']];
        $subtotal += (int)$product['price'] * $qty;
    }
    $delivery = $subtotal >= 80000 ? 0 : ($subtotal > 0 ? 990 : 0);
    $discount = 0;
    $total = max(0, $subtotal + $delivery - $discount);
    $orderId = 'NOVA-' . time();
    while (true) {
        $check = $pdo->prepare('SELECT COUNT(*) FROM orders WHERE id = ?');
        $check->execute([$orderId]);
        if (!(int)$check->fetchColumn()) break;
        $orderId = 'NOVA-' . time() . rand(10,99);
    }
    $stmt = $pdo->prepare('INSERT INTO orders (id, user_id, user_email, user_name, created_at, payment_method, payment_label, delivery_place, subtotal, delivery, discount_amount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $createdAt = date('Y-m-d H:i:s');
    $stmt->execute([
        $orderId,
        $user['id'],
        $user['email'],
        $user['name'],
        $createdAt,
        trim((string)($data['paymentMethod'] ?? 'card')) ?: 'card',
        trim((string)($data['paymentLabel'] ?? 'Картой')) ?: 'Картой',
        trim((string)($data['deliveryPlace'] ?? '')),
        $subtotal,
        $delivery,
        $discount,
        $total,
    ]);
    $itemStmt = $pdo->prepare('INSERT INTO order_items (order_id, product_id, qty, price) VALUES (?, ?, ?, ?)');
    $stockStmt = $pdo->prepare('UPDATE products SET stock_count = ?, in_stock = ? WHERE id = ?');
    foreach ($prepared as $item) {
        $itemStmt->execute([$orderId, $item['id'], $item['qty'], $item['price']]);
        $getProduct->execute([$item['id']]);
        $product = $getProduct->fetch();
        $nextStock = max(0, (int)$product['stock_count'] - (int)$item['qty']);
        $stockStmt->execute([$nextStock, $nextStock > 0 ? 1 : 0, $item['id']]);
    }
    $pdo->commit();
    respond(['ok'=>true, 'order'=>[
        'id'=>$orderId,
        'userEmail'=>$user['email'],
        'userName'=>$user['name'],
        'createdAt'=>$createdAt,
        'items'=>$prepared,
        'totals'=>['subtotal'=>$subtotal, 'delivery'=>$delivery, 'discount'=>$discount, 'total'=>$total],
        'paymentMethod'=>trim((string)($data['paymentMethod'] ?? 'card')) ?: 'card',
        'paymentLabel'=>trim((string)($data['paymentLabel'] ?? 'Картой')) ?: 'Картой',
        'deliveryPlace'=>trim((string)($data['deliveryPlace'] ?? '')),
    ]]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    respond(['ok'=>false, 'error'=>$e->getMessage()], 422);
}
