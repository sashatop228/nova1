<?php
session_start();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function app_config(): array {
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/../config/db.php';
    }
    return $config;
}

function db_server(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $cfg = app_config();
    $dsn = sprintf('mysql:host=%s;port=%d;charset=%s', $cfg['host'], $cfg['port'], $cfg['charset']);
    $pdo = new PDO($dsn, $cfg['username'], $cfg['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $cfg = app_config();
    $server = db_server();
    $server->exec(sprintf('CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET %s COLLATE %s_unicode_ci', $cfg['database'], $cfg['charset'], $cfg['charset']));
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $cfg['host'], $cfg['port'], $cfg['database'], $cfg['charset']);
    $pdo = new PDO($dsn, $cfg['username'], $cfg['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    ensure_schema($pdo);
    ensure_seed($pdo);
    return $pdo;
}

function ensure_schema(PDO $pdo): void {
    static $done = false;
    if ($done) return;
    $sql = file_get_contents(__DIR__ . '/../schema.sql');
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        if ($statement === '' || stripos($statement, 'CREATE DATABASE') === 0 || strtoupper($statement) === 'USE nova_shop') continue;
        $pdo->exec($statement);
    }
    $done = true;
}

function ensure_seed(PDO $pdo): void {
    static $done = false;
    if ($done) return;

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute(['admin']);
    if (!$stmt->fetch()) {
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute(['Администратор', 'admin', password_hash('admin', PASSWORD_DEFAULT), 'admin', date('Y-m-d H:i:s')]);
    }

    $count = (int)$pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
    if ($count === 0) {
        $jsonFile = __DIR__ . '/../base-products.json';
        if (is_file($jsonFile)) {
            $items = json_decode(file_get_contents($jsonFile), true);
            if (is_array($items)) {
                $sql = 'INSERT INTO products (id, image, title, category, price, old_price, tags_json, material, color, in_stock, stock_count, delivery_days, size_text, description_text, created_by_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                $stmt = $pdo->prepare($sql);
                foreach ($items as $item) {
                    $stock = max(0, (int)($item['stockCount'] ?? 0));
                    $stmt->execute([
                        (string)$item['id'],
                        (string)$item['image'],
                        (string)$item['title'],
                        (string)($item['category'] ?? 'Другое'),
                        (int)($item['price'] ?? 0),
                        (int)($item['oldPrice'] ?? 0),
                        json_encode($item['tags'] ?? [], JSON_UNESCAPED_UNICODE),
                        (string)($item['material'] ?? 'Не указан'),
                        (string)($item['color'] ?? 'Не указан'),
                        $stock > 0 ? 1 : 0,
                        $stock,
                        max(1, (int)($item['deliveryDays'] ?? 3)),
                        (string)($item['size'] ?? '—'),
                        (string)($item['description'] ?? ''),
                        !empty($item['createdByAdmin']) ? 1 : 0,
                        date('Y-m-d H:i:s'),
                    ]);
                }
            }
        }
    }

    $done = true;
}

function json_input(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function current_user(): ?array {
    if (empty($_SESSION['user_id'])) return null;
    $stmt = db()->prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function require_login(): array {
    $user = current_user();
    if (!$user) respond(['ok' => false, 'error' => 'Требуется вход в аккаунт.'], 401);
    return $user;
}

function require_admin(): array {
    $user = require_login();
    if (($user['role'] ?? '') !== 'admin') respond(['ok' => false, 'error' => 'Недостаточно прав.'], 403);
    return $user;
}

function product_row_to_api(array $row): array {
    return [
        'id' => (string)$row['id'],
        'image' => (string)$row['image'],
        'title' => (string)$row['title'],
        'category' => (string)$row['category'],
        'price' => (int)$row['price'],
        'oldPrice' => (int)$row['old_price'],
        'tags' => json_decode($row['tags_json'] ?: '[]', true) ?: [],
        'material' => (string)$row['material'],
        'color' => (string)$row['color'],
        'inStock' => (int)$row['stock_count'] > 0,
        'stockCount' => (int)$row['stock_count'],
        'deliveryDays' => (int)$row['delivery_days'],
        'size' => (string)$row['size_text'],
        'description' => (string)$row['description_text'],
        'createdByAdmin' => (bool)$row['created_by_admin'],
    ];
}

function load_products(): array {
    $rows = db()->query('SELECT * FROM products ORDER BY created_at ASC, title ASC')->fetchAll();
    return array_map('product_row_to_api', $rows);
}

function load_orders_for_user(array $user): array {
    $pdo = db();
    if (($user['role'] ?? '') === 'admin') {
        $stmt = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC');
    } else {
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$user['id']]);
    }
    $orders = $stmt->fetchAll();
    if (!$orders) return [];
    $itemsStmt = $pdo->prepare('SELECT oi.order_id, oi.product_id AS id, oi.qty, oi.price, p.title, p.image FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?');
    foreach ($orders as &$order) {
        $itemsStmt->execute([$order['id']]);
        $items = $itemsStmt->fetchAll();
        $order['items'] = array_map(function($item){
            return [
                'id' => (string)$item['id'],
                'qty' => (int)$item['qty'],
                'price' => (int)$item['price'],
                'title' => (string)$item['title'],
                'image' => (string)$item['image'],
            ];
        }, $items);
        $order['totals'] = [
            'subtotal' => (int)$order['subtotal'],
            'delivery' => (int)$order['delivery'],
            'discount' => (int)$order['discount_amount'],
            'total' => (int)$order['total'],
        ];
        $order['paymentMethod'] = (string)$order['payment_method'];
        $order['paymentLabel'] = (string)$order['payment_label'];
        $order['deliveryPlace'] = (string)$order['delivery_place'];
        $order['userEmail'] = (string)$order['user_email'];
        $order['userName'] = (string)$order['user_name'];
    }
    return $orders;
}

function load_purchased_products(array $user): array {
    $orders = load_orders_for_user($user);
    $rows = [];
    foreach ($orders as $order) {
        foreach ($order['items'] as $item) {
            $rows[] = [
                'key' => $order['id'] . '::' . $item['id'],
                'orderId' => $order['id'],
                'productId' => $item['id'],
                'productTitle' => $item['title'],
                'createdAt' => $order['created_at'],
                'qty' => (int)$item['qty'],
                'price' => (int)$item['price'],
                'deliveryPlace' => (string)($order['delivery_place'] ?? ''),
            ];
        }
    }
    return $rows;
}

function has_purchased_product(int $userId, string $productId, string $orderId = ''): bool {
    $pdo = db();
    $sql = 'SELECT COUNT(*) FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.user_id = ? AND oi.product_id = ?';
    $params = [$userId, $productId];
    if ($orderId !== '') {
        $sql .= ' AND o.id = ?';
        $params[] = $orderId;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int)$stmt->fetchColumn() > 0;
}
