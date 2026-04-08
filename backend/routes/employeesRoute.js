const express = require('express');
const router = express.Router();
const controller = require('../controllers/employeesController');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', controller.getAllEmployees);
router.get('/:id', controller.getEmployeeById);
router.post('/', authorizeRoles('admin', 'gerente'), controller.createEmployee);
router.put('/:id', authorizeRoles('admin', 'gerente'), controller.updateEmployee);
router.patch('/:id', authorizeRoles('admin', 'gerente'), controller.patchEmployee);
router.patch('/:id/access-level', authorizeRoles('admin', 'gerente'), controller.updateEmployeeAccessLevel);
router.delete('/:id', authorizeRoles('admin'), controller.deleteEmployee);

module.exports = router;
