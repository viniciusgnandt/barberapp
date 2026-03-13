const router = require('express').Router();
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { checkServiceManageAccess } = require('../middleware/permissionMiddleware');

router.use(authMiddleware);

router.get('/',     getServices);
router.post('/',    checkServiceManageAccess, createService);
router.put('/:id',  checkServiceManageAccess, updateService);
router.delete('/:id', checkServiceManageAccess, deleteService);

module.exports = router;
