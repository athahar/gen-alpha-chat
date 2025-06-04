import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export class MemoryManager {
    constructor() {
        // Check for required environment variables
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_KEY must be set');
        }

        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
        this.memoryCache = new Map();
    }

    // Store memory in both cache and database
    async storeMemory(agentName, key, value) {
        // Store in cache
        if (!this.memoryCache.has(agentName)) {
            this.memoryCache.set(agentName, new Map());
        }
        this.memoryCache.get(agentName).set(key, value);

        // Store in database
        try {
            const { error } = await this.supabase
                .from('agent_memories')
                .upsert({
                    agent_name: agentName,
                    memory_key: key,
                    memory_value: value,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error(`Error storing memory for ${agentName}:`, error);
            throw error;
        }
    }

    // Retrieve memory from cache or database
    async getMemory(agentName, key) {
        // Check cache first
        if (this.memoryCache.has(agentName)) {
            const agentCache = this.memoryCache.get(agentName);
            if (agentCache.has(key)) {
                return agentCache.get(key);
            }
        }

        // If not in cache, retrieve from database
        try {
            const { data, error } = await this.supabase
                .from('agent_memories')
                .select('memory_value')
                .eq('agent_name', agentName)
                .eq('memory_key', key)
                .single();

            if (error) throw error;

            if (data) {
                // Update cache
                if (!this.memoryCache.has(agentName)) {
                    this.memoryCache.set(agentName, new Map());
                }
                this.memoryCache.get(agentName).set(key, data.memory_value);
                return data.memory_value;
            }

            return null;
        } catch (error) {
            console.error(`Error retrieving memory for ${agentName}:`, error);
            throw error;
        }
    }

    // Get all memories for an agent
    async getAllMemories(agentName) {
        try {
            const { data, error } = await this.supabase
                .from('agent_memories')
                .select('memory_key, memory_value')
                .eq('agent_name', agentName);

            if (error) throw error;

            // Update cache
            if (!this.memoryCache.has(agentName)) {
                this.memoryCache.set(agentName, new Map());
            }

            const memories = {};
            data.forEach(item => {
                memories[item.memory_key] = item.memory_value;
                this.memoryCache.get(agentName).set(item.memory_key, item.memory_value);
            });

            return memories;
        } catch (error) {
            console.error(`Error retrieving all memories for ${agentName}:`, error);
            throw error;
        }
    }

    // Delete a specific memory
    async deleteMemory(agentName, key) {
        // Remove from cache
        if (this.memoryCache.has(agentName)) {
            this.memoryCache.get(agentName).delete(key);
        }

        // Remove from database
        try {
            const { error } = await this.supabase
                .from('agent_memories')
                .delete()
                .eq('agent_name', agentName)
                .eq('memory_key', key);

            if (error) throw error;
        } catch (error) {
            console.error(`Error deleting memory for ${agentName}:`, error);
            throw error;
        }
    }

    // Clear all memories for an agent
    async clearAgentMemories(agentName) {
        // Clear cache
        this.memoryCache.delete(agentName);

        // Clear database
        try {
            const { error } = await this.supabase
                .from('agent_memories')
                .delete()
                .eq('agent_name', agentName);

            if (error) throw error;
        } catch (error) {
            console.error(`Error clearing memories for ${agentName}:`, error);
            throw error;
        }
    }
} 