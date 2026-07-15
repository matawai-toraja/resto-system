import { Controller, Get, Post, Body, UseInterceptors, UploadedFile, BadRequestException, Query, UseGuards, Res, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { join, extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './menu.entity';
import { Pesanan } from './pesanan.entity';
import { Riwayat } from './riwayat.entity';
import { Transaksi } from './transaksi.entity';
import { Resto } from './resto.entity'; // Pastikan entity ini ada
import { Karyawan } from './karyawan.entity'; // Pastikan entity ini ada
import { AuthGuard } from './auth.guard';

@Controller('resto')
export class AppController {
  constructor(
    @InjectRepository(Menu) private menuRepo: Repository<Menu>,
    @InjectRepository(Pesanan) private pesananRepo: Repository<Pesanan>,
    @InjectRepository(Riwayat) private riwayatRepo: Repository<Riwayat>,
    @InjectRepository(Transaksi) private transaksiRepo: Repository<Transaksi>,
    @InjectRepository(Resto) private restoRepo: Repository<Resto>,
    @InjectRepository(Karyawan) private karyawanRepo: Repository<Karyawan>,
  ) {}

  // --- Helper Validasi ---
  private validateRestoId(id: any) {
    const restoId = Number(id);
    if (!id || isNaN(restoId)) throw new BadRequestException("restoId wajib diisi dan harus berupa angka");
    return restoId;
  }

  // --- Tampilan ---
  @Get('menu-pelanggan') getMenuPelanggan(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'index.html')); }
  @Get('page/login') getLoginPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'login.html')); }
  @Get('page/register') getRegisterPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'register.html')); }
  @Get('page/dashboard') getDashboardPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'dashboard.html')); }
  @Get('page/kasir') getKasirPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'kasir.html')); }
  @Get('page/kasir-monitor') getMonitorPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'kasir-monitor.html')); }
  @Get('page/riwayat') getRiwayatPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'riwayat.html')); }
  @Get('page/laporan-harian') getLaporanHarianPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'laporan-harian.html')); }
  @Get('page/riwayat-keseluruhan') getRiwayatKeseluruhanPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'riwayat-keseluruhan.html')); }
  @UseGuards(AuthGuard) @Get('page/pengaturan') getPengaturanPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'pengaturan.html')); }
  @Get('page/analisa-menu') getAnalisaMenuPage(@Res() res: Response) { return res.sendFile(join(process.cwd(), 'public', 'analisa-menu.html')); }

  // --- Menu ---
  @Get('menu')
  async getMenu(@Query('restoId') restoId: string) {
    return await this.menuRepo.find({ where: { restoId: this.validateRestoId(restoId) } });
  }

  @Post('tambah-menu')
  @UseInterceptors(FileInterceptor('gambar', {
    storage: diskStorage({ destination: './public/uploads', filename: (req, file, cb) => { cb(null, Date.now() + extname(file.originalname)); } }),
  }))
  async tambahMenu(@Body() data: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("Gambar harus diunggah!");
    return await this.menuRepo.save({ ...data, harga: parseInt(data.harga), stok: parseInt(data.stok), gambar: '/uploads/' + file.filename, restoId: this.validateRestoId(data.restoId) });
  }
@Post('menu/resto/wa/update')
  async updateWa(@Body() body: { restoId: number, nomor: string }) {
      await this.restoRepo.update(this.validateRestoId(body.restoId), { nomorWa: body.nomor }); 
      return { success: true };
  }
