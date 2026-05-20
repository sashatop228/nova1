<?php
require_once __DIR__ . '/../bootstrap.php';
require_admin();
$data = json_input();
$id = trim((string)($data['id'] ?? ''));
$status = trim((string)($data['status'] ?? 'pending'));
if (!in_array($status, ['pending','approved','rejected'], true)) $status = 'pending';
$stmt = db()->prepare('UPDATE reviews SET status = ? WHERE id = ?');
$stmt->execute([$status, $id]);
if (!$stmt->rowCount()) respond(['ok'=>false, 'error'=>'Отзыв не найден.'], 404);
respond(['ok'=>true]);
