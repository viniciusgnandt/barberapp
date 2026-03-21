// services/claudeService.js — AI receptionist com tool use (Gemini + Claude fallback)

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic   = require('@anthropic-ai/sdk');
const Client      = require('../models/Client');
const Service     = require('../models/Service');
const Appointment = require('../models/Appointment');
const User        = require('../models/User');
const Barbershop  = require('../models/Barbershop');

// ── Gemini function declarations (converted from Claude tool format) ────────

const GEMINI_FUNCTION_DECLARATIONS = [
  {
    name: 'verificar_cliente',
    description: 'Verifica se o contato já é um cliente cadastrado na barbearia, usando o número de WhatsApp automaticamente.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'listar_servicos',
    description: 'Lista todos os serviços disponíveis na barbearia com nome, duração e preço.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'listar_profissionais',
    description: 'Lista todos os profissionais (barbeiros) disponíveis na barbearia.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'verificar_disponibilidade',
    description: 'Verifica os horários disponíveis para agendamento em uma data específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        data:           { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
        serviceId:      { type: 'STRING', description: 'ID do serviço (opcional, para calcular duração)' },
        profissionalId: { type: 'STRING', description: 'ID do profissional (opcional, para filtrar)' },
      },
      required: ['data'],
    },
  },
  {
    name: 'criar_agendamento',
    description: 'Cria um novo agendamento para o cliente. Usa o número de WhatsApp como identificador.',
    parameters: {
      type: 'OBJECT',
      properties: {
        serviceId:      { type: 'STRING', description: 'ID do serviço' },
        profissionalId: { type: 'STRING', description: 'ID do profissional' },
        data:           { type: 'STRING', description: 'Data no formato YYYY-MM-DD' },
        horario:        { type: 'STRING', description: 'Horário no formato HH:MM' },
        nomeCliente:    { type: 'STRING', description: 'Nome do cliente (se não cadastrado)' },
      },
      required: ['serviceId', 'profissionalId', 'data', 'horario'],
    },
  },
  {
    name: 'meus_agendamentos',
    description: 'Lista os próximos agendamentos do cliente atual (identificado pelo WhatsApp).',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'cancelar_agendamento',
    description: 'Cancela um agendamento do cliente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agendamentoId: { type: 'STRING', description: 'ID do agendamento a cancelar' },
      },
      required: ['agendamentoId'],
    },
  },
];

// ── Claude tool definitions (kept for fallback) ─────────────────────────────

