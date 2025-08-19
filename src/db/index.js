const { Pool } = require('pg');
require('dotenv').config();

// Создаем соединение с базой данных
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Функция инициализации базы данных - создает таблицы если они не существуют
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                birth_date DATE NOT NULL,
                birth_time TIME NOT NULL,
                gender CHAR(1) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL UNIQUE,
                is_subscribed BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database tables created successfully');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

async function saveUserData(userId, birthDate, birthTime, gender, name) {
    try {
        // Проверяем, есть ли уже такая запись с точно такими же данными
        const existingData = await pool.query(
            'SELECT * FROM users WHERE user_id = $1 AND birth_date = $2 AND birth_time = $3 AND gender = $4 AND name = $5 ORDER BY created_at DESC LIMIT 1',
            [userId, birthDate, birthTime, gender, name]
        );

        // Если запись с такими точно данными уже существует и была создана недавно (в течение 5 минут), не дублируем
        if (existingData.rows.length > 0) {
            const existingRecord = existingData.rows[0];
            const createdAt = new Date(existingRecord.created_at);
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            
            if (createdAt > fiveMinutesAgo) {
                console.log('Duplicate record prevented within 5 minutes window');
                return existingRecord;
            }
        }

        // Если такой записи нет или она старая, создаем новую
        const result = await pool.query(
            'INSERT INTO users (user_id, birth_date, birth_time, gender, name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, birthDate, birthTime, gender, name]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error saving user data:', error);
        throw error;
    }
}

async function getUserData(userId) {
    try {
        const result = await pool.query('SELECT * FROM users WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]);
        return result.rows[0];
    } catch (error) {
        console.error('Error getting user data:', error);
        throw error;
    }
}

async function subscribeUser(userId) {
    try {
        await pool.query(
            'INSERT INTO subscriptions (user_id, is_subscribed) VALUES ($1, TRUE) ON CONFLICT (user_id) DO UPDATE SET is_subscribed = TRUE',
            [userId]
        );
        return true;
    } catch (error) {
        console.error('Error subscribing user:', error);
        throw error;
    }
}

async function unsubscribeUser(userId) {
    try {
        await pool.query(
            'UPDATE subscriptions SET is_subscribed = FALSE WHERE user_id = $1',
            [userId]
        );
        return true;
    } catch (error) {
        console.error('Error unsubscribing user:', error);
        throw error;
    }
}

async function isUserSubscribed(userId) {
    try {
        const result = await pool.query(
            'SELECT is_subscribed FROM subscriptions WHERE user_id = $1',
            [userId]
        );
        return result.rows[0]?.is_subscribed === true;
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}
async function updateUserData(userId, birthDate, birthTime, gender, name) {
    try {
        const result = await pool.query(
            'UPDATE users SET birth_date = $2, birth_time = $3, gender = $4, name = $5 WHERE user_id = $1 RETURNING *',
            [userId, birthDate, birthTime, gender, name]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error updating user data:', error);
        throw error;
    }
}
// Экспортируем все функции
module.exports = {
    initDB,
    saveUserData,
    getUserData,
    subscribeUser,
    unsubscribeUser,
    isUserSubscribed,
    updateUserData
};