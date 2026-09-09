import type { NextFunction, Response } from 'express';
import { agentService } from '../services/agents.service';
import type { ApiResponse, AuthenticatedRequest } from '../types';
import {
  getAuthUserId,
  getParam,
  sendBadRequest,
  sendSuccess,
  sendUnauthorized,
} from '../utils/requestUtils';
import { v4 as uuidv4 } from 'uuid';

export class AgentController {
chat = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ success: false, message: 'Message is required' });
        return;
      }

      const userId = getAuthUserId(req);
      if (!userId) {
        res.status(401).json({ success: false, message: 'User ID is required' });
        return;
      }

     let activeConversationId = conversationId?.trim() || uuidv4();

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      const stream = await agentService.chatStream(activeConversationId, userId, message.trim());
        res.write(`data: ${JSON.stringify({ conversationId: activeConversationId })}\n\n`);
      
      for await (const chunk of stream.textStream) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
        res.end();
      }
    }
  };

  getSuggestions = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return sendUnauthorized(res, 'User ID is required');
      }

      const suggestions = await agentService.getSuggestions();
      sendSuccess(res, 'Suggestions retrieved successfully', suggestions);
    } catch (error) {
      next(error);
    }
  };

  getConversations = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return sendUnauthorized(res, 'User ID is required');
      }
      console.log('Fetching conversations for userId:', userId);

      const conversations = await agentService.getConversations(userId);
      console.log('Conversations retrieved:', conversations);
      sendSuccess(res, 'Conversations retrieved successfully', conversations);
    } catch (error) {
      next(error);
    }
  };

  getMessages = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return sendUnauthorized(res, 'User ID is required');
      }

      const conversationId = getParam(req.params.conversationId) || userId;
      const messages = await agentService.getMessages(conversationId);
      sendSuccess(res, 'Messages retrieved successfully', messages);
    } catch (error) {
      next(error);
    }
  };
}

export const agentController = new AgentController();