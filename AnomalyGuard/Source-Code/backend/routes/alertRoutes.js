const express = require('express');
const router = express.Router();
const { getUnresolvedAlerts, resolveOne, resolveAll } = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');
router.use(protect);
router.get('/unresolved', getUnresolvedAlerts);
router.patch('/:id/resolve', resolveOne);
router.post('/resolve-all', resolveAll);
module.exports = router;
