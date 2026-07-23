import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Resto } from './resto.entity';
import { Karyawan } from './karyawan.entity';
import { KaryawanService } from './karyawan.service'; // <-- Tambahkan ini

@Module({
  imports: [
    TypeOrmModule.forFeature([Resto, Karyawan]),
  ],
  controllers: [AuthController],
  providers: [AuthService, KaryawanService], // <-- Masukkan KaryawanService di sini
  exports: [AuthService],
})
export class AuthModule {}