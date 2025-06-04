-- Function to create the agent_memories table
CREATE OR REPLACE FUNCTION create_agent_memories_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS agent_memories (
        id BIGSERIAL PRIMARY KEY,
        agent_name VARCHAR(255) NOT NULL,
        memory_key VARCHAR(255) NOT NULL,
        memory_value JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(agent_name, memory_key)
    );
END;
$$;

-- Function to create indexes
CREATE OR REPLACE FUNCTION create_agent_memories_indexes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create indexes if they don't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'agent_memories'
        AND indexname = 'idx_agent_memories_agent_name'
    ) THEN
        CREATE INDEX idx_agent_memories_agent_name ON agent_memories(agent_name);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'agent_memories'
        AND indexname = 'idx_agent_memories_memory_key'
    ) THEN
        CREATE INDEX idx_agent_memories_memory_key ON agent_memories(memory_key);
    END IF;

    -- Create or replace the update_updated_at_column function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Create or replace the trigger
    DROP TRIGGER IF EXISTS update_agent_memories_updated_at ON agent_memories;
    CREATE TRIGGER update_agent_memories_updated_at
        BEFORE UPDATE ON agent_memories
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END;
$$; 