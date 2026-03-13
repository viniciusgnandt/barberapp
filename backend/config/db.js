// config/db.js — Conexão com o MongoDB via Mongoose

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅  MongoDB: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌  MongoDB erro: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
