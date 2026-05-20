// config.php
return [
    'host'     => 'postgres-production-e891.up.railway.app', // публичный адрес
    'port'     => 5432,
    'dbname'   => 'railway', // имя базы (чаще всего 'railway')
    'user'     => 'postgres', // пользователь (чаще всего 'postgres')
    'password' => 'admin', // настоящий пароль
    'sslmode'  => 'require', // Railway требует SSL
];