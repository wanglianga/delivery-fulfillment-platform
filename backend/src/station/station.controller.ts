import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StationService } from './station.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('station')
@UseGuards(JwtGuard)
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Get('capacity')
  getCapacity(@Query('stationId') stationId: string) {
    return this.stationService.getCapacity(Number(stationId));
  }

  @Get('heatmap')
  getHeatmap(
    @Query('stationId') stationId: string,
    @Query('timeRange') timeRange?: string,
  ) {
    return this.stationService.getHeatmap(Number(stationId), timeRange);
  }
}
