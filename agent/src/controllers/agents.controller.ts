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

export class AgentController {
  chat = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return sendBadRequest(res, 'Message is required');
      }

      const userId = getAuthUserId(req);
      if (!userId) {
        return sendUnauthorized(res, 'User ID is required');
      }

      const activeConversationId =
        (typeof conversationId === 'string' && conversationId.trim()) || userId;

      const response = await agentService.chat(activeConversationId, userId, message.trim());
      sendSuccess(res, 'Message processed successfully', response);
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

      const conversations = await agentService.getConversations(userId);
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