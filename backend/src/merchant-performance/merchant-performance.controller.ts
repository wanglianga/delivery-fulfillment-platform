import { Controller, Get, Post, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MerchantPerformanceService } from './merchant-performance.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('merchant-performance')
@UseGuards(JwtGuard)
export class MerchantPerformanceController {
  constructor(private readonly merchantPerformanceService: MerchantPerformanceService) {}

  @Get()
  findAll(
    @Query('stationId') stationId?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.merchantPerformanceService.findAll({
      stationId: stationId ? Number(stationId) : undefined,
      merchantId: merchantId ? Number(merchantId) : undefined,
    });
  }

  @Get('slow-records')
  findSlowRecords(
    @Query('merchantId') merchantId?: string,
  ) {
    return this.merchantPerformanceService.findSlowRecords({
      merchantId: merchantId ? Number(merchantId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.merchantPerformanceService.findOne(id);
  }

  @Post('slow-records/:recordId/confirm')
  confirmSlowRecord(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.merchantPerformanceService.confirmSlowRecord(recordId);
  }

  @Post('slow-records/:recordId/appeal')
  appealSlowPrepare(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.merchantPerformanceService.appealSlowPrepare(recordId);
  }
}
