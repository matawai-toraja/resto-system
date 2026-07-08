import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

import { Menu } from './menu.entity';
import { Pesanan } from './pesanan.entity';
import { Riwayat } from './riwayat.entity';
import { Transaksi } from './transaksi.entity';
import { Resto } from './resto.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    
    // Konfigurasi ini memastikan folder public bisa diakses, 
    // tapi tidak "mencuri" rute API Anda.
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
        entities: [Menu, Pesanan, Riwayat, Transaksi, Resto],
        synchronize: true,
      }),
    }),

    TypeOrmModule.forFeature([Menu, Pesanan, Riwayat, Transaksi, Resto]),
  ],
  controllers: [AppController, AuthController, MenuController],
  providers: [AuthService, MenuService],
})
export class AppModule {}