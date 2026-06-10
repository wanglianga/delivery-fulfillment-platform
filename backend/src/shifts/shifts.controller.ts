import { Controller, Get, Post, Put, Delete, Query, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('shifts')
@UseGuards(JwtGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  findAll(
    @Query('stationId') stationId?: string,
    @Query('date') date?: string,
    @Query('riderId') riderId?: string,
  ) {
    return this.shiftsService.findAll({
      stationId: stationId ? Number(stationId) : undefined,
      date,
      riderId: riderId ? Number(riderId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    riderId: number;
    stationId: number;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    serviceArea?: string;
  }) {
    return this.shiftsService.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      startTime?: string;
      endTime?: string;
      type?: string;
      serviceArea?: string;
      status?: string;
    },
  ) {
    return this.shiftsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.shiftsService.remove(id);
  }
}
