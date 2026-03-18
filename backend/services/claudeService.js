// services/claudeService.js — Claude AI receptionist com tool use

const Anthropic   = require('@anthropic-ai/sdk');
const Client      = require('../models/Client');
const Service     = require('../models/Service');
const Appointment = require('../models/Appointment');
const User        = require('../models/User');
const Barbershop  = require('../models/Barbershop');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name:        'verificar_cliente',
    description: 'Verifica se o contato já é um cliente cadastrado na barbearia, usando o número de WhatsApp automaticamente.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:        'listar_servicos',
    description: 'Lista todos os serviços disponíveis na barbearia com nome, duração e preço.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:        'listar_profissionais',
    description: 'Lista todos os profissionais (barbeiros) disponíveis na barbearia.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:        'verificar_disponibilidade',
    description: 'Verifica os horários disponíveis para agendamento em uma data específica.',
    input_schema: {
      type: 'object',
      properties: {
        data:        { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        serviceId:   { type: 'string', description: 'ID do serviço (opcional, para calcular duração)' },
        profissionalId: { type: 'string', description: 'ID do profissional (opcional, para filtrar)' },
      },
      required: ['data'],
    },
  },
  {
    name:        'criar_agendamento',
    description: 'Cria um novo agendamento para o cliente. Usa o número de WhatsApp como identificador.',
    input_schema: {
      type: 'object',
      properties: {
        serviceId:      { type: 'string', description: 'ID do serviço' },
        profissionalId: { type: 'string', description: 'ID do profissional' },
        data:           { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        horario:        { type: 'string', description: 'Horário no formato HH:MM' },
        nomeCliente:    { type: 'string', description: 'Nome do cliente (se não cadastrado)' },
      },
      required: ['serviceId', 'profissionalId', 'data', 'horario'],
    },
  },
  {
    name:        'meus_agendamentos',
    description: 'Lista os próximos agendamentos do cliente atual (identificado pelo WhatsApp).',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name:        'cancelar_agendamento',
    description: 'Cancela um agendamento do cliente.',
    input_schema: {
      type: 'object',
      properties: {
        agendamentoId: { type: 'string', description: 'ID do agendamento a cancelar' },
      },
      required: ['agendamentoId'],
    },
  },
];

// ── Tool executors ────────────────────────────────────────────────────────────

