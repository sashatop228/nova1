-- 1. Обновляем email администратора на корректный (с @)
UPDATE users SET email = 'admin@example.com' WHERE email = 'admin';

-- Если записи с email='admin' нет, ничего страшного — просто добавим администратора, если его нет
INSERT IGNORE INTO users (name, email, password_hash, role, created_at)
VALUES ('Администратор', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NOW());

-- 2. Добавляем обычного пользователя (пароль = 'password')
INSERT INTO users (name, email, password_hash, role, created_at)
VALUES ('Иван Петров', 'ivan@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer', NOW());

-- 3. Добавляем несколько товаров (id вручную, чтобы легко ссылаться)
INSERT INTO products (id, image, title, category, price, old_price, tags_json, material, color, in_stock, stock_count, delivery_days, size_text, description_text, created_by_admin, created_at) VALUES
('prod_1', 'https://via.placeholder.com/300', 'Ноутбук UltraBook', 'Электроника', 120000, 140000, '["ноутбук","ultrabook"]', 'Алюминий', 'Серебристый', 1, 5, 3, '15.6"', 'Мощный ноутбук для работы и учёбы.', 1, NOW()),
('prod_2', 'https://via.placeholder.com/300', 'Беспроводная мышь', 'Аксессуары', 2500, 3000, '["мышь","беспроводная"]', 'Пластик', 'Чёрный', 1, 20, 2, '—', 'Эргономичная мышь с тихими кнопками.', 1, NOW()),
('prod_3', 'https://via.placeholder.com/300', 'Клавиатура Mechanical', 'Аксессуары', 8500, 9990, '["клавиатура","механическая"]', 'Алюминий/пластик', 'Чёрный/красный', 1, 8, 3, '87 клавиш', 'Механическая клавиатура с подсветкой.', 1, NOW());

-- 4. Добавляем заказ от пользователя Иван Петров (id заказа: ord_1)
INSERT INTO orders (id, user_id, user_email, user_name, created_at, payment_method, payment_label, delivery_place, subtotal, delivery, discount_amount, total)
VALUES (
    'ord_1',
    (SELECT id FROM users WHERE email = 'ivan@example.com'),
    'ivan@example.com',
    'Иван Петров',
    NOW(),
    'card',
    'Картой онлайн',
    'Москва, ул. Тверская, д. 1',
    130500,
    500,
    0,
    131000
);

-- 5. Добавляем позиции заказа
INSERT INTO order_items (order_id, product_id, qty, price) VALUES
('ord_1', 'prod_1', 1, 120000),
('ord_1', 'prod_2', 2, 2500);

-- 6. Добавляем одобренный отзыв от Ивана на товар prod_1
INSERT INTO reviews (id, order_id, product_id, product_title, user_email, user_name, city, rating, text_content, status, created_at)
VALUES (
    'rev_1',
    'ord_1',
    'prod_1',
    'Ноутбук UltraBook',
    'ivan@example.com',
    'Иван Петров',
    'Москва',
    5,
    'Отличный ноутбук, быстрый и лёгкий. Доставка вовремя.',
    'approved',
    NOW()
);

-- 7. Добавляем запрос на возврат (статус new) для мыши
INSERT INTO return_requests (id, order_id, product_id, product_title, user_email, user_name, reason, comment_text, contact, status, created_at)
VALUES (
    'return_1',
    'ord_1',
    'prod_2',
    'Беспроводная мышь',
    'ivan@example.com',
    'Иван Петров',
    'Не подошёл размер',
    'Мышь слишком маленькая для моей руки.',
    '+7 123 456-78-90',
    'new',
    NOW()
);