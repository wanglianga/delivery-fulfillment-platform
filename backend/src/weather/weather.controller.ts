import { Controller, Get, Post, Put, Delete, Query, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('weather')
@UseGuards(JwtGuard)
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('alerts')
  getActiveAlerts(@Query('stationId') stationId?: string) {
    return this.weatherService.getActiveAlerts(stationId ? Number(stationId) : undefined);
  }

  @Get()
  findAll(
    @Query('stationId') stationId?: string,
    @Query('level') level?: string,
  ) {
    return this.weatherService.findAll({
      stationId: stationId ? Number(stationId) : undefined,
      level,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.weatherService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    stationId: number;
    type: string;
    level: string;
    description?: string;
    startTime: string;
    endTime: string;
  }) {
    return this.weatherService.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      type?: string;
      level?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
    },
  ) {
    return this.weatherService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.weatherService.remove(id);
  }
}
