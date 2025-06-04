import { EventEmitter } from 'events';

export class AgentCommunication extends EventEmitter {
    constructor() {
        super();
        this.agents = new Map();
        this.messageQueue = [];
        this.isProcessing = false;
    }

    // Register an agent with the communication system
    registerAgent(agent) {
        this.agents.set(agent.name, agent);
        
        // Set up event listeners for the agent
        agent.on('messageReceived', (data) => this._handleAgentMessage(data));
        agent.on('memoryUpdated', (data) => this._handleMemoryUpdate(data));
        agent.on('toolRegistered', (data) => this._handleToolRegistration(data));
        
        this.emit('agentRegistered', { agent: agent.name });
    }

    // Send a message to a specific agent
    async sendMessage(toAgent, message) {
        const agent = this.agents.get(toAgent);
        if (!agent) {
            throw new Error(`Agent ${toAgent} not found`);
        }

        this.messageQueue.push({
            to: toAgent,
            message,
            timestamp: Date.now()
        });

        if (!this.isProcessing) {
            await this._processMessageQueue();
        }
    }

    // Broadcast a message to all agents
    async broadcast(message) {
        const promises = Array.from(this.agents.values()).map(agent =>
            this.sendMessage(agent.name, message)
        );
        await Promise.all(promises);
    }

    // Process the message queue
    async _processMessageQueue() {
        if (this.isProcessing || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const { to, message } = this.messageQueue.shift();
            const agent = this.agents.get(to);
            
            try {
                await agent.processMessage(message);
            } catch (error) {
                this.emit('error', {
                    agent: to,
                    error: error.message,
                    message
                });
            }
        }

        this.isProcessing = false;
    }

    // Handle messages from agents
    _handleAgentMessage(data) {
        this.emit('agentMessage', data);
    }

    // Handle memory updates from agents
    _handleMemoryUpdate(data) {
        this.emit('memoryUpdate', data);
    }

    // Handle tool registrations from agents
    _handleToolRegistration(data) {
        this.emit('toolRegistration', data);
    }

    // Get the status of all registered agents
    getAgentStatus() {
        return Array.from(this.agents.entries()).map(([name, agent]) => ({
            name,
            isActive: agent.isActive,
            tools: Array.from(agent.tools.keys()),
            memorySize: agent.memory.size
        }));
    }
} 