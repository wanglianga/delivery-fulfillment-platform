import { Controller, Get, Post, Put, Delete, Query, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';

@Controller('tickets')
@UseGuards(JwtGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('exceptionId') exceptionId?: string,
  ) {
    return this.ticketsService.findAll({
      status,
      type,
      exceptionId: exceptionId ? Number(exceptionId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.findOne(id);
  }

  @Post()
  create(@Body() body: {
    exceptionId: number;
    orderId: number;
    type: string;
    priority?: string;
    assignedTo?: number;
  }) {
    return this.ticketsService.create(body);
  }

  @Post(':id/judge')
  judge(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { responsibility: string; resolution: string },
  ) {
    return this.ticketsService.judge(id, body.responsibility, body.resolution);
  }

  @Post(':id/compensate')
  compensate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.compensate(id, user.id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: string; priority?: string; assignedTo?: number },
  ) {
    return this.ticketsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.remove(id);
  }
}
