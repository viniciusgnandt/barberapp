// services/notificationService.js — Envia lembretes de agendamento via WhatsApp

const Barbershop  = require('../models/Barbershop');
const Appointment = require('../models/Appointment');
const { sendToPhone, isConnected } = require('./whatsappService');

function toMinutes(leadTime, leadUnit) {
  if (leadUnit === 'minutos') return leadTime;
  if (leadUnit === 'horas')   return leadTime * 60;
  if (leadUnit === 'dias')    return leadTime * 60 * 24;
  return leadTime;
}

function notifKey(leadTime, leadUnit) {
  return `${leadTime}_${leadUnit}`;
}

async function checkAndSendNotifications() {
  try {
    const shops = await Barbershop.find({ 'notifications.enabled': true }).select('_id notifications');

    for (const shop of shops) {
      // Skip if WhatsApp is not connected for this shop
      if (!isConnected(shop._id)) continue;

      for (const item of shop.notifications.items) {
        const { leadTime, leadUnit } = item;
        const leadMs  = toMinutes(leadTime, leadUnit) * 60 * 1000;
        const key     = notifKey(leadTime, leadUnit);
        const now     = Date.now();

        // Window: appointments starting between (now + lead - 1min) and (now + lead + 1min)
        const windowStart = new Date(now + leadMs - 60_000);
        const windowEnd   = new Date(now + leadMs + 60_000);

        const appts = await Appointment.find({
          barbershop:        shop._id,
          status:            'agendado',
          date:              { $gte: windowStart, $lte: windowEnd },
          notificationsSent: { $ne: key },
        })
          .populate('client',  'name phone')
          .populate('service', 'name')
          .populate('barber',  'name');

        for (const appt of appts) {
          const phone = appt.client?.phone;
          if (!phone) continue;

          const horario = appt.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const servico = appt.service?.name || 'seu serviço';
          const barbeiro = appt.barber?.name  || '';

          const leadLabel = leadUnit === 'minutos'
            ? `${leadTime} minuto${leadTime > 1 ? 's' : ''}`
            : leadUnit === 'horas'
            ? `${leadTime} hora${leadTime > 1 ? 's' : ''}`
            : `${leadTime} dia${leadTime > 1 ? 's' : ''}`;

          const msg = `Lembrete: ${servico}${barbeiro ? ` com ${barbeiro}` : ''} hoje às ${horario} (em ${leadLabel}).`;

          try {
            await sendToPhone(shop._id, phone, msg);
            await Appointment.updateOne({ _id: appt._id }, { $push: { notificationsSent: key } });
            console.log(`[Notification] Lembrete enviado para ${phone} — ${msg}`);
          } catch (err) {
            console.warn(`[Notification] Falha ao enviar para ${phone}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Notification] Erro no ciclo de notificações:', err.message);
  }
}

function startNotificationScheduler() {
  console.log('[Notification] Scheduler iniciado (verifica a cada 60s).');
  setInterval(checkAndSendNotifications, 60_000);
  // Also run immediately on startup to catch any missed window
  checkAndSendNotifications();
}

module.exports = { startNotificationScheduler };
