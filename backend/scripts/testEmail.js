// scripts/testEmail.js — testa o envio via Resend
require('dotenv').config();
const { sendVerificationEmail } = require('../services/emailService');

async function run() {
  const to    = process.argv[2] || 'viniciusgnandt@hotmail.com';
  const token = 'test-token-123';
  console.log(`Enviando e-mail de teste para: ${to}`);
  try {
    await sendVerificationEmail(to, 'Vinicius', token);
    console.log('E-mail enviado com sucesso!');
  } catch (err) {
    console.error('Erro ao enviar:', err?.message || err);
    if (err?.statusCode) console.error('Status:', err.statusCode);
    if (err?.name)       console.error('Nome:', err.name);
  }
}

run();
