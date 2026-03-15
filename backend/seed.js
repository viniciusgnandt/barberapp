// seed.js — Gera dados massivos de teste
// Uso: node seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User          = require('./models/User');
const Service       = require('./models/Service');
const Client        = require('./models/Client');
const Appointment   = require('./models/Appointment');
const Product       = require('./models/Product');
const StockMovement = require('./models/StockMovement');

const BARBERSHOP_ID = new mongoose.Types.ObjectId('69b45c241f5842be00fb9f25');

// ── Helpers ───────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rand(0, arr.length - 1)];
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const addHours = (date, h) => { const d = new Date(date); d.setHours(d.getHours() + h); return d; };

// ── Nomes brasileiros ─────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Lucas', 'Matheus', 'Gabriel', 'Pedro', 'Rafael', 'Gustavo', 'Felipe', 'Bruno',
  'João', 'Carlos', 'Eduardo', 'Thiago', 'Anderson', 'Daniel', 'Rodrigo', 'Henrique',
  'Diego', 'Alexandre', 'Leandro', 'Vinicius', 'Marcos', 'André', 'Ricardo', 'Fernando',
  'Igor', 'Caio', 'Murilo', 'Vinícius', 'Samuel', 'Arthur',
];
const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Alves',
  'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Pereira', 'Nascimento',
  'Barbosa', 'Machado', 'Mendes', 'Castro', 'Araújo', 'Dias', 'Cardoso', 'Cruz',
];
const fullName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
const phone    = () => `(${rand(11,99)}) 9${rand(1000,9999)}-${rand(1000,9999)}`;

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Conectado ao MongoDB');

  // ── 1. Criar 2 barbeiros ───────────────────────────────────────────────────
  console.log('👥  Criando barbeiros...');
  const password = await bcrypt.hash('barber123', 10);

  const barber1 = await User.create({
    name: 'Carlos Mendes',
    email: `carlos.mendes@barber-${Date.now()}@test.com`,
    password,
    role: 'barbeiro',
    barbershop: BARBERSHOP_ID,
  });
  const barber2 = await User.create({
    name: 'Rafael Souza',
    email: `rafael.souza-${Date.now()}@test.com`,
    password,
    role: 'barbeiro',
    barbershop: BARBERSHOP_ID,
  });
  console.log(`   ✓ ${barber1.name} (${barber1._id})`);
  console.log(`   ✓ ${barber2.name} (${barber2._id})`);

  // ── 2. Encontrar admin existente ───────────────────────────────────────────
  const admin = await User.findOne({ barbershop: BARBERSHOP_ID, role: 'admin' });
  if (!admin) throw new Error('Admin não encontrado para esse barbershop!');
  const allBarbers = [admin, barber1, barber2];
  console.log(`   ✓ Admin encontrado: ${admin.name}`);

  // ── 3. Criar serviços ──────────────────────────────────────────────────────
  console.log('✂️   Criando serviços...');
  const existingServices = await Service.find({ barbershop: BARBERSHOP_ID });
  let services = existingServices;

  if (existingServices.length < 3) {
    const toCreate = [
      { name: 'Corte Simples',        duration: 30, price: 35,  commission: 50, barbershop: BARBERSHOP_ID },
      { name: 'Corte + Barba',        duration: 50, price: 60,  commission: 50, barbershop: BARBERSHOP_ID },
      { name: 'Barba Completa',       duration: 30, price: 35,  commission: 50, barbershop: BARBERSHOP_ID },
      { name: 'Degradê',              duration: 40, price: 45,  commission: 50, barbershop: BARBERSHOP_ID },
      { name: 'Sobrancelha',          duration: 15, price: 20,  commission: 50, barbershop: BARBERSHOP_ID },
      { name: 'Pigmentação Capilar',  duration: 60, price: 90,  commission: 50, barbershop: BARBERSHOP_ID },
      { name: 'Relaxamento',          duration: 60, price: 80,  commission: 50, barbershop: BARBERSHOP_ID },
      { name: 'Hidratação',           duration: 45, price: 55,  commission: 50, barbershop: BARBERSHOP_ID },
    ];
    services = await Service.insertMany(toCreate);
    console.log(`   ✓ ${services.length} serviços criados`);
  } else {
    console.log(`   ✓ ${services.length} serviços já existentes`);
  }

  // ── 4. Criar clientes ──────────────────────────────────────────────────────
  console.log('👤  Criando 40 clientes...');
  const existingClients = await Client.find({ barbershop: BARBERSHOP_ID });
  let clients = existingClients;

  if (existingClients.length < 20) {
    const clientData = Array.from({ length: 40 }, () => ({
      name:       fullName(),
      phone:      phone(),
      email:      undefined,
      barbershop: BARBERSHOP_ID,
      createdAt:  addDays(new Date(), -rand(30, 120)),
    }));
    clients = await Client.insertMany(clientData);
    console.log(`   ✓ ${clients.length} clientes criados`);
  } else {
    console.log(`   ✓ ${clients.length} clientes já existentes`);
  }

  // ── 5. Criar agendamentos (1 mês atrás até 2 meses para frente) ────────────
  console.log('📅  Criando agendamentos...');
  const today    = new Date(); today.setHours(0,0,0,0);
  const startDay = addDays(today, -30);
  const endDay   = addDays(today, 60);

  const appointments = [];
  let d = new Date(startDay);

  while (d <= endDay) {
    // Pula domingo
    if (d.getDay() !== 0) {
      const slotsPerBarber = rand(4, 9);
      for (const barber of [barber1, barber2, admin]) {
        let hour = 9;
        for (let s = 0; s < slotsPerBarber; s++) {
          if (hour >= 19) break;
          const service = pick(services);
          const client  = pick(clients);
          const date    = new Date(d);
          date.setHours(hour, pick([0, 30]), 0, 0);

          let status = 'agendado';
          if (date < today)       status = Math.random() < 0.85 ? 'concluído' : 'cancelado';
          else if (date < addHours(new Date(), 2)) status = 'agendado';

          appointments.push({
            clientName: client.name,
            client:     client._id,
            service:    service._id,
            barber:     barber._id,
            barbershop: BARBERSHOP_ID,
            date,
            endDate:    addHours(date, Math.ceil(service.duration / 60)),
            status,
          });

          hour += Math.ceil(service.duration / 60) + (Math.random() < 0.3 ? 1 : 0);
        }
      }
    }
    d = addDays(d, 1);
  }

  await Appointment.insertMany(appointments);
  console.log(`   ✓ ${appointments.length} agendamentos criados`);

  // ── 6. Criar produtos ──────────────────────────────────────────────────────
  console.log('📦  Criando produtos...');
  const existingProducts = await Product.find({ barbershop: BARBERSHOP_ID });
  let products = existingProducts;

  if (existingProducts.length < 5) {
    const productData = [
      { name: 'Pomada Capilar Matte',     brand: 'BarberMen',   category: 'venda',   unit: 'un',  costPrice: 18,  salePrice: 45,  stock: 30, minStock: 5,  barbershop: BARBERSHOP_ID },
      { name: 'Pomada Capilar Brilho',    brand: 'BarberMen',   category: 'venda',   unit: 'un',  costPrice: 16,  salePrice: 40,  stock: 25, minStock: 5,  barbershop: BARBERSHOP_ID },
      { name: 'Shampoo Anti-Caspa',       brand: 'HeadShop',    category: 'venda',   unit: 'un',  costPrice: 12,  salePrice: 30,  stock: 20, minStock: 4,  barbershop: BARBERSHOP_ID },
      { name: 'Condicionador Hidratante', brand: 'HeadShop',    category: 'venda',   unit: 'un',  costPrice: 14,  salePrice: 32,  stock: 18, minStock: 4,  barbershop: BARBERSHOP_ID },
      { name: 'Perfume Masculino 100ml',  brand: 'BarberScent', category: 'venda',   unit: 'un',  costPrice: 35,  salePrice: 80,  stock: 15, minStock: 3,  barbershop: BARBERSHOP_ID },
      { name: 'Creme de Barbear 200g',    brand: 'ProBarber',   category: 'venda',   unit: 'un',  costPrice: 10,  salePrice: 25,  stock: 22, minStock: 5,  barbershop: BARBERSHOP_ID },
      { name: 'Navalha Descartável',      brand: 'Gillette',    category: 'consumo', unit: 'cx',  costPrice: 25,  salePrice: null, stock: 8, minStock: 2,  barbershop: BARBERSHOP_ID },
      { name: 'Pente Garfo Profissional', brand: 'Hercules',    category: 'consumo', unit: 'un',  costPrice: 8,   salePrice: null, stock: 12, minStock: 2, barbershop: BARBERSHOP_ID },
      { name: 'Algodão 250g',             brand: 'Generic',     category: 'consumo', unit: 'pc',  costPrice: 6,   salePrice: null, stock: 30, minStock: 5, barbershop: BARBERSHOP_ID },
      { name: 'Talco Antisséptico 100g',  brand: 'ProBarber',   category: 'consumo', unit: 'un',  costPrice: 9,   salePrice: null, stock: 3,  minStock: 5, barbershop: BARBERSHOP_ID },
      { name: 'Óleo de Barba 30ml',       brand: 'BarberOil',   category: 'venda',   unit: 'un',  costPrice: 22,  salePrice: 55,  stock: 14, minStock: 3,  barbershop: BARBERSHOP_ID },
      { name: 'Gel Fixador Forte',        brand: 'StrongGel',   category: 'venda',   unit: 'un',  costPrice: 8,   salePrice: 20,  stock: 28, minStock: 6,  barbershop: BARBERSHOP_ID },
    ];
    products = await Product.insertMany(productData);
    console.log(`   ✓ ${products.length} produtos criados`);
  } else {
    console.log(`   ✓ ${products.length} produtos já existentes`);
  }

  // ── 7. Criar movimentações de estoque ──────────────────────────────────────
  console.log('🔄  Criando movimentações de estoque...');
  const movements = [];
  const movStart  = addDays(today, -30);

  for (const product of products) {
    // Entradas iniciais (no início do período)
    movements.push({
      product:    product._id,
      barbershop: BARBERSHOP_ID,
      type:       'entrada',
      quantity:   rand(20, 50),
      unitCost:   product.costPrice,
      notes:      'Estoque inicial',
      createdBy:  admin._id,
      createdAt:  movStart,
    });

    // Movimentações ao longo do período
    const movDays = rand(8, 18);
    for (let i = 0; i < movDays; i++) {
      const movDate = addDays(movStart, rand(1, 30));
      const isVenda = product.category === 'venda' && Math.random() < 0.6;
      const isSaida = !isVenda && Math.random() < 0.4;

      if (isVenda) {
        movements.push({
          product:    product._id,
          barbershop: BARBERSHOP_ID,
          type:       'venda',
          quantity:   rand(1, 3),
          unitCost:   product.costPrice,
          unitPrice:  product.salePrice || product.costPrice * 2,
          createdBy:  pick(allBarbers)._id,
          createdAt:  movDate,
        });
      } else if (isSaida) {
        movements.push({
          product:    product._id,
          barbershop: BARBERSHOP_ID,
          type:       'saida',
          quantity:   rand(1, 2),
          unitCost:   product.costPrice,
          notes:      'Uso interno',
          createdBy:  pick(allBarbers)._id,
          createdAt:  movDate,
        });
      } else {
        // Reposição de estoque
        movements.push({
          product:    product._id,
          barbershop: BARBERSHOP_ID,
          type:       'entrada',
          quantity:   rand(5, 20),
          unitCost:   product.costPrice,
          notes:      'Reposição',
          createdBy:  admin._id,
          createdAt:  movDate,
        });
      }
    }
  }

  await StockMovement.insertMany(movements);
  console.log(`   ✓ ${movements.length} movimentações criadas`);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('\n🎉  Seed concluído com sucesso!');
  console.log(`   Barbeiros criados: Carlos Mendes, Rafael Souza`);
  console.log(`   Senha dos barbeiros: barber123`);
  console.log(`   Serviços:      ${services.length}`);
  console.log(`   Clientes:      ${clients.length}`);
  console.log(`   Agendamentos:  ${appointments.length}`);
  console.log(`   Produtos:      ${products.length}`);
  console.log(`   Movimentações: ${movements.length}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌  Erro no seed:', err.message);
  process.exit(1);
});
