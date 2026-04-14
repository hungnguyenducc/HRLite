import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CrawlService } from './crawl.service';
import { Public } from '../../common/decorators/public.decorator';
import { CronAuthGuard } from '../../common/guards/cron-auth.guard';

const DEFAULT_COUNT = 20;

@Controller('crawl')
export class CrawlController {
  constructor(private readonly crawlService: CrawlService) {}

  // GET /api/crawl/random-users — Cron job endpoint
  @Public()
  @UseGuards(CronAuthGuard)
  @Get('random-users')
  async crawlGet() {
    return this.crawlService.crawlRandomUsers(DEFAULT_COUNT);
  }

  // POST /api/crawl/random-users — Manual crawl with custom count
  @Public()
  @UseGuards(CronAuthGuard)
  @Post('random-users')
  @HttpCode(HttpStatus.OK)
  async crawlPost(@Body() body: { count?: number }) {
    const count = Math.min(body?.count || DEFAULT_COUNT, 500);
    return this.crawlService.crawlRandomUsers(count);
  }
}
