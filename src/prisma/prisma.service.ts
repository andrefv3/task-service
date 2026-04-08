import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Configuring 'pg' Pool explicitly for Supabase's Pooler
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Options for pooling to optimize on Render/Supabase
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    // En Prisma 7 con adaptadores, $connect() es opcional pero buena práctica // In Prisma 7 with adapters, $connect() is optional but good practice
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}