import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { OrdersService } from './orders.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/decorators';
import { v4 as uuidv4 } from 'uuid';

@Controller('orders')
@UseGuards(JwtGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('stationId') stationId?: string,
    @Query('merchantId') merchantId?: string,
    @Query('riderId') riderId?: string,
    @Query('riderIdNull') riderIdNull?: string,
  ) {
    return this.ordersService.findAll({
      status,
      stationId: stationId ? Number(stationId) : undefined,
      merchantId: merchantId ? Number(merchantId) : undefined,
      riderId: riderId ? Number(riderId) : undefined,
      riderIdNull: riderIdNull === 'true',
    });
  }

  @Get('reassigning')
  findAllReassigning(
    @Query('stationId') stationId?: string,
  ) {
    return this.ordersService.findAllReassigningOrders(stationId ? Number(stationId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Get(':id/context')
  getContext(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderContext(id);
  }

  @Post()
  create(@Body() body: {
    stationId: number;
    merchantId: number;
    customerName: string;
    customerAddress: string;
    customerPhone?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    totalAmount?: number;
    deliveryFee?: number;
    estimatedDeliveryTime?: string;
  }) {
    return this.ordersService.create(body);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.ordersService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }

  @Post(':id/accept')
  accept(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.accept(id, user.id, user.name);
  }

  @Post(':id/arrive-store')
  arriveStore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.arriveStore(id, user.name);
  }

  @Post(':id/merchant-confirm')
  merchantConfirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.merchantConfirm(id, user.name);
  }

  @Post(':id/pick-up')
  pickUp(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() body?: { pickupPhoto?: string },
  ) {
    return this.ordersService.pickUp(id, user.name, body?.pickupPhoto);
  }

  @Post(':id/upload-pickup-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  uploadPickupPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const photoUrl = `/uploads/${file.filename}`;
    return this.ordersService.uploadPickupPhoto(id, photoUrl, user.name);
  }

  @Post(':id/deliver')
  deliver(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.deliver(id, user.name);
  }

  @Post(':id/deliver-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  deliverPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const photoUrl = `/uploads/${file.filename}`;
    return this.ordersService.deliverPhoto(id, photoUrl, user.name);
  }

  @Post(':id/sign')
  sign(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.sign(id, user.name);
  }

  @Post(':id/merchant-prepare')
  merchantPrepare(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.merchantPrepare(id, user.name);
  }

  @Post(':id/merchant-ready')
  merchantReady(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.merchantReady(id, user.name);
  }

  @Post(':id/report-accident')
  reportAccident(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { accidentType: string; description: string; photos?: string[] },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.reportAccident(id, user.id, body);
  }

  @Get(':id/nearby-riders')
  findNearbyRiders(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findNearbyRiders(id);
  }

  @Post(':id/reassign')
  reassignOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newRiderId: number; responsibilitySplit?: { originalRider: number; newRider: number; platform: number } },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.reassignOrder(id, body.newRiderId, user.name, body.responsibilitySplit);
  }

  @Get(':id/reassign-records')
  findReassignRecords(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findReassignRecordsByOrder(id);
  }

  @Post(':id/request-address-change')
  requestAddressChange(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newAddress: string },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.requestAddressChange(id, {
      newAddress: body.newAddress,
      requestedBy: user.id,
    });
  }

  @Post(':id/confirm-address-change')
  confirmAddressChange(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.confirmAddressChange(id, user.id);
  }

  @Post(':id/reject-address-change')
  rejectAddressChange(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.rejectAddressChange(id, user.id, body.reason);
  }

  @Get(':id/address-change-records')
  findAddressChangeRecords(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findAddressChangeByOrder(id);
  }
}
