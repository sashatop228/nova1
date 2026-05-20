<?php
require_once __DIR__ . '/../bootstrap.php';
$user = require_admin();
respond(['ok'=>true, 'orders'=>load_orders_for_user($user)]);
