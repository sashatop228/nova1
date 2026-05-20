<?php
require_once __DIR__ . '/../bootstrap.php';
$user = require_login();
respond(['ok'=>true, 'items'=>load_purchased_products($user)]);
