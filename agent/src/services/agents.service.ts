import { mastra } from '../mastra';

export class AgentService {
  async chat(conversationId: string, userId: string, message: string) {
    const agent = mastra.getAgent('agent');
    if (!agent) {
      throw new Error('Agent not found');
    }

    return agent.generate(message, {
      memory: {
        thread: conversationId,
        resource: userId,
      },
    });
  }

  async getConversations(userId: string) {
    const agent = mastra.getAgent('agent');
    if (!agent) {
      throw new Error('Agent not found');
    }

    const memory = await agent.getMemory();
    if (!memory) {
      throw new Error('Memory not configured for agent');
    }

    const result = await memory.listThreads({
      filter: { resourceId: userId },
      perPage: false,
    });

    return result.threads;
  }

  async getMessages(conversationId: string) {
    const agent = mastra.getAgent('agent');
    if (!agent) {
      throw new Error('Agent not found');
    }

    const memory = await agent.getMemory();
    if (!memory) {
      throw new Error('Memory not configured for agent');
    }

    const result = await memory.recall({
      threadId: conversationId,
      perPage: false,
    });

    return result.messages;
  }
 async chatStream(conversationId: string, userId: string, message: string) {
    const agent = mastra.getAgent('agent');
    if (!agent) {
      throw new Error('Agent not found');
    }

    return agent.stream(
      [{ role: 'user', content: message }],
      {
        memory: {
          thread: conversationId,
          resource: userId,
        },
      }
    );
  }
  
  async getSuggestions(): Promise<string[]> {
    const agent = mastra.getAgent('agent');
    if (!agent) throw new Error('Agent not found');
    
    const agentWithMetadata = agent as any;
    
    return agentWithMetadata.metadata?.suggestedPrompts || [
      "What can you help me with?",
      "Tell me about your capabilities."
    ];
  }
}

export const agentService = new AgentService();