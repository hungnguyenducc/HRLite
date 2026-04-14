import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { FirebaseAuthGuard } from './common/guards/firebase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { TermsModule } from './modules/terms/terms.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveModule } from './modules/leave/leave.module';
import { LeaveTypesModule } from './modules/leave-types/leave-types.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CrawlModule } from './modules/crawl/crawl.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000 * 10,
        limit: 100,
      },
    ]),

    // Infrastructure
    PrismaModule,
    FirebaseModule,
    EmailModule,

    // Business modules
    AuthModule,
    TermsModule,
    UsersModule,
    DepartmentsModule,
    EmployeesModule,
    AttendanceModule,
    LeaveModule,
    LeaveTypesModule,
    DashboardModule,
    CrawlModule,
    HealthModule,
  ],
  providers: [
    // Global guards — order: Throttler → Auth → Roles
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
