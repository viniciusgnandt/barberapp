const router = require('express').Router();
const { getAppointments, createAppointment, updateAppointment, deleteAppointment } = require('../controllers/appointmentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { checkAppointmentAccess, checkAppointmentModifyAccess } = require('../middleware/permissionMiddleware');

router.use(authMiddleware);

router.get('/',       checkAppointmentAccess, getAppointments);
router.post('/',      createAppointment);
router.put('/:id',    checkAppointmentModifyAccess, updateAppointment);
router.delete('/:id', checkAppointmentModifyAccess, deleteAppointment);

module.exports = router;
