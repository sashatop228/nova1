<?php
require_once __DIR__ . '/../bootstrap.php';
$user = require_login();
respond(['ok'=>true, 'orders'=>load_orders_for_user($user)]);
