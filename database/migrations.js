const { query } = require('./connection');

const migrations = [
  {
    name: 'create_migrations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id              BIGINT PRIMARY KEY,
        username        VARCHAR(255),
        first_name      VARCHAR(255) NOT NULL,
        last_name       VARCHAR(255),
        language_code   VARCHAR(10),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        last_seen_at    TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC);
    `
  },
  {
    name: 'create_conversations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS conversations (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         BIGINT NOT NULL REFERENCES users(id),
        chat_id         BIGINT NOT NULL,
        intent_type     VARCHAR(20) NOT NULL,
        status          VARCHAR(20) DEFAULT 'active',
        message_count   INTEGER DEFAULT 0,
        summary         TEXT,
        context_window  JSONB DEFAULT '[]'::jsonb,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        last_message_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, last_message_at DESC);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);
      CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
    `
  },
  {
    name: 'create_messages_table',
    sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id             BIGINT NOT NULL REFERENCES users(id),
        telegram_message_id BIGINT,
        role                VARCHAR(20) NOT NULL,
        intent_detected     VARCHAR(20),
        content_preview     VARCHAR(500),
        ai_response_preview VARCHAR(500),
        created_at          TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
    `
  },
  {
    name: 'create_pdf_generations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS pdf_generations (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        user_id         BIGINT NOT NULL REFERENCES users(id),
        pdf_type        VARCHAR(20) NOT NULL,
        extracted_data  JSONB NOT NULL,
        filename        VARCHAR(255),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_pdf_user ON pdf_generations(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pdf_created ON pdf_generations(created_at);
      CREATE INDEX IF NOT EXISTS idx_pdf_type ON pdf_generations(pdf_type);
    `
  },
  {
    name: 'create_daily_stats_table',
    sql: `
      CREATE TABLE IF NOT EXISTS daily_stats (
        date            DATE PRIMARY KEY,
        new_users       INTEGER DEFAULT 0,
        active_users    INTEGER DEFAULT 0,
        total_messages  INTEGER DEFAULT 0,
        resume_pdfs     INTEGER DEFAULT 0,
        booking_pdfs    INTEGER DEFAULT 0,
        general_chats   INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date DESC);
    `
  }
];

const runMigrations = async () => {
  console.log('Running database migrations...');
  
  try {
    // First, ensure migrations table exists
    const migrationsTableSQL = migrations.find(m => m.name === 'create_migrations_table');
    if (migrationsTableSQL) {
      try {
        await query(migrationsTableSQL.sql);
      } catch (e) {
        // Table might already exist, ignore error
      }
    }
    
    // Now run all migrations
    for (const migration of migrations) {
      // Skip the migrations table creation (already done)
      if (migration.name === 'create_migrations_table') {
        continue;
      }
      
      try {
        const existingCheck = await query(
          'SELECT 1 FROM migrations WHERE name = $1',
          [migration.name]
        );
        
        if (existingCheck.rows.length === 0) {
          console.log(`Running migration: ${migration.name}`);
          await query(migration.sql);
          await query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [migration.name]
          );
          console.log(`Migration ${migration.name} completed`);
        } else {
          console.log(`Migration ${migration.name} already executed, skipping`);
        }
      } catch (migrationError) {
        // If error is "already exists", mark as completed
        if (migrationError.code === '42P07' || migrationError.code === '42710') {
          console.log(`Migration ${migration.name} already exists, marking as completed`);
          try {
            await query(
              'INSERT INTO migrations (name) VALUES ($1)',
              [migration.name]
            );
          } catch (e) {}
        } else {
          throw migrationError;
        }
      }
    }
    
    console.log('All migrations completed successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
};

const rollbackMigration = async (migrationName) => {
  console.log(`Rolling back migration: ${migrationName}`);
  
  const rollbackSQL = {
    create_daily_stats_table: 'DROP TABLE IF EXISTS daily_stats CASCADE',
    create_pdf_generations_table: 'DROP TABLE IF EXISTS pdf_generations CASCADE',
    create_messages_table: 'DROP TABLE IF EXISTS messages CASCADE',
    create_conversations_table: 'DROP TABLE IF EXISTS conversations CASCADE',
    create_users_table: 'DROP TABLE IF EXISTS users CASCADE',
    create_migrations_table: 'DROP TABLE IF EXISTS migrations CASCADE'
  };
  
  if (rollbackSQL[migrationName]) {
    await query(rollbackSQL[migrationName]);
    await query('DELETE FROM migrations WHERE name = $1', [migrationName]);
    console.log(`Rollback of ${migrationName} completed`);
  }
};

module.exports = {
  runMigrations,
  rollbackMigration,
  migrations
};
