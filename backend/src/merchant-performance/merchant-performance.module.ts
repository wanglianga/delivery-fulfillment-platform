import { Module } from '@nestjs/common';
import { MerchantPerformanceController } from './merchant-performance.controller';
import { MerchantPerformanceService } from './merchant-performance.service';

@Module({
  controllers: [MerchantPerformanceController],
  providers: [MerchantPerformanceService],
  exports: [MerchantPerformanceService],
})
export class MerchantPerformanceModule {}
