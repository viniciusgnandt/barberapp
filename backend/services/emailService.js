// services/emailService.js

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = 'JubaOS <noreply@viniciusgnandt.com.br>';
const APP    = process.env.APP_URL || 'http://localhost:5173';

const sendVerificationEmail = async (to, name, token) => {
  const link = `${APP}/verify-email?token=${token}`;
  await resend.emails.send({
    from:    FROM,
    to,
    subject: 'Confirme seu e-mail — JubaOS',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#7c3aed;margin-bottom:8px">Bem-vindo ao JubaOS, ${name}!</h2>
        <p style="color:#374151;line-height:1.6">
          Para ativar sua conta, clique no botão abaixo para confirmar seu e-mail.
        </p>
        <a href="${link}"
           style="display:inline-block;margin:24px 0;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Confirmar e-mail
        </a>
        <p style="color:#6b7280;font-size:13px">
          Se você não criou uma conta, ignore este e-mail.<br>
          O link expira em 24 horas.
        </p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (to, name, token) => {
  const link = `${APP}/reset-password?token=${token}`;
  await resend.emails.send({
    from:    FROM,
    to,
    subject: 'Redefinir senha — JubaOS',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#7c3aed;margin-bottom:8px">Redefinir senha</h2>
        <p style="color:#374151;line-height:1.6">
          Olá, ${name}! Recebemos uma solicitação para redefinir a senha da sua conta.
        </p>
        <a href="${link}"
           style="display:inline-block;margin:24px 0;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Redefinir senha
        </a>
        <p style="color:#6b7280;font-size:13px">
          Se você não solicitou isso, ignore este e-mail — sua senha permanece inalterada.<br>
          O link expira em 1 hora.
        </p>
      </div>
    `,
  });
};

// Generic email sender for any purpose (2FA, invites, etc.)
const sendEmail = async ({ to, subject, html }) => {
  await resend.emails.send({ from: FROM, to, subject, html });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendEmail };
