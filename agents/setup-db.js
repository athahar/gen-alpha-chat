import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function setupDatabase() {
    console.log('Setting up database...');

    // Check for required environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
        console.error('Error: Missing required environment variables.');
        console.error('Please ensure SUPABASE_URL and SUPABASE_KEY are set in your .env file');
        process.exit(1);
    }

    console.log('Environment variables loaded successfully');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
    console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✓ Set' : '✗ Missing');

    // Initialize Supabase client
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    try {
        // Read and execute the SQL migration
        console.log('Executing database migrations...');
        const migrationPath = path.join(process.cwd(), 'migrations', '001_initial_setup.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split the SQL into individual statements
        const statements = sql
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0);

        // Execute each statement
        for (const statement of statements) {
            console.log('Executing SQL statement...');
            const { error } = await supabase.rpc('exec_sql', {
                sql: statement + ';'
            });

            if (error) {
                console.error('Error executing SQL:', error);
                console.error('Statement:', statement);
                throw error;
            }
        }

        console.log('Database setup completed successfully!');
    } catch (error) {
        console.error('Error setting up database:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        process.exit(1);
    }
}

// Run the setup
setupDatabase().catch(error => {
    console.error('Unhandled error:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    process.exit(1);
}); 