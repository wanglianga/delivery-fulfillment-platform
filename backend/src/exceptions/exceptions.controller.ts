import { Controller, Get, Post, Put, Delete, Query, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ExceptionsService } from './exceptions.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';

@Controller('exceptions')
@UseGuards(JwtGuard)
export class ExceptionsController {
  constructor(private readonly exceptionsService: ExceptionsService) {}

  @Get()
  findAll(
    @Query('orderId') orderId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.exceptionsService.findAll({
      orderId: orderId ? Number(orderId) : undefined,
      type,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exceptionsService.findOne(id);
  }

  @Post()
  create(
    @Body() body: { orderId: number; type: string; description: string; photos?: string[] },
    @CurrentUser() user: any,
  ) {
    return this.exceptionsService.create({
      orderId: body.orderId,
      type: body.type,
      description: body.description,
      reportedBy: user.id,
      reportedByRole: user.role,
      photos: body.photos,
    });
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status?: string; description?: string },
  ) {
    return this.exceptionsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.exceptionsService.remove(id);
  }
}
