import { Router } from 'express';
import { agentController } from '../controllers/agents.controller';
import { protectRoute } from '../middleware/auth';

const router = Router();
router.use(protectRoute);

router.post('/chat', agentController.chat);
router.get('/conversations', agentController.getConversations);
router.get('/conversations/:conversationId/messages', agentController.getMessages);
router.get('/messages', agentController.getMessages);
router.get('/messages/:conversationId', agentController.getMessages);
router.get('/suggestions', agentController.getSuggestions);

export default router;
