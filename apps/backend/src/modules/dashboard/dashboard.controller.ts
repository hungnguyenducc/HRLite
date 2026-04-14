import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /api/dashboard/stats
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }
}
