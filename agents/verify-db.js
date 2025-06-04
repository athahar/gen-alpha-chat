import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyDatabase() {
    console.log('Verifying database setup...');

    // Check for required environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.error('Error: Missing required environment variables.');
        console.error('Please ensure SUPABASE_URL and SUPABASE_KEY are set in your .env file');
        process.exit(1);
    }

    // Initialize Supabase client
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    try {
        // Test 1: Verify table exists
        console.log('\nTest 1: Verifying table existence...');
        const { data: tableData, error: tableError } = await supabase
            .from('agent_memories')
            .select('*')
            .limit(1);

        if (tableError) {
            if (tableError.code === '42P01') {
                console.error('Error: agent_memories table does not exist');
                process.exit(1);
            }
            throw tableError;
        }
        console.log('✓ Table exists');

        // Test 2: Verify table structure
        console.log('\nTest 2: Verifying table structure...');
        const { data: columns, error: columnError } = await supabase.rpc('exec_sql', {
            sql: `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'agent_memories'
                ORDER BY ordinal_position;
            `
        });

        if (columnError) throw columnError;

        const expectedColumns = {
            'id': { type: 'bigint', nullable: 'NO' },
            'agent_name': { type: 'character varying', nullable: 'NO' },
            'memory_key': { type: 'character varying', nullable: 'NO' },
            'memory_value': { type: 'jsonb', nullable: 'NO' },
            'created_at': { type: 'timestamp with time zone', nullable: 'YES' },
            'updated_at': { type: 'timestamp with time zone', nullable: 'YES' }
        };

        let structureValid = true;
        for (const [name, expected] of Object.entries(expectedColumns)) {
            const column = columns.find(c => c.column_name === name);
            if (!column) {
                console.error(`✗ Missing column: ${name}`);
                structureValid = false;
                continue;
            }
            if (column.data_type !== expected.type || column.is_nullable !== expected.nullable) {
                console.error(`✗ Invalid column ${name}: expected type ${expected.type} and nullable ${expected.nullable}, got ${column.data_type} and ${column.is_nullable}`);
                structureValid = false;
            }
        }
        console.log(structureValid ? '✓ Table structure is valid' : '✗ Table structure is invalid');

        // Test 3: Verify indexes
        console.log('\nTest 3: Verifying indexes...');
        const { data: indexes, error: indexError } = await supabase.rpc('exec_sql', {
            sql: `
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'agent_memories';
            `
        });

        if (indexError) throw indexError;

        const expectedIndexes = [
            'agent_memories_pkey',
            'idx_agent_memories_agent_name',
            'idx_agent_memories_memory_key'
        ];

        const foundIndexes = indexes.map(i => i.indexname);
        const missingIndexes = expectedIndexes.filter(i => !foundIndexes.includes(i));
        
        if (missingIndexes.length > 0) {
            console.error('✗ Missing indexes:', missingIndexes);
        } else {
            console.log('✓ All indexes exist');
        }

        // Test 4: Verify trigger
        console.log('\nTest 4: Verifying trigger...');
        const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
            sql: `
                SELECT tgname, tgtype, tgenabled
                FROM pg_trigger
                WHERE tgrelid = 'agent_memories'::regclass;
            `
        });

        if (triggerError) throw triggerError;

        const hasUpdateTrigger = triggers.some(t => 
            t.tgname === 'update_agent_memories_updated_at' && 
            t.tgenabled === 'O'
        );

        console.log(hasUpdateTrigger ? '✓ Update trigger exists' : '✗ Update trigger is missing');

        // Test 5: Test insert and update
        console.log('\nTest 5: Testing insert and update...');
        const testData = {
            agent_name: 'test_agent',
            memory_key: 'test_key',
            memory_value: { test: 'value' }
        };

        // Insert test data
        const { error: insertError } = await supabase
            .from('agent_memories')
            .insert(testData);

        if (insertError) throw insertError;
        console.log('✓ Insert successful');

        // Update test data
        const { error: updateError } = await supabase
            .from('agent_memories')
            .update({ memory_value: { test: 'updated_value' } })
            .match({ agent_name: 'test_agent', memory_key: 'test_key' });

        if (updateError) throw updateError;
        console.log('✓ Update successful');

        // Clean up test data
        const { error: deleteError } = await supabase
            .from('agent_memories')
            .delete()
            .match({ agent_name: 'test_agent', memory_key: 'test_key' });

        if (deleteError) throw deleteError;
        console.log('✓ Cleanup successful');

        console.log('\nAll database verification tests completed successfully!');
    } catch (error) {
        console.error('Error verifying database:', error);
        process.exit(1);
    }
}

// Run the verification
verifyDatabase().catch(console.error); 