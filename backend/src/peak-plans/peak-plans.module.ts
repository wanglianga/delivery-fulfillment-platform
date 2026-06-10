import { Module } from '@nestjs/common';
import { PeakPlansController } from './peak-plans.controller';
import { PeakPlansService } from './peak-plans.service';

@Module({
  controllers: [PeakPlansController],
  providers: [PeakPlansService],
  exports: [PeakPlansService],
})
export class PeakPlansModule {}
