import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CrawlService } from './crawl.service';
import { Public } from '../../common/decorators/public.decorator';

const DEFAULT_COUNT = 20;

@Controller('crawl')
export class CrawlController {
  constructor(private readonly crawlService: CrawlService) {}

  // GET /api/crawl/random-users — Cron job endpoint
  @Public()
  @Get('random-users')
  async crawlGet(@Headers('authorization') authHeader: string) {
    this.crawlService.validateAuth(authHeader);
    return this.crawlService.crawlRandomUsers(DEFAULT_COUNT);
  }

  // POST /api/crawl/random-users — Manual crawl with custom count
  @Public()
  @Post('random-users')
  @HttpCode(HttpStatus.OK)
  async crawlPost(
    @Headers('authorization') authHeader: string,
    @Body() body: { count?: number },
  ) {
    this.crawlService.validateAuth(authHeader);
    const count = Math.min(body?.count || DEFAULT_COUNT, 500);
    return this.crawlService.crawlRandomUsers(count);
  }
}
