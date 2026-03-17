// scripts/cleanupAccount.js
// Uso: node scripts/cleanupAccount.js <email>
// Exemplo: node scripts/cleanupAccount.js viniciusgnandt@hotmail.com

require('dotenv').config();
const mongoose  = require('mongoose');
const User      = require('../models/User');
const Barbershop = require('../models/Barbershop');

const email = process.argv[2];
if (!email) { console.error('Informe o email: node scripts/cleanupAccount.js <email>'); process.exit(1); }

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Conectado ao MongoDB');

  const users = await User.find({ email });
  if (!users.length) {
    console.log(`Nenhum usuário encontrado para: ${email}`);
  } else {
    for (const u of users) {
      console.log(`Usuário: ${u._id} | barbershop: ${u.barbershop} | emailVerified: ${u.emailVerified} | token: ${u.emailVerificationToken || '(nenhum)'}`);
      const shop = await Barbershop.findById(u.barbershop);
      if (shop) {
        console.log(`  Barbearia: ${shop.name} (${shop._id}) — deletando...`);
        await Barbershop.deleteOne({ _id: shop._id });
      }
      console.log(`  Usuário deletado.`);
      await User.deleteOne({ _id: u._id });
    }
    console.log('Conta removida com sucesso.');
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
