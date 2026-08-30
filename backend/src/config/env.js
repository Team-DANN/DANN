const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../dann.db'),
  JWT_SECRET: process.env.JWT_SECRET || 'dann_super_secret_key_2026',
  DEFAULT_BUSINESS_ID: 'biz_default',
};
