import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { StorageModule } from './common/storage/storage.module.js';
import { BootstrapModule } from './common/bootstrap/bootstrap.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { AdsModule } from './modules/ads/ads.module.js';
import { StatsModule } from './modules/stats/stats.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { InvoicesModule } from './modules/invoices/invoices.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module.js';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    BootstrapModule,
    AuthModule,
    PaymentsModule,
    OrdersModule,
    ProductsModule,
    ReviewsModule,
    UploadModule,
    AdsModule,
    StatsModule,
    UsersModule,
    InvoicesModule,
    ReportsModule,
    DiagnosticsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