async function executeTool(toolName, input, { barbershopId, contactPhone, contactName }) {
  try {
    switch (toolName) {

      case 'verificar_cliente': {
        const client = await Client.findOne({ barbershop: barbershopId, phone: contactPhone });
        if (client) {
          return { cadastrado: true, id: client._id, nome: client.name, telefone: client.phone, email: client.email || null };
        }
        return { cadastrado: false, telefone: contactPhone };
      }

      case 'listar_servicos': {
        const services = await Service.find({ barbershop: barbershopId, active: true }).select('_id name duration price description');
        return services.map(s => ({ id: s._id, nome: s.name, duracao_min: s.duration, preco: s.price, descricao: s.description || '' }));
      }

      case 'listar_profissionais': {
        const barbers = await User.find({ barbershop: barbershopId }).select('_id name role');
        return barbers.map(b => ({ id: b._id, nome: b.name, cargo: b.role === 'admin' ? 'Dono' : 'Barbeiro' }));
      }

      case 'verificar_disponibilidade': {
        const { data, serviceId, profissionalId } = input;
        const dateObj = new Date(data + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Seg...

        // Check barbershop opening hours
        const shop = await Barbershop.findById(barbershopId).select('openingHours');
        const dayConfig = shop.openingHours.find(d => d.day === dayOfWeek);
        if (!dayConfig?.open) {
          return { disponivel: false, motivo: 'A barbearia não abre nesse dia da semana.' };
        }

        // Service duration
        let duration = 30;
        if (serviceId) {
          const svc = await Service.findById(serviceId).select('duration');
          if (svc) duration = svc.duration;
        }

        // Get barbers to check
        const barberFilter = { barbershop: barbershopId };
        if (profissionalId) barberFilter._id = profissionalId;
        const barbers = await User.find(barberFilter).select('_id name');

        // Build time slots from opening hours
        const [fromH, fromM] = dayConfig.from.split(':').map(Number);
        const [toH,   toM]   = dayConfig.to.split(':').map(Number);
        const startMin = fromH * 60 + fromM;
        const endMin   = toH   * 60 + toM;

        const slots = [];
        for (let m = startMin; m + duration <= endMin; m += 30) {
          slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
        }

        // Get existing appointments for this date
        const startOfDay = new Date(data + 'T00:00:00');
        const endOfDay   = new Date(data + 'T23:59:59');
        const existing   = await Appointment.find({
          barbershop: barbershopId,
          date:       { $gte: startOfDay, $lte: endOfDay },
          status:     { $ne: 'cancelado' },
          ...(profissionalId ? { barber: profissionalId } : {}),
        }).select('barber date endDate');

        // Filter available slots per barber
        const result = [];
        for (const barber of barbers) {
          const barberAppts = existing.filter(a => String(a.barber) === String(barber._id));
          const freeSlots = slots.filter(slot => {
            const [h, mi] = slot.split(':').map(Number);
            const slotStart = new Date(data + `T${slot}:00`);
            const slotEnd   = new Date(slotStart.getTime() + duration * 60000);
            return !barberAppts.some(a => {
              const aStart = new Date(a.date);
              const aEnd   = a.endDate ? new Date(a.endDate) : new Date(aStart.getTime() + 30 * 60000);
              return slotStart < aEnd && slotEnd > aStart;
            });
          });
          if (freeSlots.length > 0) {
            result.push({ profissionalId: barber._id, profissional: barber.name, horarios: freeSlots });
          }
        }

        if (result.length === 0) return { disponivel: false, motivo: 'Sem horários disponíveis para essa data.' };
        return { disponivel: true, data, horarios_por_profissional: result };
      }

      case 'criar_agendamento': {
        const { serviceId, profissionalId, data, horario, nomeCliente } = input;

        const service = await Service.findById(serviceId).select('name duration price');
        if (!service) return { sucesso: false, erro: 'Serviço não encontrado.' };

        const barber = await User.findById(profissionalId);
        if (!barber) return { sucesso: false, erro: 'Profissional não encontrado.' };

        // Find or create client
        let clientDoc = await Client.findOne({ barbershop: barbershopId, phone: contactPhone });
        if (!clientDoc && (nomeCliente || contactName)) {
          clientDoc = await Client.create({
            barbershop: barbershopId,
            name:       nomeCliente || contactName,
            phone:      contactPhone,
          });
        }

        const dateObj = new Date(`${data}T${horario}:00`);
        const endDate = new Date(dateObj.getTime() + service.duration * 60000);

        // Check for conflict
        const conflict = await Appointment.findOne({
          barbershop: barbershopId,
          barber:     profissionalId,
          status:     { $ne: 'cancelado' },
          date:       { $lt: endDate },
          endDate:    { $gt: dateObj },
        });
        if (conflict) return { sucesso: false, erro: 'Horário não disponível. Por favor escolha outro horário.' };

        const appt = await Appointment.create({
          barbershop: barbershopId,
          barber:     profissionalId,
          service:    serviceId,
          client:     clientDoc?._id || undefined,
          clientName: clientDoc?.name || nomeCliente || contactName || contactPhone,
          date:       dateObj,
          endDate,
          status:     'agendado',
          notes:      `Agendado via WhatsApp (${contactPhone})`,
        });

        return {
          sucesso: true,
          mensagem: `${service.name} — ${data} às ${horario}.`,
        };
      }

      case 'meus_agendamentos': {
        const clientDoc = await Client.findOne({ barbershop: barbershopId, phone: contactPhone });
        const now = new Date();

        let appts;
        if (clientDoc) {
          appts = await Appointment.find({
            barbershop: barbershopId,
            client:     clientDoc._id,
            date:       { $gte: now },
            status:     'agendado',
          }).populate('service', 'name').populate('barber', 'name').sort({ date: 1 }).limit(5);
        } else {
          appts = await Appointment.find({
            barbershop: barbershopId,
            notes:      { $regex: contactPhone },
            date:       { $gte: now },
            status:     'agendado',
          }).populate('service', 'name').populate('barber', 'name').sort({ date: 1 }).limit(5);
        }

        if (!appts.length) return { agendamentos: [], mensagem: 'Nenhum agendamento futuro encontrado.' };

        return {
          agendamentos: appts.map(a => ({
            id:          a._id,
            data:        a.date.toLocaleDateString('pt-BR'),
            horario:     a.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            servico:     a.service?.name || '—',
            profissional: a.barber?.name || '—',
            status:      a.status,
          })),
        };
      }

      case 'cancelar_agendamento': {
        const { agendamentoId } = input;
        const clientDoc = await Client.findOne({ barbershop: barbershopId, phone: contactPhone });

        const appt = await Appointment.findOne({
          _id:        agendamentoId,
          barbershop: barbershopId,
          status:     'agendado',
          $or: [
            { client: clientDoc?._id },
            { notes: { $regex: contactPhone } },
          ],
        });

        if (!appt) return { sucesso: false, erro: 'Agendamento não encontrado ou não pertence a este contato.' };

        appt.status = 'cancelado';
        await appt.save();
        return { sucesso: true, mensagem: 'Agendamento cancelado com sucesso.' };
      }

      default:
        return { erro: 'Ferramenta desconhecida.' };
    }
  } catch (err) {
    console.error(`[Tool ${toolName}] Error:`, err.message);
    return { erro: err.message };
  }
}

// ── Main: agentic loop ────────────────────────────────────────────────────────

async function generateReply(barbershopName, messages, context) {
  const { barbershopId, contactPhone, contactName } = context;

  const now = new Date();
  const dataHoje = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const horaAgora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const systemPrompt = `Você é um recepcionista virtual da barbearia "${barbershopName}". Atende clientes via WhatsApp de forma amigável e profissional.

Data e hora atual: ${dataHoje}, ${horaAgora}
O número de WhatsApp do cliente atual é: ${contactPhone}
${contactName ? `Nome do contato no WhatsApp: ${contactName}` : ''}

Você tem acesso a ferramentas para:
- Verificar se o cliente já está cadastrado
- Listar serviços disponíveis e profissionais
- Verificar disponibilidade de horários
- Criar agendamentos
- Consultar e cancelar agendamentos do cliente

REGRAS:
- Responda de forma curta e objetiva. Use no máximo 2 frases. Nunca escreva respostas longas. Se possível responda em uma única frase. Sem saudações, sem despedidas, sem repetir o que o cliente disse. Sem emojis. Responda sempre em português.
- Nunca peça o telefone — já temos.
- Cliente não cadastrado: peça só o nome.
- Use ferramentas para respostas precisas.

Agendamento:
- SEMPRE use verificar_disponibilidade antes de sugerir qualquer horário. Nunca sugira horário sem checar.
- Apresente apenas horários confirmados como livres pela ferramenta.
- Após o cliente escolher, chame verificar_disponibilidade novamente para confirmar que o horário ainda está livre antes de criar.
- Só então chame criar_agendamento. Isso evita duplicidade.
- Confirmação: informe apenas serviço, data e horário. Nada mais.`;

  const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));

  // Agentic loop — max 8 tool iterations
  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      TOOLS,
      messages:   apiMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock?.text || '…';
    }

    if (response.stop_reason === 'tool_use') {
      // Add Claude's response (with tool_use blocks) to messages
      apiMessages.push({ role: 'assistant', content: response.content });

      // Execute all requested tools in parallel
      const toolResults = await Promise.all(
        response.content
          .filter(b => b.type === 'tool_use')
          .map(async (b) => {
            const result = await executeTool(b.name, b.input, { barbershopId, contactPhone, contactName });
            return {
              type:        'tool_result',
              tool_use_id: b.id,
              content:     JSON.stringify(result),
            };
          })
      );

      apiMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason
    break;
  }

  return 'Desculpe, não consegui processar sua solicitação no momento.';
}

module.exports = { generateReply };
