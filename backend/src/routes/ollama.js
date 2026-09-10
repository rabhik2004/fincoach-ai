const express = require('express');
const { getStatus, getModels, ollamaChat, ollamaChatStream, pullModel } = require('../controllers/ollamaController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/status', getStatus);
router.get('/models', getModels);
router.post('/chat', ollamaChat);
router.post('/stream', ollamaChatStream);
router.post('/pull', pullModel);

module.exports = router;
