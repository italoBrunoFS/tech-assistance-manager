const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', controller.getAllClients);
router.get('/search/email', controller.getClientByEmail);
router.get('/search/phone', controller.getClientByPhone);
router.get('/:id', controller.getClientById);
router.post('/', controller.createClient);
router.put('/:id', controller.updateClient);
router.patch('/:id', controller.patchClient);
router.delete('/:id', controller.deleteClient);

module.exports = router;
