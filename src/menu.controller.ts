import { Controller, Post, Get, Body, Param, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MenuService } from './menu.service';
import { FileInterceptor } from '@nestjs/platform-express';
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // --- MENU ---
@Post()
@UseInterceptors(FileInterceptor('gambar'))
async tambah(@Body() body: any, @UploadedFile() file: Express.Multer.File) {
  // Debug: Mari kita lihat apa yang sebenarnya terkirim ke backend
  console.log('Data Body:', body); 
  console.log('File:', file);
  
  return await this.menuService.tambahMenu(body, file);
}
  @Get(':restoId')
  async tampilkan(@Param('restoId') restoId: number) {
    return await this.menuService.ambilMenuResto(restoId);
  }
@Post('selesaikan/:id')
async konfirmasiBayar(@Param('id') id: number) {
    return await this.menuService.konfirmasiPembayaran(id);
}

  // --- STATUS TOKO ---
 @Get('status-toko')
  async getStatusToko(@Query('restoId') restoId: string) {
    return await this.menuService.ambilStatusToko(restoId);
  }
 @Post('update-status-toko')
  async updateStatusToko(@Body() body: { restoId: string, tokoBuka: boolean }) {
    return await this.menuService.updateStatusToko(body.restoId, body.tokoBuka);
  }
@Post('update-location')
async updateLocation(@Body() body: any) {
    // Pastikan menggunakan nama 'lat' dan 'lon' sesuai dengan yang dikirim dari dashboard.html
    return await this.menuService.updateLocation(body.restoId, body.lat, body.lon);
}

@Post('resto/radius/update')
async updateRadius(@Body() body: any) {
    return await this.menuService.updateRestoRadius(body.restoId, body.radius);
}


  // --- FITUR BARU: TRANSAKSI & LAPORAN ---
  
@Post('selesaikan/:id')
async selesaikanPesanan(
    @Param('id') id: number, 
    @Body() body: { uangBayar: number, metode: string } // Tangkap object body
) {
    // Teruskan metode ke service
    await this.menuService.selesaikanPesanan(id, body.uangBayar, body.metode);
    return { success: true };
}
  // Panggil rute ini di halaman Laporan Harian
@Get('laporan/harian')
async ambilLaporan(@Query('restoId') restoId: number) {
    // Kita panggil fungsi yang baru saja kita buat di Service
    return await this.menuService.ambilLaporanHarian(Number(restoId));
}

@Get('laporan/statistik')
async getLaporanStatistik(@Query('restoId') restoId: number) {
  return await this.menuService.getLaporanHarianStatistik(Number(restoId));
}
@Get('kasir/analisa-menu')
async getAnalisaKasir(@Query('restoId') restoId: number) {
  return await this.menuService.getAnalisaKasir(Number(restoId));
}
@Post('resto/wa/update') // Alamat ini harus sama persis dengan fetch di frontend
async updateNomorWa(@Body() body: { restoId: number; nomor: string }) {
    return await this.menuService.updateNomorWa(Number(body.restoId), body.nomor);
}
@Get('/resto/wa')
async getNomorWa(@Query('restoId') restoId: number, @Res() res: any) {
    const hasil = await this.menuService.ambilNomorWa(Number(restoId));
    // Mengirimkan teks murni sebagai respons
    return res.status(200).send(String(hasil)); 
}
@Get('resto/info')
  async getRestoInfo(@Query('restoId') restoId: number) {
    // Sesuaikan dengan fungsi di service Anda untuk mengambil data resto
    return await this.menuService.ambilInfoResto(Number(restoId));
  }
@Post('kasir/pesan-semua')
async pesanSemua(@Body() body: any) {
    // Pastikan kita menangkap hasil kembalian dari service
    const hasil = await this.menuService.prosesPesanSemua(body);
    return { id: hasil.id || hasil }; 
}
@Post('update-status-dapur')
async updateStatusDapur(@Body() body: { id: number, statusDapur: string }) {
  console.log("Data diterima controller:", body); // Cek di terminal VS Code saat tombol diklik
  return await this.menuService.updateStatusDapur(body.id, body.statusDapur);
}
  @Get('cek-status-pesanan')
  getStatus(@Query('id') id: string) {
    return { status: this.menuService.getStatusPesanan(id) };
  }
}