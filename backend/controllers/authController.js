// controllers/authController.js

const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const Barbershop = require('../models/Barbershop');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Password policy: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePassword(password) {
  if (!PASSWORD_POLICY.test(password)) {
    return 'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas e números.';
  }
  return null;
}

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
    const { name, email, password, role, barbershopId, barbershopName, establishmentType, phone, document, address, neighborhood, zipCode, city, state } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios.' });

    const pwdError = validatePassword(password);
    if (pwdError) return res.status(400).json({ success: false, message: pwdError });

    let barbershop = null;

    if (barbershopId) {
      return res.status(403).json({
        success: false,
        message: 'O cadastro de funcionários é realizado pelo administrador do estabelecimento.',
      });
    }

    if (barbershopName) {
      const now     = new Date();
      const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      barbershop = await Barbershop.create({
        name:              barbershopName,
        email,
        establishmentType: establishmentType || 'barbearia',
        phone:             phone   || undefined,
        document:          document || undefined,
        address:      address      || undefined,
        neighborhood: neighborhood || undefined,
        zipCode:      zipCode      || undefined,
        city:         city         || undefined,
        state:        state        || undefined,
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
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const user = await User.create({
          name, email, password, role: 'admin',
          barbershop:             barbershop._id,
          emailVerified:          false,
          emailVerificationToken: verificationToken,
        });

        barbershop.owner = user._id;
        await barbershop.save();

        // Send verification email (non-blocking — don't fail registration if email fails)
        sendVerificationEmail(email, name, verificationToken).catch(err =>
          console.error('[emailService] Failed to send verification email:', err)
        );

        return res.status(201).json({
          success: true,
          message: 'Conta criada! Verifique seu e-mail para ativar o acesso.',
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

    const users = await User.find({ email }).populate('barbershop');

    // Specific error when email doesn't exist at all
    if (!users.length)
      return res.status(401).json({ success: false, message: 'Nenhuma conta encontrada com este e-mail.' });

    // Check password
    const matched = [];
    for (const u of users) {
      if (await u.comparePassword(password)) matched.push(u);
    }

    if (!matched.length)
      return res.status(401).json({ success: false, message: 'Senha incorreta.' });

    // Email verification check (skip for legacy accounts where emailVerified is null)
    const unverified = matched.filter(u => u.emailVerified === false);
    if (unverified.length === matched.length) {
      return res.status(403).json({
        success: false,
        message: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
        needsEmailVerification: true,
      });
    }

    // Filter to only verified (or legacy null) profiles
    const verifiedMatched = matched.filter(u => u.emailVerified !== false);

    if (verifiedMatched.length === 1) {
      const u = verifiedMatched[0];
      return res.json({
        success: true,
        token:   makeToken(u._id),
        user:    formatUser(u, u.barbershop),
      });
    }

    // Multiple profiles
    return res.json({
      success:        true,
      needsSelection: true,
      profiles: verifiedMatched.map(u => ({
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

// GET /api/auth/verify-email/:token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ emailVerificationToken: token, emailVerified: false });
    if (!user)
      return res.status(400).json({ success: false, message: 'Token inválido ou já utilizado.' });

    user.emailVerified          = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({ success: true, message: 'E-mail confirmado! Você já pode fazer login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'E-mail obrigatório.' });

    const user = await User.findOne({ email, emailVerified: false });
    // Always return success to avoid email enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.emailVerificationToken = token;
      await user.save();
      sendVerificationEmail(email, user.name, token).catch(err =>
        console.error('[emailService] resend verification failed:', err)
      );
    }

    res.json({ success: true, message: 'Se houver uma conta pendente de confirmação, o e-mail foi reenviado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'E-mail obrigatório.' });

    const users = await User.find({ email });
    // Always return success to avoid email enumeration
    if (users.length) {
      const token   = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Apply token to all profiles with this email
      await User.updateMany({ email }, { passwordResetToken: token, passwordResetExpires: expires });

      sendPasswordResetEmail(email, users[0].name, token).catch(err =>
        console.error('[emailService] forgot-password failed:', err)
      );
    }

    res.json({ success: true, message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { token }    = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ success: false, message: 'Nova senha obrigatória.' });

    const pwdError = validatePassword(password);
    if (pwdError) return res.status(400).json({ success: false, message: pwdError });

    const users = await User.find({
      passwordResetToken:   token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!users.length)
      return res.status(400).json({ success: false, message: 'Token inválido ou expirado.' });

    await Promise.all(users.map(async (u) => {
      u.password             = password;
      u.passwordResetToken   = undefined;
      u.passwordResetExpires = undefined;
      // Also mark email as verified if they reset password
      if (u.emailVerified === false) u.emailVerified = true;
      await u.save();
    }));

    res.json({ success: true, message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
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

module.exports = { register, login, verifyEmail, resendVerification, forgotPassword, resetPassword, selectProfile, switchProfile, getProfiles, getMe };
