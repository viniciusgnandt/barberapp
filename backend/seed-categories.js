// seed-categories.js — Cria categorias e categoriza serviços da barbearia
// Uso: node seed-categories.js

require('dotenv').config();
const mongoose = require('mongoose');

const ServiceCategory = require('./models/ServiceCategory');
const Service         = require('./models/Service');

const BARBERSHOP_ID = new mongoose.Types.ObjectId('69b45c241f5842be00fb9f25');

const CATEGORIES = [
  { name: 'Cortes',       color: '#6366f1', order: 1 },
  { name: 'Barba',        color: '#f97316', order: 2 },
  { name: 'Tratamentos',  color: '#22c55e', order: 3 },
];

// Which service names map to which category
const CATEGORY_MAP = {
  'Cortes':      ['Corte Simples', 'Degradê'],
  'Barba':       ['Corte + Barba', 'Barba Completa', 'Sobrancelha'],
  'Tratamentos': ['Pigmentação Capilar', 'Relaxamento', 'Hidratação'],
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Conectado ao MongoDB');

  // Remove existing categories for this shop
  await ServiceCategory.deleteMany({ barbershop: BARBERSHOP_ID });
  console.log('🗑️   Categorias anteriores removidas');

  // Create categories
  const created = {};
  for (const cat of CATEGORIES) {
    const doc = await ServiceCategory.create({ ...cat, barbershop: BARBERSHOP_ID });
    created[cat.name] = doc._id;
    console.log(`   ✓ Categoria: ${cat.name} (${doc._id})`);
  }

  // Assign categories to services
  let updated = 0;
  for (const [catName, serviceNames] of Object.entries(CATEGORY_MAP)) {
    for (const name of serviceNames) {
      const res = await Service.updateMany(
        { barbershop: BARBERSHOP_ID, name },
        { $set: { category: created[catName] } },
      );
      updated += res.modifiedCount;
      console.log(`   ✓ "${name}" → ${catName} (${res.modifiedCount} serviço(s))`);
    }
  }

  console.log(`\n🎉  Concluído! ${CATEGORIES.length} categorias criadas, ${updated} serviços categorizados.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌  Erro:', err.message);
  process.exit(1);
});
