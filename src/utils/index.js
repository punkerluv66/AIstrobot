const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

const validateDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(dateString);
};

const validateTime = (timeString) => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(timeString);
};

const logMessage = (message) => {
    console.log(`[LOG] ${new Date().toISOString()}: ${message}`);
};

module.exports = {
    formatDate,
    validateDate,
    validateTime,
    logMessage,
};