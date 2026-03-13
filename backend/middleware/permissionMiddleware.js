// middleware/permissionMiddleware.js — Controle de Permissões por Role

/**
 * Verifica se o usuário tem permissão para acessar recursos
 * Admin: acesso total a toda a barbershop
 * Barbeiro: acesso apenas aos próprios recursos
 */

const checkAppointmentAccess = async (req, res, next) => {
  try {
    const { barber } = req.query;

    // Admin tem acesso a tudo da sua barbershop
    if (req.user.role === 'admin') {
      return next();
    }

    // Barbeiro só pode ver seus próprios agendamentos
    if (req.user.role === 'barbeiro') {
      if (barber && barber !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar agendamentos de outros barbeiros.',
        });
      }

      // Força filtro pelo próprio barbeiro (ignora qualquer barber passado)
      req.query.barber = req.user._id.toString();
      return next();
    }

    return res.status(403).json({ success: false, message: 'Acesso negado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Verifica acesso para modificar (PUT/DELETE) um agendamento
 */
const checkAppointmentModifyAccess = async (req, res, next) => {
  try {
    const Appointment = require('../models/Appointment');
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Agendamento não encontrado.' });
    }

    // Validar se pertence à mesma barbershop
    if (appointment.barbershop.toString() !== req.user.barbershop._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para acessar este agendamento.',
      });
    }

    // Admin pode modificar qualquer agendamento da barbershop
    if (req.user.role === 'admin') {
      req.appointment = appointment;
      return next();
    }

    // Barbeiro só pode modificar seus próprios agendamentos
    if (req.user.role === 'barbeiro') {
      if (appointment.barber.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Você não tem permissão para modificar agendamentos de outros barbeiros.',
        });
      }
      req.appointment = appointment;
      return next();
    }

    return res.status(403).json({ success: false, message: 'Acesso negado.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Verifica acesso para listar/gerenciar serviços
 * Apenas admin pode gerenciar
 */
const checkServiceManageAccess = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Apenas administradores podem gerenciar serviços.',
    });
  }
  next();
};

/**
 * Verifica acesso para gerenciar barbershop
 * Apenas o owner (admin) pode gerenciar
 */
const checkBarbershopAccess = async (req, res, next) => {
  try {
    const Barbershop = require('../models/Barbershop');

    // Se for GET da lista, é ok listando apenas suas barbershops
    if (req.method === 'GET' && !req.params.id) {
      return next();
    }

    const barbershopId = req.params.id;
    const barbershop = await Barbershop.findById(barbershopId);

    if (!barbershop) {
      return res.status(404).json({ success: false, message: 'Barbearia não encontrada.' });
    }

    // Apenas o owner pode gerenciar
    if (barbershop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para gerenciar esta barbearia.',
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  checkAppointmentAccess,
  checkAppointmentModifyAccess,
  checkServiceManageAccess,
  checkBarbershopAccess,
};