const CLAUDE_TOOLS = [
  {
    name: 'verificar_cliente',
    description: 'Verifica se o contato já é um cliente cadastrado na barbearia, usando o número de WhatsApp automaticamente.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'listar_servicos',
    description: 'Lista todos os serviços disponíveis na barbearia com nome, duração e preço.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'listar_profissionais',
    description: 'Lista todos os profissionais (barbeiros) disponíveis na barbearia.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'verificar_disponibilidade',
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
    name: 'criar_agendamento',
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
    name: 'meus_agendamentos',
    description: 'Lista os próximos agendamentos do cliente atual (identificado pelo WhatsApp).',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'cancelar_agendamento',
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
        const dateObj   = new Date(data + 'T12:00:00.000-03:00');
        const dayOfWeek = dateObj.getUTCDay();

        const shop = await Barbershop.findById(barbershopId).select('openingHours');
        const dayConfig = shop.openingHours.find(d => d.day === dayOfWeek);
        if (!dayConfig?.open) {
          return { disponivel: false, motivo: 'A barbearia não abre nesse dia da semana.' };
        }

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

        const startOfDay = new Date(data + 'T00:00:00.000-03:00');
        const endOfDay   = new Date(data + 'T23:59:59.999-03:00');
        const existing   = await Appointment.find({
          barbershop: barbershopId,
          date:       { $gte: startOfDay, $lte: endOfDay },
          status:     { $ne: 'cancelado' },
          ...(profissionalId ? { barber: profissionalId } : {}),
        }).populate('service', 'duration');

        const result = [];
        for (const barber of barbers) {
          const barberAppts = existing.filter(a => String(a.barber) === String(barber._id));
          const freeSlots = slots.filter(slot => {
            const slotStart = new Date(`${data}T${slot}:00.000-03:00`);
            const slotEnd   = new Date(slotStart.getTime() + duration * 60000);
            return !barberAppts.some(a => {
              const aDur   = (a.service?.duration || 30) * 60000;
              const aStart = new Date(a.date);
              const aEnd   = new Date(aStart.getTime() + aDur);
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

        if (!/^\d{4}-\d{2}-\d{2}$/.test(data))
          return { sucesso: false, erro: `Data inválida: "${data}". Use o formato YYYY-MM-DD.` };

        const service = await Service.findById(serviceId).select('name duration price');
        if (!service) return { sucesso: false, erro: 'Serviço não encontrado.' };

        const barber = await User.findOne({ _id: profissionalId, barbershop: barbershopId });
        if (!barber) return { sucesso: false, erro: 'Profissional não encontrado.' };

        const phoneClean = String(contactPhone).replace(/\D/g, '');
        let clientDoc = await Client.findOne({ barbershop: barbershopId, phone: phoneClean });
        const clientName = nomeCliente || contactName;
        if (!clientDoc && clientName) {
          clientDoc = await Client.create({
            barbershop: barbershopId,
            name:       clientName,
            phone:      phoneClean,
          });
        }

        const dateObj = new Date(`${data}T${horario}:00.000-03:00`);
        const endDate = new Date(dateObj.getTime() + service.duration * 60000);

        console.log(`[Reception] Criando agendamento: ${service.name} em ${dateObj.toISOString()} (${data} ${horario} BRT)`);

        const dayStart = new Date(`${data}T00:00:00.000-03:00`);
        const dayEnd   = new Date(`${data}T23:59:59.999-03:00`);
        const existing = await Appointment.find({
          barbershop: barbershopId,
          barber:     profissionalId,
          status:     { $ne: 'cancelado' },
          date:       { $gte: dayStart, $lte: dayEnd },
        }).populate('service', 'duration');

        const hasConflict = existing.some(a => {
          const aDur    = (a.service?.duration || 30) * 60000;
          const aStart  = new Date(a.date);
          const aEnd    = new Date(aStart.getTime() + aDur);
          return dateObj < aEnd && endDate > aStart;
        });
        if (hasConflict) return { sucesso: false, erro: 'Horário não disponível. Escolha outro horário.' };

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

        const [ano, mes, dia] = data.split('-');
        const dataFmt = `${dia}/${mes}`;

        return {
          sucesso: true,
          resposta_final: `${service.name} com ${barber.name} agendado para ${dataFmt} às ${horario}.`,
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
          const escapedPhone = String(contactPhone).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          appts = await Appointment.find({
            barbershop: barbershopId,
            notes:      { $regex: `\\(${escapedPhone}\\)` },
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

function sanitize(text) {
  return text
    // Remove emojis
    .replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27FF}|\u{FE00}-\u{FEFF}|\u{1F900}-\u{1F9FF}]/gu, '')
    // Remove markdown bold/italic (** __ * _)
    .replace(/\*{1,2}|_{1,2}/g, '')
    // Remove markdown headers (#)
    .replace(/^#+\s?/gm, '')
    // Collapse extra blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildSystemPrompt(barbershopName, contactPhone, contactName) {
  const now = new Date();
  const dataHoje = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const horaAgora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return `Recepcionista virtual da "${barbershopName}" via WhatsApp.

Agora: ${dataHoje}, ${horaAgora}
Data ISO (use nas ferramentas): ${now.toISOString().slice(0, 10)}
WhatsApp do cliente: ${contactPhone}
${contactName ? `Nome do contato: ${contactName}` : ''}

Ferramentas: verificar cliente, listar servicos/profissionais, verificar disponibilidade, criar/consultar/cancelar agendamentos.

REGRAS:
- Max 1-2 frases por resposta.
- PROIBIDO: emojis, markdown, IDs internos, saudacoes, despedidas, resumos nao solicitados.
- Texto simples, sem formatacao. Sempre em portugues.
- Nao peca telefone (ja temos). Cliente nao cadastrado: peca so o nome.
- SEMPRE use verificar_disponibilidade antes de sugerir horarios.
- Apos escolha do cliente, verifique disponibilidade novamente antes de criar.
- Quando criar_agendamento retornar sucesso=true, responda EXATAMENTE com o campo "resposta_final".`;
}

// ── Gemini implementation ───────────────────────────────────────────────────

async function generateReplyGemini(barbershopName, messages, context) {
  const { barbershopId, contactPhone, contactName } = context;
  const systemPrompt = buildSystemPrompt(barbershopName, contactPhone, contactName);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: GEMINI_FUNCTION_DECLARATIONS }],
  });

  // Convert messages to Gemini history format
  // Gemini uses 'user' and 'model' roles, with { text } parts
  const history = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const m = messages[i];
    history.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }

  const lastMessage = messages[messages.length - 1];
  const chat = model.startChat({ history });

  let result = await chat.sendMessage(lastMessage.content);

  // Agentic loop — max 8 tool iterations
  for (let i = 0; i < 8; i++) {
    const functionCalls = result.response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      // No tool calls — extract text response
      const text = result.response.text();
      return sanitize(text || '...');
    }

    // Execute all function calls in parallel
    const functionResponses = await Promise.all(
      functionCalls.map(async (fc) => {
        const toolResult = await executeTool(fc.name, fc.args || {}, { barbershopId, contactPhone, contactName });
        return {
          functionResponse: {
            name: fc.name,
            response: toolResult,
          },
        };
      })
    );

    // Send tool results back
    result = await chat.sendMessage(functionResponses);
  }

  return 'Desculpe, não consegui processar sua solicitação no momento.';
}

// ── Claude fallback implementation ──────────────────────────────────────────

async function generateReplyClaude(barbershopName, messages, context) {
  const { barbershopId, contactPhone, contactName } = context;
  const systemPrompt = buildSystemPrompt(barbershopName, contactPhone, contactName);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));

  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      CLAUDE_TOOLS,
      messages:   apiMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      return sanitize(textBlock?.text || '...');
    }

    if (response.stop_reason === 'tool_use') {
      apiMessages.push({ role: 'assistant', content: response.content });

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

    break;
  }

  return 'Desculpe, não consegui processar sua solicitação no momento.';
}

// ── Public API — Gemini primary, Claude fallback ────────────────────────────

async function generateReply(barbershopName, messages, context) {
  if (process.env.GEMINI_API_KEY) {
    return generateReplyGemini(barbershopName, messages, context);
  }
  console.log('[AI] GEMINI_API_KEY not set, falling back to Claude (ANTHROPIC_API_KEY)');
  return generateReplyClaude(barbershopName, messages, context);
}

module.exports = { generateReply };
