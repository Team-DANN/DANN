//env.js
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  // DB_PATH (SQLite file path) is gone — database.js now reads DATABASE_URL
  // directly from process.env, but it's exposed here too in case other code
  // wants it from the shared config module.
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres.ibhveblmpsnrumwsfoit:Mautsa2006%40%3F@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  JWT_SECRET: process.env.JWT_SECRET || '8EJLkQhvykqbLEXABDyYOyJKsijUWpKhPyfOldGEuws=',
  DEFAULT_BUSINESS_ID: 'biz_default',
};