// controllers/authController.js

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const Barbershop = require('../models/Barbershop');

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

function formatUser(user, barbershop) {
  return {
    id:             user._id,
    name:           user.name,
    email:          user.email,
    role:           user.role,
    barbershop:     barbershop._id,
    barbershopName: barbershop.name,
    barbershopLogo: barbershop.logo || null,
    profileImage:   user.profileImage || null,
  };
}

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, barbershopId, barbershopName } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios.' });

    let barbershop = null;

    if (barbershopId) {
      // Funcionários agora são criados apenas pelo admin via painel
      return res.status(403).json({
        success: false,
        message: 'O cadastro de funcionários é realizado pelo administrador do estabelecimento.',
      });
    }

    if (barbershopName) {
      const now     = new Date();
      const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      barbershop = await Barbershop.create({
        name: barbershopName,
        email,
        plan:          'trial',
        planStatus:    'active',
        planExpiresAt: expires,
        invoices: [{
          description: 'Período Gratuito — 30 dias',
          amount:      0,
          status:      'paid',
          paidAt:      now,
        }],
      });

      try {
        const user = await User.create({
          name, email, password, role: 'admin',
          barbershop: barbershop._id,
        });

        barbershop.owner = user._id;
        await barbershop.save();

        return res.status(201).json({
          success: true,
          token: makeToken(user._id),
          user:  formatUser(user, barbershop),
        });
      } catch (innerErr) {
        await Barbershop.deleteOne({ _id: barbershop._id });
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

    // Busca TODOS os perfis com esse email
    const users = await User.find({ email }).populate('barbershop');
    if (!users.length)
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    // Verifica senha em cada perfil (mesmo email, bcrypt diferente por perfil)
    const matched = [];
    for (const u of users) {
      if (await u.comparePassword(password)) matched.push(u);
    }

    if (!matched.length)
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    // Um único perfil → login direto
    if (matched.length === 1) {
      const u = matched[0];
      return res.json({
        success: true,
        token:   makeToken(u._id),
        user:    formatUser(u, u.barbershop),
      });
    }

    // Múltiplos perfis → retorna lista para seleção (sem emitir JWT ainda)
    return res.json({
      success:        true,
      needsSelection: true,
      profiles: matched.map(u => ({
        id:             u._id,
        name:           u.name,
        email:          u.email,
        role:           u.role,
        barbershop:     u.barbershop._id,
        barbershopName: u.barbershop.name,
        barbershopLogo: u.barbershop.logo || null,
        profileImage:   u.profileImage || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/select-profile  (sem autenticação — usa email+senha+profileId)
const selectProfile = async (req, res) => {
  try {
    const { email, password, profileId } = req.body;
    if (!email || !password || !profileId)
      return res.status(400).json({ success: false, message: 'email, password e profileId são obrigatórios.' });

    const user = await User.findOne({ _id: profileId, email }).populate('barbershop');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    res.json({
      success: true,
      token:   makeToken(user._id),
      user:    formatUser(user, user.barbershop),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/switch-profile  (requer autenticação — sem senha, usa JWT atual)
const switchProfile = async (req, res) => {
  try {
    const { profileId } = req.body;
    if (!profileId)
      return res.status(400).json({ success: false, message: 'profileId é obrigatório.' });

    // Garante que o perfil alvo pertence ao mesmo email do usuário logado
    const target = await User.findOne({ _id: profileId, email: req.user.email }).populate('barbershop');
    if (!target)
      return res.status(404).json({ success: false, message: 'Perfil não encontrado.' });

    res.json({
      success: true,
      token:   makeToken(target._id),
      user:    formatUser(target, target.barbershop),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/profiles  (requer autenticação)
const getProfiles = async (req, res) => {
  try {
    const profiles = await User.find({ email: req.user.email })
      .populate('barbershop', 'name logo')
      .select('-password');

    res.json({
      success: true,
      profiles: profiles.map(u => ({
        id:             u._id,
        name:           u.name,
        email:          u.email,
        role:           u.role,
        barbershop:     u.barbershop._id,
        barbershopName: u.barbershop.name,
        barbershopLogo: u.barbershop.logo || null,
        profileImage:   u.profileImage || null,
      })),
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
      id:             u._id,
      name:           u.name,
      email:          u.email,
      role:           u.role,
      barbershop:     u.barbershop?._id,
      barbershopName: u.barbershop?.name,
      barbershopLogo: u.barbershop?.logo || null,
      profileImage:   u.profileImage || null,
    },
  });
};

module.exports = { register, login, selectProfile, switchProfile, getProfiles, getMe };
