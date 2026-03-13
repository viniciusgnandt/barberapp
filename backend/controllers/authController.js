// controllers/authController.js

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, barbershopId, barbershopName } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios.' });

    let barbershop = null;

    if (barbershopId) {
      // Entrar em barbearia existente (barbeiro sendo adicionado por link/código)
      barbershop = await Barbershop.findById(barbershopId);
      if (!barbershop)
        return res.status(400).json({ success: false, message: 'Barbearia não encontrada.' });

      if (await User.findOne({ email, barbershop: barbershop._id }))
        return res.status(400).json({ success: false, message: 'Email já cadastrado nesta barbearia.' });

      const user = await User.create({
        name, email, password,
        role: role || 'barbeiro',
        barbershop: barbershop._id,
      });

      return res.status(201).json({
        success: true,
        token: makeToken(user._id),
        user: {
          id: user._id, name: user.name, email: user.email, role: user.role,
          barbershop: barbershop._id, barbershopName: barbershop.name,
          barbershopLogo: barbershop.logo || null,
          profileImage: user.profileImage || null,
        },
      });
    }

    if (barbershopName) {
      // Criar nova barbearia — 3 passos com limpeza em caso de falha
      // Passo 1: barbershop sem owner (schema permite null agora)
      barbershop = await Barbershop.create({ name: barbershopName, email });

      try {
        // Passo 2: criar admin vinculado à barbearia
        const user = await User.create({
          name, email, password, role: 'admin',
          barbershop: barbershop._id,
        });

        // Passo 3: setar owner
        barbershop.owner = user._id;
        await barbershop.save();

        return res.status(201).json({
          success: true,
          token: makeToken(user._id),
          user: {
            id: user._id, name: user.name, email: user.email, role: user.role,
            barbershop: barbershop._id, barbershopName: barbershop.name,
            barbershopLogo: barbershop.logo || null,
            profileImage: user.profileImage || null,
          },
        });
      } catch (innerErr) {
        await Barbershop.deleteOne({ _id: barbershop._id }); // rollback
        throw innerErr;
      }
    }

    return res.status(400).json({ success: false, message: 'barbershopId ou barbershopName obrigatório.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email e senha são obrigatórios.' });

    const user = await User.findOne({ email }).populate('barbershop');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    const token = makeToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        barbershop: user.barbershop._id,
        barbershopName: user.barbershop.name,
        barbershopLogo: user.barbershop.logo || null,
        profileImage: user.profileImage || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
const getMe = (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    user: {
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      barbershop: u.barbershop?._id,
      barbershopName: u.barbershop?.name,
      barbershopLogo: u.barbershop?.logo || null,
      profileImage: u.profileImage || null,
    },
  });
};

module.exports = { register, login, getMe };
