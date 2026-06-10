import { Controller, Get, Post, Query, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CompensationsService } from './compensations.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';

@Controller('compensations')
@UseGuards(JwtGuard)
export class CompensationsController {
  constructor(private readonly compensationsService: CompensationsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('ticketId') ticketId?: string,
  ) {
    return this.compensationsService.findAll({
      status,
      ticketId: ticketId ? Number(ticketId) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.compensationsService.findOne(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() body?: { reason?: string },
  ) {
    return this.compensationsService.approve(id, user.id, body?.reason);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() body?: { reason?: string },
  ) {
    return this.compensationsService.reject(id, user.id, body?.reason);
  }
}
