<?php
require_once __DIR__ . '/../bootstrap.php';
$data = json_input();
$name = trim((string)($data['name'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
$password = (string)($data['password'] ?? '');
if ($name === '' || $email === '' || $password === '') respond(['ok'=>false, 'error'=>'Заполните все поля регистрации.'], 422);
$stmt = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
if ($stmt->fetch()) respond(['ok'=>false, 'error'=>'Пользователь с таким логином уже зарегистрирован.'], 409);
$stmt = db()->prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT), 'customer', date('Y-m-d H:i:s')]);
$_SESSION['user_id'] = (int)db()->lastInsertId();
respond(['ok'=>true, 'user'=>['name'=>$name, 'email'=>$email, 'role'=>'customer', 'createdAt'=>date('Y-m-d H:i:s')]]);
