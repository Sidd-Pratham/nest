import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: ReturnType<typeof createClient> | null = null;
  private isConnected = false;
  private readonly DEFAULT_TTL = 300; // seconds

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
  }

  private async connect(): Promise<void> {
    try {
      const host = this.configService.get<string>('REDIS_HOST', 'localhost');
      const port = this.configService.get<number>('REDIS_PORT', 6379);

      this.client = createClient({
        socket: {
          host,
          port,
          connectTimeout: 3000,
          reconnectStrategy: false,
        },
      });

      this.client.on('error', (err: Error) => {
        this.logger.warn(`Redis unavailable at ${host}:${port}: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully');
      });

      this.client.on('end', () => {
        this.isConnected = false;
        this.logger.warn('Redis connection closed');
      });

      await this.client.connect();
      this.isConnected = true;
    } catch (err) {
      this.logger.warn(
        `Redis unavailable — app will fallback to DB queries. Reason: ${(err as Error).message}`,
      );
      this.isConnected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch {
      // Silently degrade — DB is source of truth
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || !this.isConnected || keys.length === 0) return;
    try {
      await this.client.del(keys);
    } catch {
      // Silently degrade
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      const keysToDelete: string[] = [];
      // redis v4/v5: SCAN cursor starts at 0 (as string '0' in some versions)
      let cursor = 0;
      do {
        // Use any cast to handle version differences in cursor type
        const result = await (this.client as any).scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = Number(result.cursor);
        keysToDelete.push(...(result.keys as string[]));
      } while (cursor !== 0);

      if (keysToDelete.length > 0) {
        await this.client.del(keysToDelete);
      }
    } catch {
      // Silently degrade
    }
  }
}
