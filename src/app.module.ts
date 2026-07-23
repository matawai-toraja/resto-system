import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { JwtModule } from '@nestjs/jwt';
import { join } from 'path';

import { AppController } from './app.controller';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { KaryawanController } from './karyawan.controller'; 
import { KaryawanService } from './karyawan.service';
import { AppService } from './app.service';
import { PaymentService } from './PaymentService';
import { AppGateway } from './app.gateway';

// Import AuthModule yang baru dibuat
import { AuthModule } from './auth.module'; 

import { Menu } from './menu.entity';
import { Pesanan } from './pesanan.entity';
import { Riwayat } from './riwayat.entity';
import { Transaksi } from './transaksi.entity';
import { Resto } from './resto.entity';
import { Karyawan } from './karyawan.entity';
import { PrinterModule } from './printer/printer.module';
import { PrinterSettings } from './printer/printer-settings.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    
    JwtModule.register({
      global: true,
      secret: 'KODE_RAHASIA_RESTO_ANDA_BEBAS',
      signOptions: { expiresIn: '7d' },
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<number>('DB_PORT')),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [Menu, Pesanan, Riwayat, Transaksi, Resto, Karyawan, PrinterSettings],
        synchronize: true,
      }),
    }),

    TypeOrmModule.forFeature([Menu, Pesanan, Riwayat, Transaksi, Resto, Karyawan, PrinterSettings]),
    PrinterModule,
    AuthModule, // <--- Cukup daftarkan AuthModule di sini secara bersih
  ],
  controllers: [AppController, MenuController, KaryawanController],
  providers: [
    AppService, 
    MenuService, 
    KaryawanService, 
    AppGateway,
    PaymentService, 
  ],
})
export class AppModule {}