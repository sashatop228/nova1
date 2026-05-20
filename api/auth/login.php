<?php
require_once __DIR__ . '/../bootstrap.php';
$data = json_input();
$email = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');
if ($email === '' || $password === '') respond(['ok'=>false, 'error'=>'Введите логин и пароль.'], 422);
$stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch();
if (!$user || !password_verify($password, $user['password_hash'])) respond(['ok'=>false, 'error'=>'Неверный логин или пароль.'], 401);
$_SESSION['user_id'] = (int)$user['id'];
respond(['ok'=>true, 'user'=>['name'=>$user['name'], 'email'=>$user['email'], 'role'=>$user['role'], 'createdAt'=>$user['created_at']]]);
