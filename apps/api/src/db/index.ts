import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/simulsst_db';

// Pool de conexiones a PostgreSQL
export const pool = new Pool({
  connectionString: databaseUrl,
});

// Instancia tipada de Drizzle ORM con el esquema relacional
export const db = drizzle(pool, { schema });

// Función de verificación de salud de la base de datos
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Error conectando a PostgreSQL:', error);
    return false;
  }
}