@Get('menu/resto/wa')
async getWaResto(@Query('restoId') restoId: string) {
    const resto = await this.restoRepo.findOne({ where: { id: this.validateRestoId(restoId) } });
    return resto ? resto.nomorWa : ""; // Pastikan panggil nomorWa
}
  @Post('hapus-menu')
  async hapusMenu(@Body() data: { id: number }) { await this.menuRepo.delete(data.id); return { status: "Menu Dihapus" }; }

  @Post('edit-status')
  async editStatus(@Body() data: { id: number; stok: number }) { await this.menuRepo.update(data.id, { stok: data.stok }); return { status: "Status Diperbarui" }; }

  // --- Kasir ---
  @Post('kasir/pesan-semua')
  async pesanSemua(@Body() data: any) {
    this.validateRestoId(data.restoId);
    return await this.pesananRepo.save(this.pesananRepo.create({ ...data, meja: String(data.meja), pesanan: JSON.stringify(data.pesanan), status: 'pending', statusDapur: 'menunggu' }));
  }

  @UseGuards(AuthGuard) @Get('kasir/daftar-pesanan')
  async getPesanan(@Query('restoId') restoId: string) {
    return await this.pesananRepo.find({ where: { restoId: this.validateRestoId(restoId) } });
  }

  @UseGuards(AuthGuard) @Post('kasir/batal')
  async batalPesanan(@Body() body: { id: number }) { await this.pesananRepo.delete(body.id); return { success: true }; }

  @UseGuards(AuthGuard) @Post('kasir/update-dapur')
  async updateStatusDapur(@Body() body: { id: number, statusDapur: string }) { await this.pesananRepo.update(body.id, { statusDapur: body.statusDapur }); return { success: true }; }

  @UseGuards(AuthGuard) @Post('kasir/bayar')
  async bayarPesanan(@Body() body: { id: number }) { await this.pesananRepo.update(body.id, { status: 'dibayar' }); return { success: true }; }

  @UseGuards(AuthGuard) @Post('kasir/selesai')
  async selesaiPesanan(@Body() body: { id: number }) {
    const pesanan = await this.pesananRepo.findOne({ where: { id: body.id } });
    if (!pesanan) return { success: false };
    const dataP = JSON.parse(pesanan.pesanan || '[]');
    const total = dataP.reduce((s: number, i: any) => s + (Number(i.harga) * Number(i.jumlah)), 0);
    await this.riwayatRepo.save(this.riwayatRepo.create({ ...pesanan, totalBayar: total, tanggalTransaksi: new Date().toLocaleDateString('id-ID'), waktuSelesai: new Date().toISOString() }));
    await this.pesananRepo.delete(pesanan.id);
    return { success: true };
  }

  @UseGuards(AuthGuard) @Get('kasir/riwayat')
  async getRiwayat(@Query('tanggal') tgl: string, @Query('restoId') rId: string) {
    return await this.riwayatRepo.find({ where: { restoId: this.validateRestoId(rId), ...(tgl && { tanggalTransaksi: tgl }) } });
  }

  @UseGuards(AuthGuard) @Get('kasir/laporan-harian')
  async getLaporanHarian(@Query('restoId') rId: string) {
    const restoId = this.validateRestoId(rId);
    const h = new Date().toLocaleDateString('id-ID');
    const d = await this.riwayatRepo.find({ where: { tanggalTransaksi: h, restoId } });
    return { tanggal: h, data: d, totalOmzet: d.reduce((s, r) => s + Number(r.totalBayar), 0) };
  }

  @UseGuards(AuthGuard) @Get('kasir/analisa-menu')
  async getAnalisaMenu(@Query('restoId') rId: string) {
    const restoId = this.validateRestoId(rId);
    const data = await this.riwayatRepo.find({ where: { restoId } });
    const res: any = {};
    data.forEach(t => JSON.parse(t.pesanan || '[]').forEach((i: any) => {
      if (!res[i.nama]) res[i.nama] = { jumlah: 0, totalPendapatan: 0 };
      res[i.nama].jumlah += Number(i.jumlah); 
      res[i.nama].totalPendapatan += (Number(i.harga) * Number(i.jumlah));
    }));
    return res;
  }

  @UseGuards(AuthGuard) @Get('kasir/laporan-keseluruhan')
  async getLaporanKeseluruhan(@Query('restoId') rId: string) {
    const restoId = this.validateRestoId(rId);
    const d = await this.riwayatRepo.find({ where: { restoId } });
    return { data: d, totalOmzet: d.reduce((s, r) => s + Number(r.totalBayar), 0) };
  }

  @Post('verifikasi-karyawan')
  async verifikasiKaryawan(@Body() body: { password: string, restoId: string }) {
    const karyawan = await this.karyawanRepo.findOne({ where: { password: body.password, restoId: this.validateRestoId(body.restoId) } });
    if (karyawan) return { status: 'success' };
    throw new HttpException('Akses Ditolak', HttpStatus.UNAUTHORIZED);
  }

 @Post('menu/update-location')
async updateLocation(@Body() body: { restoId: number, lat: number, lon: number }) {
    // Pastikan nama kolom 'latitude' dan 'longitude' sama dengan di resto.entity.ts
    await this.restoRepo.update(this.validateRestoId(body.restoId), { 
        latitude: body.lat, 
        longitude: body.lon 
    });
    return { status: "Sukses" };
}

  @Post('kasir/ganti-password-karyawan')
  async gantiPasswordKaryawan(@Body() body: { passwordLama: string, passwordBaru: string, restoId: string }) {
    const restoId = this.validateRestoId(body.restoId);
    const karyawan = await this.karyawanRepo.findOne({ where: { password: body.passwordLama, restoId } });
    if (karyawan) {
      await this.karyawanRepo.update(karyawan.id, { password: body.passwordBaru });
      return { success: true };
    }
    throw new HttpException('Password lama salah!', HttpStatus.BAD_REQUEST);
  }

  @UseGuards(AuthGuard) @Post('kasir/reset-data')
  async resetData(@Body('restoId') rId: string) {
    await this.riwayatRepo.delete({ restoId: this.validateRestoId(rId) });
    return { status: "Sukses" };
  }
}