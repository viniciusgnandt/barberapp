// services/chatService.js — Lia: assistente de plataforma para profissionais

const Anthropic   = require('@anthropic-ai/sdk');
const Service     = require('../models/Service');
const Appointment = require('../models/Appointment');
const Client      = require('../models/Client');
const User        = require('../models/User');
const Barbershop  = require('../models/Barbershop');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Tool definitions ──────────────────────────────────────────────────────────

const CHAT_TOOLS = [
  {
    name: 'listar_agendamentos',
    description: 'Lista agendamentos da barbearia. Pode filtrar por data, status ou profissional.',
    input_schema: {
      type: 'object',
      properties: {
        data:          { type: 'string', description: 'Data no formato YYYY-MM-DD (opcional). Se omitida, retorna agendamentos de hoje.' },
        status:        { type: 'string', enum: ['agendado', 'concluido', 'cancelado'], description: 'Filtrar por status (opcional)' },
        profissionalId: { type: 'string', description: 'ID do profissional para filtrar (opcional)' },
        limite:        { type: 'number', description: 'Máximo de resultados (padrão 20)' },
      },
      required: [],
    },
  },
  {
    name: 'listar_servicos',
    description: 'Lista todos os serviços cadastrados na barbearia com nome, duração e preço.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'listar_profissionais',
    description: 'Lista todos os profissionais (barbeiros/funcionários) da barbearia.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'listar_clientes',
    description: 'Lista clientes da barbearia. Pode buscar por nome ou telefone.',
    input_schema: {
      type: 'object',
      properties: {
        busca:  { type: 'string', description: 'Texto para buscar por nome ou telefone do cliente' },
        limite: { type: 'number', description: 'Máximo de resultados (padrão 20)' },
      },
      required: [],
    },
  },
  {
    name: 'criar_agendamento',
    description: 'Cria um novo agendamento na barbearia.',
    input_schema: {
      type: 'object',
      properties: {
        nomeCliente:    { type: 'string', description: 'Nome do cliente' },
        telefoneCliente:{ type: 'string', description: 'Telefone do cliente (opcional)' },
        serviceId:      { type: 'string', description: 'ID do serviço' },
        profissionalId: { type: 'string', description: 'ID do profissional' },
        data:           { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        horario:        { type: 'string', description: 'Horário no formato HH:MM' },
      },
      required: ['nomeCliente', 'serviceId', 'profissionalId', 'data', 'horario'],
    },
  },
  {
    name: 'cancelar_agendamento',
    description: 'Cancela um agendamento existente.',
    input_schema: {
      type: 'object',
      properties: {
        agendamentoId: { type: 'string', description: 'ID do agendamento a cancelar' },
      },
      required: ['agendamentoId'],
    },
  },
  {
    name: 'info_barbearia',
    description: 'Retorna informações gerais da barbearia como nome, endereço, horários de funcionamento e configurações.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'verificar_disponibilidade',
    description: 'Verifica horários disponíveis para agendamento em uma data.',
    input_schema: {
      type: 'object',
      properties: {
        data:           { type: 'string', description: 'Data no formato YYYY-MM-DD' },
        serviceId:      { type: 'string', description: 'ID do serviço (para calcular duração)' },
        profissionalId: { type: 'string', description: 'ID do profissional (opcional)' },
      },
      required: ['data'],
    },
  },
];

// ── Tool executors ────────────────────────────────────────────────────────────

async function executeTool(toolName, input, { barbershopId }) {
  try {
    switch (toolName) {

      case 'listar_agendamentos': {
        const { data, status, profissionalId, limite = 20 } = input;
        const filter = { barbershop: barbershopId };
        if (status) filter.status = status;
        if (profissionalId) filter.barber = profissionalId;

        if (data) {
          filter.date = {
            $gte: new Date(data + 'T00:00:00'),
            $lte: new Date(data + 'T23:59:59'),
          };
        } else {
          const today = new Date();
          filter.date = {
            $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            $lte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
          };
        }

        const appts = await Appointment.find(filter)
          .populate('service', 'name price duration')
          .populate('barber', 'name')
          .sort({ date: 1 })
          .limit(limite);

        return {
          total: appts.length,
          agendamentos: appts.map(a => ({
            id:           a._id,
            cliente:      a.clientName || '—',
            servico:      a.service?.name || '—',
            preco:        a.service?.price,
            profissional: a.barber?.name || '—',
            data:         a.date.toLocaleDateString('pt-BR'),
            horario:      a.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status:       a.status,
          })),
        };
      }

      case 'listar_servicos': {
        const services = await Service.find({ barbershop: barbershopId, active: true }).select('_id name duration price description');
        return services.map(s => ({
          id:       s._id,
          nome:     s.name,
          duracao:  `${s.duration} min`,
          preco:    `R$ ${Number(s.price).toFixed(2)}`,
          descricao: s.description || '',
        }));
      }

      case 'listar_profissionais': {
        const barbers = await User.find({ barbershop: barbershopId }).select('_id name role');
        return barbers.map(b => ({ id: b._id, nome: b.name, cargo: b.role === 'admin' ? 'Administrador' : 'Barbeiro' }));
      }

      case 'listar_clientes': {
        const { busca, limite = 20 } = input;
        const filter = { barbershop: barbershopId };
        if (busca) {
          filter.$or = [
            { name:  { $regex: busca, $options: 'i' } },
            { phone: { $regex: busca, $options: 'i' } },
          ];
        }
        const clients = await Client.find(filter).select('_id name phone email').limit(limite);
        return clients.map(c => ({ id: c._id, nome: c.name, telefone: c.phone || '—', email: c.email || '—' }));
      }

      case 'criar_agendamento': {
        const { nomeCliente, telefoneCliente, serviceId, profissionalId, data, horario } = input;

        const service = await Service.findById(serviceId).select('name duration price');
        if (!service) return { sucesso: false, erro: 'Serviço não encontrado.' };

        const barber = await User.findById(profissionalId).select('name');
        if (!barber) return { sucesso: false, erro: 'Profissional não encontrado.' };

        let clientDoc = null;
        if (telefoneCliente) {
          clientDoc = await Client.findOne({ barbershop: barbershopId, phone: telefoneCliente });
          if (!clientDoc) {
            clientDoc = await Client.create({ barbershop: barbershopId, name: nomeCliente, phone: telefoneCliente });
          }
        }

        const dateObj = new Date(`${data}T${horario}:00`);
        const endDate = new Date(dateObj.getTime() + service.duration * 60000);

        const conflict = await Appointment.findOne({
          barbershop: barbershopId,
          barber:     profissionalId,
          status:     { $ne: 'cancelado' },
          date:       { $lt: endDate },
          endDate:    { $gt: dateObj },
        });
        if (conflict) return { sucesso: false, erro: 'Horário já ocupado. Escolha outro horário.' };

        const appt = await Appointment.create({
          barbershop:  barbershopId,
          barber:      profissionalId,
          service:     serviceId,
          client:      clientDoc?._id,
          clientName:  nomeCliente,
          date:        dateObj,
          endDate,
          status:      'agendado',
          notes:       'Agendado via Lia (assistente)',
        });

        return {
          sucesso:      true,
          agendamentoId: appt._id,
          mensagem:     `Agendamento criado! ${service.name} com ${barber.name} em ${data} às ${horario}.`,
        };
      }

      case 'cancelar_agendamento': {
        const { agendamentoId } = input;
        const appt = await Appointment.findOne({ _id: agendamentoId, barbershop: barbershopId, status: 'agendado' });
        if (!appt) return { sucesso: false, erro: 'Agendamento não encontrado ou já cancelado.' };
        appt.status = 'cancelado';
        await appt.save();
        return { sucesso: true, mensagem: 'Agendamento cancelado com sucesso.' };
      }

      case 'info_barbearia': {
        const shop = await Barbershop.findById(barbershopId).select('name address neighborhood phone openingHours notifications');
        if (!shop) return { erro: 'Barbearia não encontrada.' };

        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return {
          nome:       shop.name,
          endereco:   shop.address   || '—',
          bairro:     shop.neighborhood || '—',
          telefone:   shop.phone     || '—',
          horarios:   (shop.openingHours || []).map(d => ({
            dia:  diasSemana[d.day],
            aberto: d.open,
            de:   d.from,
            ate:  d.to,
          })),
          notificacoes: shop.notifications || { enabled: false },
        };
      }

      case 'verificar_disponibilidade': {
        const { data, serviceId, profissionalId } = input;
        const shop = await Barbershop.findById(barbershopId).select('openingHours');
        const dateObj  = new Date(data + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();
        const dayConfig = shop.openingHours?.find(d => d.day === dayOfWeek);

        if (!dayConfig?.open) return { disponivel: false, motivo: 'A barbearia não abre nesse dia da semana.' };

        let duration = 30;
        if (serviceId) {
          const svc = await Service.findById(serviceId).select('duration');
          if (svc) duration = svc.duration;
        }

        const barberFilter = { barbershop: barbershopId };
        if (profissionalId) barberFilter._id = profissionalId;
        const barbers = await User.find(barberFilter).select('_id name');

        const [fromH, fromM] = dayConfig.from.split(':').map(Number);
        const [toH,   toM]   = dayConfig.to.split(':').map(Number);
        const startMin = fromH * 60 + fromM;
        const endMin   = toH   * 60 + toM;

        const slots = [];
        for (let m = startMin; m + duration <= endMin; m += 30) {
          slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
        }

        const startOfDay = new Date(data + 'T00:00:00');
        const endOfDay   = new Date(data + 'T23:59:59');
        const existing   = await Appointment.find({
          barbershop: barbershopId,
          date:       { $gte: startOfDay, $lte: endOfDay },
          status:     { $ne: 'cancelado' },
          ...(profissionalId ? { barber: profissionalId } : {}),
        }).select('barber date endDate');

        const result = [];
        for (const barber of barbers) {
          const barberAppts = existing.filter(a => String(a.barber) === String(barber._id));
          const freeSlots = slots.filter(slot => {
            const slotStart = new Date(data + `T${slot}:00`);
            const slotEnd   = new Date(slotStart.getTime() + duration * 60000);
            return !barberAppts.some(a => {
              const aStart = new Date(a.date);
              const aEnd   = a.endDate ? new Date(a.endDate) : new Date(aStart.getTime() + 30 * 60000);
              return slotStart < aEnd && slotEnd > aStart;
            });
          });
          if (freeSlots.length > 0) result.push({ profissionalId: barber._id, profissional: barber.name, horarios: freeSlots });
        }

        if (result.length === 0) return { disponivel: false, motivo: 'Sem horários disponíveis para essa data.' };
        return { disponivel: true, data, horarios_por_profissional: result };
      }

      default:
        return { erro: 'Ferramenta desconhecida.' };
    }
  } catch (err) {
    console.error(`[ChatTool ${toolName}] Error:`, err.message);
    return { erro: err.message };
  }
}

// ── Main: agentic loop ────────────────────────────────────────────────────────

async function generateChatReply(barbershopName, messages, context) {
  const { barbershopId } = context;

  const now = new Date();
  const dataHoje = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const horaAgora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const systemPrompt = `Você é Lia, a recepcionista virtual inteligente da plataforma JubaOS, assistindo o profissional que gerencia a barbearia/salão "${barbershopName}".

Data e hora atual: ${dataHoje}, ${horaAgora}

Suas responsabilidades:
- Ajudar o profissional a gerenciar a plataforma JubaOS
- Responder dúvidas sobre funcionalidades da plataforma
- Gerenciar agendamentos, clientes, serviços e profissionais
- Oferecer suporte rápido sobre uso do sistema
- Receber instruções para configurar a Recepcionista IA do WhatsApp

REGRA FUNDAMENTAL: Você DEVE recusar qualquer assunto que não seja relacionado à plataforma JubaOS ou à gestão do estabelecimento. Se o usuário perguntar sobre outros temas (notícias, receitas, piadas, política, entretenimento, etc.), responda educadamente: "Posso te ajudar apenas com assuntos relacionados à plataforma JubaOS e à gestão do seu estabelecimento. Sobre isso, o que você precisa?"

Sugestões de como posso ajudar:
- "Ver agendamentos de hoje"
- "Criar um agendamento"
- "Listar meus clientes"
- "Quais serviços estão cadastrados?"
- "Como funciona a Recepcionista IA do WhatsApp?"
- "Configurar horários de funcionamento"

ESTILO: Respostas ULTRA curtas — máximo 1-2 frases. Sem saudações, sem despedidas, sem repetir o que foi perguntado. Sem emojis. Direto ao ponto. Português.`;

  const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));

  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      CHAT_TOOLS,
      messages:   apiMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock?.text || '…';
    }

    if (response.stop_reason === 'tool_use') {
      apiMessages.push({ role: 'assistant', content: response.content });

      const toolResults = await Promise.all(
        response.content
          .filter(b => b.type === 'tool_use')
          .map(async (b) => {
            const result = await executeTool(b.name, b.input, { barbershopId });
            return { type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(result) };
          })
      );

      apiMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    break;
  }

  return 'Desculpe, não consegui processar sua solicitação no momento.';
}

module.exports = { generateChatReply };
