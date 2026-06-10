import { Controller, Get, Post, Put, Delete, Query, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { PeakPlansService } from './peak-plans.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('peak-plans')
@UseGuards(JwtGuard)
export class PeakPlansController {
  constructor(private readonly peakPlansService: PeakPlansService) {}

  @Get()
  findAll(
    @Query('stationId') stationId?: string,
    @Query('status') status?: string,
  ) {
    return this.peakPlansService.findAll({
      stationId: stationId ? Number(stationId) : undefined,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.peakPlansService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    stationId: number;
    name: string;
    triggerCondition?: string;
    actions?: string[];
  }) {
    return this.peakPlansService.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name?: string;
      triggerCondition?: string;
      actions?: string[];
    },
  ) {
    return this.peakPlansService.update(id, body);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.peakPlansService.activate(id);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.peakPlansService.deactivate(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.peakPlansService.remove(id);
  }
}
