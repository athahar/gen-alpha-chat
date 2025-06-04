import { EventEmitter } from 'events';

export class BaseAgent extends EventEmitter {
    constructor(name, config = {}) {
        super();
        this.name = name;
        this.memory = new Map();
        this.tools = new Map();
        this.config = config;
        this.isActive = false;
    }

    // Initialize the agent with its tools and memory
    async initialize() {
        this.isActive = true;
        this.emit('initialized', { agent: this.name });
    }

    // Process incoming messages
    async processMessage(message) {
        if (!this.isActive) {
            throw new Error(`Agent ${this.name} is not active`);
        }
        this.emit('messageReceived', { agent: this.name, message });
        return await this._handleMessage(message);
    }

    // Store data in agent's memory
    async storeMemory(key, value) {
        this.memory.set(key, value);
        this.emit('memoryUpdated', { agent: this.name, key, value });
    }

    // Retrieve data from agent's memory
    async getMemory(key) {
        return this.memory.get(key);
    }

    // Register a tool with the agent
    registerTool(name, tool) {
        this.tools.set(name, tool);
        this.emit('toolRegistered', { agent: this.name, tool: name });
    }

    // Execute a tool
    async executeTool(toolName, ...args) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            throw new Error(`Tool ${toolName} not found in agent ${this.name}`);
        }
        return await tool(...args);
    }

    // Shutdown the agent
    async shutdown() {
        this.isActive = false;
        this.emit('shutdown', { agent: this.name });
    }

    // Abstract method to be implemented by specific agents
    async _handleMessage(message) {
        throw new Error('_handleMessage must be implemented by specific agent');
    }
} 