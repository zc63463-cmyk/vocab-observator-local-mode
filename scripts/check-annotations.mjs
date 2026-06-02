import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://vocab:vocab@localhost:5432/vocab'
});

async function main() {
  await client.connect();
  console.log('→ Connected to localhost:5432');
  
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'word_annotations'
    );
  `);
  
  const exists = rows[0].exists;
  console.log(`→ word_annotations table exists: ${exists}`);
  
  if (!exists) {
    console.log('→ Applying 0026_word_annotations.sql ...');
    const fs = await import('fs');
    const sql = fs.readFileSync('supabase/migrations/0026_word_annotations.sql', 'utf8');
    await client.query(sql);
    console.log('→ Migration applied successfully!');
  } else {
    console.log('→ Migration already applied, nothing to do.');
  }
  
  await client.end();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
