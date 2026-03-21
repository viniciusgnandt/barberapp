// controllers/platformAdminController.js — Platform admin auth + dashboard

const crypto        = require('crypto');
const jwt           = require('jsonwebtoken');
const PlatformAdmin = require('../models/PlatformAdmin');
const Barbershop    = require('../models/Barbershop');
const User          = require('../models/User');
const Appointment   = require('../models/Appointment');
const ReceptionConversation = require('../models/ReceptionConversation');
const { sendEmail } = require('../services/emailService');

const makeToken = (id) =>
  jwt.sign({ id, type: 'platform-admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });

function generate6Digit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── POST /api/platform/auth/login ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email e senha obrigatórios.' });

    const admin = await PlatformAdmin.findOne({ email: email.toLowerCase().trim(), active: true })
      .select('+password +twoFactorCode +twoFactorExpires');
    if (!admin || !(await admin.comparePassword(password))) {
      if (req.bruteForce) req.bruteForce.recordFailure();
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    if (req.bruteForce) req.bruteForce.recordSuccess();

    // Generate 2FA code and send via email
    const code    = generate6Digit();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    admin.twoFactorCode    = code;
    admin.twoFactorExpires = expires;
    await admin.save();

    // Send code via Resend
    try {
      await sendEmail({
        to:      admin.email,
        subject: 'Codigo de verificacao — Painel Admin',
        html:    `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;text-align:center;">
          <h2 style="color:#1a1a1a;">Codigo de Verificacao</h2>
          <p style="color:#666;font-size:14px;">Use o codigo abaixo para acessar o painel:</p>
          <div style="background:#f5f5f5;border-radius:12px;padding:24px;margin:20px 0;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111;">${code}</span>
          </div>
          <p style="color:#999;font-size:12px;">Valido por 10 minutos. Nao compartilhe este codigo.</p>
        </div>`,
      });
    } catch (emailErr) {
      console.error('[PlatformAdmin] Failed to send 2FA email:', emailErr);
      return res.status(500).json({ success: false, message: 'Erro ao enviar código de verificação.' });
    }

    res.json({
      success:        true,
      needsTwoFactor: true,
      message:        'Código de verificação enviado para seu email.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/platform/auth/verify-2fa ────────────────────────────────────────
const verify2FA = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ success: false, message: 'Email e código obrigatórios.' });

    const admin = await PlatformAdmin.findOne({ email: email.toLowerCase().trim(), active: true })
      .select('+twoFactorCode +twoFactorExpires');
    if (!admin)
      return res.status(401).json({ success: false, message: 'Admin não encontrado.' });

    if (!admin.twoFactorCode || !admin.twoFactorExpires || admin.twoFactorExpires < new Date())
      return res.status(401).json({ success: false, message: 'Código expirado. Faça login novamente.' });

    if (admin.twoFactorCode !== code.trim())
      return res.status(401).json({ success: false, message: 'Código inválido.' });

    // Clear 2FA code and update last login
    admin.twoFactorCode    = undefined;
    admin.twoFactorExpires = undefined;
    admin.lastLoginAt      = new Date();
    await admin.save();

    res.json({
      success: true,
      token:   makeToken(admin._id),
      admin:   { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/platform/auth/me ─────────────────────────────────────────────────
const getMe = (req, res) => {
  const a = req.platformAdmin;
  res.json({
    success: true,
    admin: { id: a._id, name: a.name, email: a.email, role: a.role, lastLoginAt: a.lastLoginAt },
  });
};

// ── GET /api/platform/dashboard ───────────────────────────────────────────────
const getDashboard = async (_req, res) => {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalBarbershops,
      activeBarbershops,
      newThisMonth,
      newLastMonth,
      totalUsers,
      totalAppointments,
    ] = await Promise.all([
      Barbershop.countDocuments(),
      Barbershop.countDocuments({ status: 'active' }),
      Barbershop.countDocuments({ createdAt: { $gte: monthStart } }),
      Barbershop.countDocuments({ createdAt: { $gte: lastMonth, $lte: lastMonthEnd } }),
      User.countDocuments(),
      Appointment.countDocuments(),
    ]);

    // Revenue from invoices across all barbershops
    const revenueAgg = await Barbershop.aggregate([
      { $unwind: '$invoices' },
      { $match: { 'invoices.status': 'paid', 'invoices.amount': { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$invoices.amount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Revenue this month
    const monthRevenueAgg = await Barbershop.aggregate([
      { $unwind: '$invoices' },
      { $match: { 'invoices.status': 'paid', 'invoices.paidAt': { $gte: monthStart }, 'invoices.amount': { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$invoices.amount' } } },
    ]);
    const monthRevenue = monthRevenueAgg[0]?.total || 0;

    // Plan distribution
    const planDist = await Barbershop.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    const growthRate = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth * 100).toFixed(1) : newThisMonth > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        totalBarbershops,
        activeBarbershops,
        newThisMonth,
        growthRate: Number(growthRate),
        totalUsers,
        totalAppointments,
        totalRevenue,
        monthRevenue,
        planDistribution: planDist.reduce((acc, p) => { acc[p._id || 'none'] = p.count; return acc; }, {}),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/platform/clients ─────────────────────────────────────────────────
const getClients = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, plan, status } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (plan)   filter.plan = plan;
    if (status) filter.status = status;

    const [shops, total] = await Promise.all([
      Barbershop.find(filter)
        .select('name email phone plan planStatus planExpiresAt status createdAt messagePackages invoices')
        .populate('owner', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Barbershop.countDocuments(filter),
    ]);

    const clients = shops.map(s => {
      const revenue = (s.invoices || []).filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0);
      const aiUsage = (s.messagePackages || []).reduce((sum, p) => sum + (p.messages - p.remaining), 0);
      return {
        id:        s._id,
        name:      s.name,
        email:     s.email,
        owner:     s.owner ? { name: s.owner.name, email: s.owner.email } : null,
        plan:      s.plan,
        planStatus: s.planStatus,
        status:    s.status,
        revenue,
        aiUsage,
        createdAt: s.createdAt,
      };
    });

    res.json({ success: true, data: { clients, total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/platform/ai-stats ────────────────────────────────────────────────
const getAIStats = async (_req, res) => {
  try {
    // AI usage from message packages
    const packageStats = await Barbershop.aggregate([
      { $unwind: '$messagePackages' },
      {
        $group: {
          _id: null,
          totalMessages:    { $sum: '$messagePackages.messages' },
          totalUsed:        { $sum: { $subtract: ['$messagePackages.messages', '$messagePackages.remaining'] } },
          totalRemaining:   { $sum: '$messagePackages.remaining' },
        },
      },
    ]);

    // AI conversations count
    const totalConversations = await ReceptionConversation.countDocuments();
    const totalMessagesInConversations = await ReceptionConversation.aggregate([
      { $project: { msgCount: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$msgCount' } } },
    ]);

    // Top consumers (barbershops by AI usage)
    const topConsumers = await Barbershop.aggregate([
      { $unwind: '$messagePackages' },
      {
        $group: {
          _id:  '$_id',
          name: { $first: '$name' },
          used: { $sum: { $subtract: ['$messagePackages.messages', '$messagePackages.remaining'] } },
        },
      },
      { $sort: { used: -1 } },
      { $limit: 10 },
    ]);

    // Conversations per barbershop
    const convPerShop = await ReceptionConversation.aggregate([
      { $group: { _id: '$barbershop', conversations: { $sum: 1 }, messages: { $sum: { $size: '$messages' } } } },
      { $sort: { messages: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'barbershops', localField: '_id', foreignField: '_id', as: 'shop' } },
      { $unwind: '$shop' },
      { $project: { name: '$shop.name', conversations: 1, messages: 1 } },
    ]);

    const stats = packageStats[0] || { totalMessages: 0, totalUsed: 0, totalRemaining: 0 };

    res.json({
      success: true,
      data: {
        packages: {
          totalPurchased: stats.totalMessages,
          totalUsed:      stats.totalUsed,
          totalRemaining: stats.totalRemaining,
        },
        conversations: {
          total:         totalConversations,
          totalMessages: totalMessagesInConversations[0]?.total || 0,
        },
        topConsumers,
        conversationsByShop: convPerShop,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin user management ─────────────────────────────────────────────────────

// GET /api/platform/admins
const getAdmins = async (req, res) => {
  try {
    const admins = await PlatformAdmin.find().select('-twoFactorCode -twoFactorExpires').sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/platform/admins/invite
const inviteAdmin = async (req, res) => {
  try {
    const { email, name, role = 'admin' } = req.body;
    if (!email || !name)
      return res.status(400).json({ success: false, message: 'Nome e email obrigatórios.' });

    const exists = await PlatformAdmin.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(400).json({ success: false, message: 'Admin já cadastrado.' });

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const tempPassword = crypto.randomBytes(16).toString('hex');

    const admin = await PlatformAdmin.create({
      name,
      email: email.toLowerCase().trim(),
      password: tempPassword,
      role,
      inviteToken,
      inviteExpires:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      inviteAccepted: false,
      createdBy:      req.platformAdmin._id,
    });

    const inviteUrl = `${process.env.FRONTEND_URL}/painel-administrativo/accept-invite?token=${inviteToken}`;

    try {
      await sendEmail({
        to:      email,
        subject: 'Convite — Painel Administrativo',
        html:    `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <h2>Voce foi convidado!</h2>
          <p>${req.platformAdmin.name} convidou voce para ser administrador da plataforma.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:20px 0;">Aceitar convite</a>
          <p style="color:#999;font-size:12px;">Este convite expira em 7 dias.</p>
        </div>`,
      });
    } catch (emailErr) {
      console.error('[PlatformAdmin] invite email failed:', emailErr);
    }

    res.status(201).json({ success: true, message: 'Convite enviado.', data: { id: admin._id, email, name } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/platform/auth/accept-invite
const acceptInvite = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ success: false, message: 'Token e senha obrigatórios.' });

    const admin = await PlatformAdmin.findOne({
      inviteToken:   token,
      inviteExpires: { $gt: new Date() },
      inviteAccepted: false,
    });
    if (!admin)
      return res.status(400).json({ success: false, message: 'Convite inválido ou expirado.' });

    admin.password       = password;
    admin.inviteAccepted = true;
    admin.inviteToken    = undefined;
    admin.inviteExpires  = undefined;
    await admin.save();

    res.json({ success: true, message: 'Conta ativada! Faça login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/platform/admins/:id/reset-password
const resetAdminPassword = async (req, res) => {
  try {
    const admin = await PlatformAdmin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin não encontrado.' });

    const tempPassword = crypto.randomBytes(12).toString('hex');
    admin.password = tempPassword;
    await admin.save();

    try {
      await sendEmail({
        to:      admin.email,
        subject: 'Senha redefinida — Painel Admin',
        html:    `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;">
          <h2>Sua senha foi redefinida</h2>
          <p>Sua nova senha temporária:</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
            <code style="font-size:18px;color:#111;">${tempPassword}</code>
          </div>
          <p style="color:#999;font-size:12px;">Altere sua senha após o primeiro login.</p>
        </div>`,
      });
    } catch (emailErr) {
      console.error('[PlatformAdmin] reset password email failed:', emailErr);
    }

    res.json({ success: true, message: 'Nova senha enviada por email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/platform/auth/forgot-password — sends reset code via email (no auth needed)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email obrigatório.' });

    const admin = await PlatformAdmin.findOne({ email: email.toLowerCase().trim(), active: true })
      .select('+twoFactorCode +twoFactorExpires');

    // Always return success to avoid email enumeration
    if (admin) {
      const code    = generate6Digit();
      const expires = new Date(Date.now() + 10 * 60 * 1000);
      admin.twoFactorCode    = code;
      admin.twoFactorExpires = expires;
      await admin.save();

      try {
        await sendEmail({
          to:      admin.email,
          subject: 'Redefinir senha — Painel Admin',
          html:    `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;text-align:center;">
            <h2 style="color:#1a1a1a;">Redefinir senha</h2>
            <p style="color:#666;font-size:14px;">Use o codigo abaixo para redefinir sua senha:</p>
            <div style="background:#f5f5f5;border-radius:12px;padding:24px;margin:20px 0;">
              <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111;">${code}</span>
            </div>
            <p style="color:#999;font-size:12px;">Valido por 10 minutos.</p>
          </div>`,
        });
      } catch (emailErr) {
        console.error('[PlatformAdmin] forgot-password email failed:', emailErr);
      }
    }

    res.json({ success: true, message: 'Se o email estiver cadastrado, voce recebera um codigo.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/platform/auth/reset-password — verify code + set new password
const resetPasswordWithCode = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword)
      return res.status(400).json({ success: false, message: 'Email, codigo e nova senha obrigatorios.' });

    if (newPassword.length < 8)
      return res.status(400).json({ success: false, message: 'Senha deve ter no minimo 8 caracteres.' });

    const admin = await PlatformAdmin.findOne({ email: email.toLowerCase().trim(), active: true })
      .select('+twoFactorCode +twoFactorExpires +password');

    if (!admin || !admin.twoFactorCode || admin.twoFactorExpires < new Date() || admin.twoFactorCode !== code.trim())
      return res.status(401).json({ success: false, message: 'Codigo invalido ou expirado.' });

    admin.password         = newPassword;
    admin.twoFactorCode    = undefined;
    admin.twoFactorExpires = undefined;
    await admin.save();

    res.json({ success: true, message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/platform/auth/change-password — change own password (requires auth)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Senha atual e nova senha obrigatorias.' });

    if (newPassword.length < 8)
      return res.status(400).json({ success: false, message: 'Senha deve ter no minimo 8 caracteres.' });

    const admin = await PlatformAdmin.findById(req.platformAdmin._id).select('+password');
    if (!admin || !(await admin.comparePassword(currentPassword)))
      return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });

    admin.password = newPassword;
    await admin.save();

    res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  login, verify2FA, getMe, acceptInvite,
  forgotPassword, resetPasswordWithCode, changePassword,
  getDashboard, getClients, getAIStats,
  getAdmins, inviteAdmin, resetAdminPassword,
};
