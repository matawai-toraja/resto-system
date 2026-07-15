import { Controller, Post, Body } from '@nestjs/common';
import { KaryawanService } from './karyawan.service';

@Controller('karyawan')
export class KaryawanController {
  constructor(private readonly karyawanService: KaryawanService) {}

 @Post('tambah')
async tambahKaryawan(@Body() body: { username: string, password: string, restoId: number }) {
    // Panggil service dengan mengirim parameter yang benar
    return await this.karyawanService.tambahKaryawan(body.username, body.password, body.restoId);
}
}