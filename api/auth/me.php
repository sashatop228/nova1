<?php
require_once __DIR__ . '/../bootstrap.php';
$user = current_user();
respond(['ok' => true, 'user' => $user ? ['name'=>$user['name'], 'email'=>$user['email'], 'role'=>$user['role'], 'createdAt'=>$user['created_at']] : null]);
