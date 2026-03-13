// controllers/userController.js — Perfil do usuário

const User = require('../models/User');

// GET /api/users/me — Retorna o perfil completo do usuário logado
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('barbershop', 'name logo');
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/me — Atualiza nome e/ou senha do usuário logado
const updateMe = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (name)  user.name = name;

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ success: false, message: 'Informe a senha atual.' });

      const ok = await user.comparePassword(currentPassword);
      if (!ok)
        return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });

      user.password = newPassword; // hash automático pelo pre-save hook
    }

    await user.save();

    res.json({
      success: true,
      data: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        role:         user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getMe, updateMe };
