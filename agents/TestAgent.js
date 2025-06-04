import { BaseAgent } from './BaseAgent.js';

export class TestAgent extends BaseAgent {
    constructor(name = 'test-agent') {
        super(name);
        this.messageCount = 0;
    }

    async initialize() {
        // Register some test tools
        this.registerTool('echo', this._echoTool.bind(this));
        this.registerTool('count', this._countTool.bind(this));
        
        // Initialize parent class
        await super.initialize();
        
        // Store initial state
        await this.storeMemory('messageCount', 0);
        await this.storeMemory('lastMessage', null);
    }

    async _handleMessage(message) {
        this.messageCount++;
        
        // Store message count and last message
        await this.storeMemory('messageCount', this.messageCount);
        await this.storeMemory('lastMessage', message);

        // Process message based on type
        switch (message.type) {
            case 'echo':
                return await this.executeTool('echo', message.content);
            case 'count':
                return await this.executeTool('count');
            default:
                return {
                    status: 'received',
                    messageCount: this.messageCount,
                    message: message
                };
        }
    }

    // Test tool that echoes back the input
    async _echoTool(content) {
        return {
            status: 'echo',
            content: content,
            timestamp: new Date().toISOString()
        };
    }

    // Test tool that returns the current message count
    async _countTool() {
        return {
            status: 'count',
            count: this.messageCount,
            timestamp: new Date().toISOString()
        };
    }
} 