import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminModule } from './admin/admin.module';
import { EmployeeModule } from './employee/employee.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    // Global config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI', 'mongodb://localhost:27017/ems_db'),
        connectionFactory: (connection: any) => {
          connection.on('connected', () => console.log('MongoDB connected'));
          connection.on('error', (err: Error) =>
            console.error('MongoDB connection error:', err.message),
          );
          return connection;
        },
      }),
      inject: [ConfigService],
    }),

    // Global Redis cache module
    CacheModule,

    // Feature modules
    AuthModule,
    AdminModule,
    EmployeeModule,
    AttendanceModule,
  ],
})
export class AppModule {}
