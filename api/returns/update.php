<?php
require_once __DIR__ . '/../bootstrap.php';
require_admin();
$data = json_input();
$id = trim((string)($data['id'] ?? ''));
$status = trim((string)($data['status'] ?? 'new'));
if (!in_array($status, ['new','in_progress','approved','rejected'], true)) $status = 'new';
$stmt = db()->prepare('UPDATE return_requests SET status = ? WHERE id = ?');
$stmt->execute([$status, $id]);
if (!$stmt->rowCount()) respond(['ok'=>false, 'error'=>'Заявка не найдена.'], 404);
respond(['ok'=>true]);
