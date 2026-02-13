-- Migration: Crypto Wallets Module
-- Date: 2025-12-22

-- Crypto Networks table (supported blockchain networks)
CREATE TABLE IF NOT EXISTS crypto_networks (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    node_id INT NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    gradient VARCHAR(100),
    icon_url TEXT,
    explorer_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX network_code_idx (code),
    INDEX network_node_id_idx (node_id)
);

-- Crypto Coins table (tokens on each network)
CREATE TABLE IF NOT EXISTS crypto_coins (
    id VARCHAR(36) PRIMARY KEY,
    network_id VARCHAR(36) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    decimals INT DEFAULT 18,
    contract_address VARCHAR(100),
    is_native BOOLEAN DEFAULT FALSE,
    icon_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX coin_network_id_idx (network_id),
    INDEX coin_symbol_idx (symbol),
    FOREIGN KEY (network_id) REFERENCES crypto_networks(id) ON DELETE CASCADE
);

-- Crypto Wallets table (user wallets)
CREATE TABLE IF NOT EXISTS crypto_wallets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    network_id VARCHAR(36) NOT NULL,
    address VARCHAR(150) NOT NULL,
    label VARCHAR(100),
    encrypted_private_key TEXT,
    managed_by_api BOOLEAN DEFAULT TRUE,
    external_wallet_id INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX wallet_user_id_idx (user_id),
    INDEX wallet_network_id_idx (network_id),
    INDEX wallet_address_idx (address),
    INDEX wallet_user_network_idx (user_id, network_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (network_id) REFERENCES crypto_networks(id) ON DELETE CASCADE
);

-- User Networks table (networks added by user)
CREATE TABLE IF NOT EXISTS user_networks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    network_id VARCHAR(36) NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX user_network_user_id_idx (user_id),
    INDEX user_network_network_id_idx (network_id),
    UNIQUE INDEX user_network_unique_idx (user_id, network_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (network_id) REFERENCES crypto_networks(id) ON DELETE CASCADE
);

-- User Features table (feature flags per user)
CREATE TABLE IF NOT EXISTS user_features (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    feature_key ENUM('crypto_wallets', 'advanced_notes', 'premium_themes') NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX user_feature_user_id_idx (user_id),
    INDEX user_feature_key_idx (feature_key),
    UNIQUE INDEX user_feature_unique_idx (user_id, feature_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Wallet API Tokens table (external API auth tokens)
CREATE TABLE IF NOT EXISTS user_wallet_api_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    external_user_hash VARCHAR(100) NOT NULL,
    encrypted_api_token TEXT NOT NULL,
    refreshed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    UNIQUE INDEX wallet_api_token_user_id_idx (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed default crypto networks
INSERT INTO crypto_networks (id, code, name, symbol, node_id, color, gradient, is_active) VALUES
(UUID(), 'TRON', 'TRON', 'TRX', 1, '#EF0027', 'linear-gradient(135deg, #EF0027 0%, #FF6B6B 100%)', TRUE),
(UUID(), 'BSC', 'BNB Smart Chain', 'BNB', 2, '#F3BA2F', 'linear-gradient(135deg, #F3BA2F 0%, #FFD93D 100%)', TRUE),
(UUID(), 'TON', 'TON', 'TON', 3, '#0088CC', 'linear-gradient(135deg, #0088CC 0%, #00C6FB 100%)', TRUE),
(UUID(), 'ETH', 'Ethereum', 'ETH', 4, '#627EEA', 'linear-gradient(135deg, #627EEA 0%, #8B9FFF 100%)', TRUE),
(UUID(), 'POLYGON', 'Polygon', 'MATIC', 5, '#8247E5', 'linear-gradient(135deg, #8247E5 0%, #A879FF 100%)', TRUE),
(UUID(), 'ARBITRUM', 'Arbitrum', 'ARB', 6, '#28A0F0', 'linear-gradient(135deg, #28A0F0 0%, #5BC0FF 100%)', TRUE),
(UUID(), 'SOLANA', 'Solana', 'SOL', 7, '#9945FF', 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)', TRUE),
(UUID(), 'AVALANCHE', 'Avalanche', 'AVAX', 8, '#E84142', 'linear-gradient(135deg, #E84142 0%, #FF6B6B 100%)', TRUE),
(UUID(), 'POLKADOT', 'Polkadot', 'DOT', 9, '#E6007A', 'linear-gradient(135deg, #E6007A 0%, #FF4DA6 100%)', TRUE),
(UUID(), 'TEZOS', 'Tezos', 'XTZ', 10, '#2C7DF7', 'linear-gradient(135deg, #2C7DF7 0%, #5FA4FF 100%)', TRUE),
(UUID(), 'XRP', 'XRP Ledger', 'XRP', 11, '#23292F', 'linear-gradient(135deg, #23292F 0%, #4A5568 100%)', TRUE),
(UUID(), 'DOGECOIN', 'Dogecoin', 'DOGE', 12, '#C3A634', 'linear-gradient(135deg, #C3A634 0%, #F5D800 100%)', TRUE),
(UUID(), 'CARDANO', 'Cardano', 'ADA', 13, '#0033AD', 'linear-gradient(135deg, #0033AD 0%, #3366FF 100%)', TRUE),
(UUID(), 'MONERO', 'Monero', 'XMR', 14, '#FF6600', 'linear-gradient(135deg, #FF6600 0%, #FF9933 100%)', TRUE);

-- Seed native coins for each network
INSERT INTO crypto_coins (id, network_id, symbol, name, decimals, is_native)
SELECT UUID(), id, symbol, name, 
    CASE 
        WHEN code = 'TRON' THEN 6
        WHEN code = 'SOLANA' THEN 9
        WHEN code = 'XRP' THEN 6
        WHEN code = 'DOGECOIN' THEN 8
        WHEN code = 'CARDANO' THEN 6
        WHEN code = 'TEZOS' THEN 6
        WHEN code = 'POLKADOT' THEN 10
        WHEN code = 'MONERO' THEN 12
        ELSE 18
    END,
    TRUE
FROM crypto_networks;

-- Seed USDT for major networks
INSERT INTO crypto_coins (id, network_id, symbol, name, decimals, contract_address, is_native)
SELECT UUID(), id, 'USDT', 'Tether USD', 
    CASE 
        WHEN code = 'TRON' THEN 6
        ELSE 18
    END,
    CASE 
        WHEN code = 'TRON' THEN 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
        WHEN code = 'ETH' THEN '0xdAC17F958D2ee523a2206206994597C13D831ec7'
        WHEN code = 'BSC' THEN '0x55d398326f99059fF775485246999027B3197955'
        WHEN code = 'POLYGON' THEN '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
        WHEN code = 'ARBITRUM' THEN '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
        WHEN code = 'AVALANCHE' THEN '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7'
        ELSE NULL
    END,
    FALSE
FROM crypto_networks 
WHERE code IN ('TRON', 'ETH', 'BSC', 'POLYGON', 'ARBITRUM', 'AVALANCHE');
