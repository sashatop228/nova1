CREATE DATABASE IF NOT EXISTS nova_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nova_shop;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','customer') NOT NULL DEFAULT 'customer',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(120) PRIMARY KEY,
    image VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(120) NOT NULL,
    price INT NOT NULL DEFAULT 0,
    old_price INT NOT NULL DEFAULT 0,
    tags_json TEXT NULL,
    material VARCHAR(120) NOT NULL DEFAULT 'Не указан',
    color VARCHAR(120) NOT NULL DEFAULT 'Не указан',
    in_stock TINYINT(1) NOT NULL DEFAULT 1,
    stock_count INT NOT NULL DEFAULT 0,
    delivery_days INT NOT NULL DEFAULT 3,
    size_text VARCHAR(120) NOT NULL DEFAULT '—',
    description_text TEXT NULL,
    created_by_admin TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(80) PRIMARY KEY,
    user_id INT NOT NULL,
    user_email VARCHAR(190) NOT NULL,
    user_name VARCHAR(120) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(40) NOT NULL DEFAULT 'card',
    payment_label VARCHAR(120) NOT NULL DEFAULT 'Картой',
    delivery_place VARCHAR(255) NULL,
    subtotal INT NOT NULL DEFAULT 0,
    delivery INT NOT NULL DEFAULT 0,
    discount_amount INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(80) NOT NULL,
    product_id VARCHAR(120) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    price INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(80) PRIMARY KEY,
    order_id VARCHAR(80) NOT NULL,
    product_id VARCHAR(120) NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    user_email VARCHAR(190) NOT NULL,
    user_name VARCHAR(120) NOT NULL,
    city VARCHAR(120) NULL,
    rating INT NOT NULL DEFAULT 5,
    text_content TEXT NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS return_requests (
    id VARCHAR(80) PRIMARY KEY,
    order_id VARCHAR(80) NOT NULL,
    product_id VARCHAR(120) NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    user_email VARCHAR(190) NOT NULL,
    user_name VARCHAR(120) NOT NULL,
    reason VARCHAR(120) NOT NULL DEFAULT 'Брак',
    comment_text TEXT NOT NULL,
    contact VARCHAR(255) NULL,
    status ENUM('new','in_progress','approved','rejected') NOT NULL DEFAULT 'new',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_returns_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_returns_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
