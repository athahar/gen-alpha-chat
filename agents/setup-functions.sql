-- Function to create a table
CREATE OR REPLACE FUNCTION create_table(
    table_name text,
    columns text,
    constraints text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I (%s%s)',
        table_name,
        columns,
        CASE WHEN constraints IS NOT NULL THEN ', ' || constraints ELSE '' END
    );
END;
$$;

-- Function to create an index
CREATE OR REPLACE FUNCTION create_index(
    table_name text,
    index_name text,
    column_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = table_name
        AND indexname = index_name
    ) THEN
        EXECUTE format(
            'CREATE INDEX %I ON %I (%I)',
            index_name,
            table_name,
            column_name
        );
    END IF;
END;
$$;

-- Function to create a trigger function
CREATE OR REPLACE FUNCTION create_trigger_function(
    function_name text,
    function_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format(
        'CREATE OR REPLACE FUNCTION %I() RETURNS TRIGGER AS $$ %s $$ LANGUAGE plpgsql',
        function_name,
        function_body
    );
END;
$$;

-- Function to create a trigger
CREATE OR REPLACE FUNCTION create_trigger(
    table_name text,
    trigger_name text,
    function_name text,
    timing text,
    event text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE format(
        'DROP TRIGGER IF EXISTS %I ON %I; CREATE TRIGGER %I %s %s ON %I FOR EACH ROW EXECUTE FUNCTION %I()',
        trigger_name,
        table_name,
        trigger_name,
        timing,
        event,
        table_name,
        function_name
    );
END;
$$; 