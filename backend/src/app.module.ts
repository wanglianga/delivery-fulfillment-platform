import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ShiftsModule } from './shifts/shifts.module';
import { OrdersModule } from './orders/orders.module';
import { ExceptionsModule } from './exceptions/exceptions.module';
import { TicketsModule } from './tickets/tickets.module';
import { CompensationsModule } from './compensations/compensations.module';
import { StationModule } from './station/station.module';
import { PeakPlansModule } from './peak-plans/peak-plans.module';
import { WeatherModule } from './weather/weather.module';
import { GatewayModule } from './gateway/gateway.module';
import { MerchantPerformanceModule } from './merchant-performance/merchant-performance.module';
import { SeedService } from './seed/seed.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ShiftsModule,
    OrdersModule,
    ExceptionsModule,
    TicketsModule,
    CompensationsModule,
    StationModule,
    PeakPlansModule,
    WeatherModule,
    GatewayModule,
    MerchantPerformanceModule,
  ],
  providers: [SeedService],
})
export class AppModule {}
