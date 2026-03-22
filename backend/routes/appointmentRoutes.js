const router = require('express').Router();
const { getAppointments, createAppointment, updateAppointment, deleteAppointment } = require('../controllers/appointmentController');
const { getIcalToken, getIcalFeed } = require('../controllers/icalController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { checkAppointmentAccess, checkAppointmentModifyAccess } = require('../middleware/permissionMiddleware');

// iCal feed — público (via token), sem authMiddleware
router.get('/ical/:token', getIcalFeed);

router.use(authMiddleware);

router.get('/ical-token', getIcalToken);
router.get('/',       checkAppointmentAccess, getAppointments);
router.post('/',      createAppointment);
router.put('/:id',    checkAppointmentModifyAccess, updateAppointment);
router.delete('/:id', checkAppointmentModifyAccess, deleteAppointment);

module.exports = router;
