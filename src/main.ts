import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors();

  // Global API prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,               // strip unknown properties
      forbidNonWhitelisted: true,    // throw on unknown properties
      transform: true,               // auto-transform query params to their DTO types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response transform interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Employee Management System (EMS) API')
    .setDescription(
      `
## Overview
A production-grade RESTful API for managing Admins, Employees, and Attendance records.

## Roles & Access
| Role        | Description                                              |
|-------------|----------------------------------------------------------|
| SUPER_ADMIN | Full system access. Can manage all admins and employees. |
| ADMIN       | Can manage employees and attendance. Limited admin ops.  |
| EMPLOYEE    | Can view own profile, punch in/out, update own data.     |

## Authentication
Use the \`/api/v1/auth/admin/login\` or \`/api/v1/auth/employee/login\` endpoint to get a JWT token.
Then click **Authorize** and enter: \`Bearer <your_token>\`

## Departments (Enum)
HR, IT, ENGINEERING, FINANCE, MARKETING, SALES, OPERATIONS, LEGAL, CUSTOMER_SUPPORT
    `,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'Bearer',
    )
    .addTag('Auth', 'Authentication endpoints for admins and employees')
    .addTag('Admins', 'Admin management (SUPER_ADMIN controlled)')
    .addTag('Employees', 'Employee management')
    .addTag('Attendance', 'Punch-in/out and report generation')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀  EMS API is running on: http://localhost:${port}/api/v1`);
  console.log(`📚  Swagger Docs:          http://localhost:${port}/api/docs\n`);
}

bootstrap();
