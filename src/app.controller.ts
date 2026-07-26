import { Controller, Get, Post, Delete, Param, Body, UseInterceptors, UploadedFile, BadRequestException, Query, UseGuards, Res, HttpException, HttpStatus } from '@nestjs/common';
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
import { Resto } from './resto.entity'; 
import { Karyawan } from './karyawan.entity'; 
import { AuthGuard } from './auth.guard';
import { PaymentService } from './PaymentService';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

@Controller('resto')
export class AppController {
  constructor(
    @InjectRepository(Menu) private menuRepo: Repository<Menu>,
    @InjectRepository(Pesanan) private pesananRepo: Repository<Pesanan>,
    @InjectRepository(Riwayat) private riwayatRepo: Repository<Riwayat>,
    @InjectRepository(Transaksi) private transaksiRepo: Repository<Transaksi>,
    @InjectRepository(Resto) private restoRepo: Repository<Resto>,
    @InjectRepository(Karyawan) private karyawanRepo: Repository<Karyawan>,
    private readonly paymentService: PaymentService,
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
  ) {}

  private validateRestoId(id: any) {
    const restoId = Number(id);
    if (!id || isNaN(restoId)) throw new BadRequestException("restoId wajib diisi dan harus berupa angka");
    return restoId;
  }

  // --- HALAMAN & API SUPER ADMIN ---
  @Get('super-admin')
  getSuperAdminPage(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'super-admin.html'));
  }

  @Get('super-admin/api/all-tenants')
  async getAllTenants() {
    return await this.restoRepo.find();
  }

@Post('super-admin/api/tambah-tenant')
  async tambahTenantGlobal(@Body() body: { 
    namaResto: string; 
    username: string; 
    password: string; 
    noHp?: string;           // 1. Tangkap parameter ini dari frontend
    usernameKasir?: string; 
    passwordKasir?: string; 
  }) {
    try {
      if (!body.namaResto || !body.username || !body.password) {
        throw new BadRequestException("Data utama wajib diisi!");
      }

      const hashedAdminPassword = await bcrypt.hash(body.password, 10);

      const restoBaru = this.restoRepo.create({
        namaResto: body.namaResto,
        username: body.username,
        password: hashedAdminPassword,
        wa_admin: body.noHp || null, // 2. Masukkan langsung ke kolom wa_admin
        statusAktif: true
      });
      
      // 3. Simpan dan tangkap hasilnya ke variabel 'savedResto' agar ID-nya bisa dipakai
      const savedResto = await this.restoRepo.save(restoBaru);

      if (body.usernameKasir && body.passwordKasir) {
        const hashedKasirPassword = await bcrypt.hash(body.passwordKasir, 10);

        const kasirBaru = this.karyawanRepo.create({
          username: body.usernameKasir,
          password: hashedKasirPassword,
          restoId: savedResto.id // Sekarang aman, savedResto sudah didefinisikan!
        });
        await this.karyawanRepo.save(kasirBaru);
      }

      return { success: true, message: "Resto dan kasir berhasil didaftarkan dengan aman" };
    } catch (error) {
      console.error("Gagal tambah tenant:", error.message);
      throw new BadRequestException(error.message || "Gagal mendaftarkan restoran.");
    }
  }
  @Post('super-admin/api/toggle-status')
  async toggleStatusTenant(@Body() body: { restoId: number }) {
    const rId = this.validateRestoId(body.restoId);
    const resto = await this.restoRepo.findOne({ where: { id: rId } });
    if (!resto) throw new HttpException('Resto tidak ditemukan', HttpStatus.NOT_FOUND);
    
    resto.statusAktif = resto.statusAktif === false ? true : false;
    await this.restoRepo.save(resto);
    return { success: true, statusAktif: resto.statusAktif };
  }

  @Get('page/ganti-password')
  getGantiPasswordPage(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'ganti-password.html'));
  }

  @Post('api/ganti-password-mandiri')
  async gantiPasswordMandiri(@Body() body: any) {
      const { username, passwordLama, passwordBaru } = body;
      
      const resto = await this.restoRepo.findOne({ where: { username } });
      if (!resto) {
          return { success: false, message: 'Username restoran tidak ditemukan!' };
      }

      const isPasswordValid = await bcrypt.compare(passwordLama, resto.password);
      if (!isPasswordValid) {
          return { success: false, message: 'Password lama salah!' };
      }

      resto.password = await bcrypt.hash(passwordBaru, 10);
      await this.restoRepo.save(resto);

      return { success: true, message: 'Password berhasil diubah' };
  }

  @Post('api/update-password-baru')
  async updatePasswordBaru(@Body() body: any) {
      const { username, passwordBaru } = body;

      const resto = await this.restoRepo.findOne({ where: { username } });
      if (!resto) {
          return { success: false, message: 'Username restoran tidak ditemukan!' };
      }

      if (resto.password && resto.password.trim() !== '') {
          return { 
              success: false, 
              message: 'Gagal! Akun Anda belum di-reset oleh Super Admin. Silakan hubungi Super Admin terlebih dahulu.' 
          };
      }

      const hashedPassword = await bcrypt.hash(passwordBaru, 10);
      resto.password = hashedPassword;
      await this.restoRepo.save(resto);

      return { success: true, message: 'Password baru berhasil disimpan' };
  }

  @Post('super-admin/api/hapus-tenant')
  async hapusTenantGlobal(@Body() body: { restoId: any }) {
    try {
      const restoId = Number(body.restoId);
      await this.karyawanRepo.delete({ restoId: restoId });
      await this.restoRepo.delete(restoId);
      return { success: true, message: "Tenant berhasil dihapus" };
    } catch (error) {
      console.error("Gagal hapus tenant:", error.message);
      throw new BadRequestException("Gagal menghapus tenant karena kendala relasi database.");
    }
  }

  @Get('by-token')
  async getRestoByToken(@Query('token') token: string) {
    if (!token) {
      throw new HttpException('Token tidak ditemukan', HttpStatus.BAD_REQUEST);
    }
    const resto = await this.restoRepo.findOne({
      where: [
        { tokenUnik: token },
        { username: token }
      ]
    });
    if (!resto) {
      throw new HttpException('Resto tidak ditemukan', HttpStatus.NOT_FOUND);
    }
    return { restoId: resto.id, namaResto: resto.namaResto };
  }

  @Get('get-token-unik')
  async getTokenUnikResto(@Query('restoId') restoId: number) {
    const resto = await this.restoRepo.findOne({ where: { id: Number(restoId) } });
    if (!resto) {
      return { tokenUnik: null };
    }
    return { tokenUnik: resto.tokenUnik };
  }

  // --- API GENERATE TOKEN UNIK ---
  @Post('generate-token')
  async generateToken(@Body('restoId') restoId: number) {
    const rId = this.validateRestoId(restoId);
    const tokenUnik = 'token-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    await this.restoRepo.update(rId, { tokenUnik });
    return { tokenUnik };
  }

  // --- LOGIKA MULTI-TENANT OTOMATIS PADA HALAMAN UTAMA ---
 @Get()
  async getMenuByToken(@Query('token') token: string, @Res() res: Response) {
    // Hapus total parameter restoid atau query ID angka untuk keamanan!
    if (!token) {
      return res.send("<h2 style='text-align:center; margin-top:50px; font-family:sans-serif;'>Akses ditolak: Link menu wajib menggunakan Token Unik yang sah.</h2>");
    }

    const resto = await this.restoRepo.findOne({ 
      where: [
        { tokenUnik: token },
        { username: token }
      ] 
    });

    if (!resto) {
      return res.send("<h2 style='text-align:center; margin-top:50px; font-family:sans-serif;'>Link menu tidak valid atau kedaluwarsa.</h2>");
    }

    if (resto.statusAktif === false || Number(resto.statusAktif) === 0) {
      return res.send("<h2 style='text-align:center; margin-top:50px; font-family:sans-serif; color:red;'>Restoran ini sedang dinonaktifkan oleh Administrator.</h2>");
    }

    if (resto.isMaintenance === true || Number(resto.isMaintenance) === 1) {
      return res.send(`
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background: #111; color: #ff4d4d; font-family: sans-serif; text-align: center; padding: 20px;">
            <h1 style="font-size: 28px; margin-bottom: 10px;">⚠️ Mohon Maaf, Toko Sedang Maintenance</h1>
            <p style="color: #aaa; font-size: 16px;">Silakan kunjungi kembali beberapa saat lagi.</p>
        </div>
      `);
    }
    
    const filePath = join(process.cwd(), 'public', 'index.html');
    let htmlContent = fs.readFileSync(filePath, 'utf8');

    const injectedScript = `
      <script>
        window.dynamicRestoId = ${resto.id};
        window.dynamicNamaResto = "${resto.namaResto || 'Restoran'}";
      </script>
    `;
    
    htmlContent = htmlContent.replace('</head>', injectedScript + '</head>');
    return res.send(htmlContent);
  }
@Post('simpan-custom-token')
  async simpanCustomToken(@Body() body: { restoId: number; customToken: string }) {
    const rId = this.validateRestoId(body.restoId);
    let tokenBaru = body.customToken ? body.customToken.trim() : '';

    if (!tokenBaru) {
      throw new BadRequestException("Token tidak boleh kosong!");
    }

    // Bersihkan karakter spasi atau simbol berbahaya agar aman jadi URL query
    tokenBaru = tokenBaru.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();

    // Cek apakah token custom tersebut sudah dipakai oleh resto lain
    const existingResto = await this.restoRepo.findOne({ where: { tokenUnik: tokenBaru } });
    if (existingResto && existingResto.id !== rId) {
      throw new BadRequestException("Token ini sudah digunakan oleh restoran lain. Silakan gunakan nama lain!");
    }

    // Simpan token baru ke database
    await this.restoRepo.update(rId, { tokenUnik: tokenBaru });
    return { success: true, tokenUnik: tokenBaru };
  }
  @Get('resto/detail-token')
  async getRestoToken(@Query('restoId') restoId: number) {
    const resto = await this.restoRepo.findOne({ where: { id: Number(restoId) } });
    if (!resto) {
      throw new HttpException('Resto tidak ditemukan', HttpStatus.NOT_FOUND);
    }
    return { tokenUnik: resto.tokenUnik };
  }

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

  @Get('payment/notification')
  testNotification() {
    return { status: 'OK', message: 'Webhook siap menerima notifikasi' };
  }

  @Post('hapus-menu')
  async hapusMenu(@Body() data: { id: number }) { await this.menuRepo.delete(data.id); return { status: "Menu Dihapus" }; }

  @Post('edit-status')
  async editStatus(@Body() data: { id: number; stok: number }) { await this.menuRepo.update(data.id, { stok: data.stok }); return { status: "Status Diperbarui" }; }

  @Post('kasir/pesan-semua')
  async pesanSemua(@Body() data: any) {
    const sessionStart = data.sessionStart;
    const waktuSekarang = new Date().getTime();
    if (!sessionStart || (waktuSekarang - Number(sessionStart) > 3600000)) {
        throw new HttpException("Sesi telah berakhir atau tidak valid!", HttpStatus.FORBIDDEN);
    }
    const restoId = this.validateRestoId(data.restoId);
    const totalBayar = Number(data.totalHarga) || Number(data.total) || 0;

    return await this.dataSource.transaction(async (entityManager) => {
        const pesananBaru = await entityManager.save(
          entityManager.create(Pesanan, { 
            ...data, 
            meja: String(data.meja), 
            pesanan: typeof data.pesanan === 'string' ? data.pesanan : JSON.stringify(data.pesanan), 
            status: 'pending',
            statusDapur: 'menunggu',
            restoId: restoId
          })
        );

        if (data.metodePembayaran === 'digital') {
          try {
            const paymentResult = await this.paymentService.createSnapToken(restoId, {
                order_id: pesananBaru.id, 
                total: totalBayar, 
                pesanan: data.pesanan
            });

            return { 
                id: pesananBaru.id, 
                paymentUrl: paymentResult.redirectUrl 
            };
          } catch (midtransError) {
            console.error("[Pembayaran Gagal - Batalkan Pesanan]:", midtransError.message);
            throw new HttpException(
              "Metode pembayaran QRIS/Digital sedang gangguan. Silakan gunakan metode pembayaran Tunai!", 
              HttpStatus.BAD_REQUEST
            );
          }
        }

        return { id: pesananBaru.id, paymentUrl: null };
    });
  }

  @Post('notification')
  async receiveNotification(@Body() body: any) {
    return await this.paymentService.handleNotification(body);
  }

  @Get('kasir/cek-status-pesanan')
  async cekStatusPesanan(@Query('restoId') restoId: string) {
    const rId = this.validateRestoId(restoId);
    const semuaPesanan = await this.pesananRepo.find({ where: { restoId: rId } });
    
    return semuaPesanan.filter(p => {
      if (p.metodePembayaran === 'tunai') return true;
      if (p.metodePembayaran === 'digital' && p.statusPembayaran === 'lunas') return true;
      return false; 
    });
  }

  @UseGuards(AuthGuard)
  @Post('kasir/batal')
  async batalPesanan(@Body() body: { id: number }) { 
    await this.pesananRepo.delete(body.id); 
    return { success: true }; 
  }

  @UseGuards(AuthGuard) @Post('kasir/update-dapur')
  async updateStatusDapur(@Body() body: { id: number, statusDapur: string }) { await this.pesananRepo.update(body.id, { statusDapur: body.statusDapur }); return { success: true }; }

  @UseGuards(AuthGuard) @Post('kasir/bayar')
  async bayarPesanan(@Body() body: { id: number }) { await this.pesananRepo.update(body.id, { status: 'dibayar' }); return { success: true }; }

  @UseGuards(AuthGuard) @Post('kasir/selesai')
  async selesaiPesanan(@Body() body: { id: number }) {
    const pesanan = await this.pesananRepo.findOne({ where: { id: Number(body.id) } });
    if (!pesanan) {
      return { success: false, message: "Pesanan tidak ditemukan" };
    }

    let dataP = [];
    try {
      dataP = typeof pesanan.pesanan === 'string' ? JSON.parse(pesanan.pesanan) : (pesanan.pesanan || []);
    } catch (e) {
      dataP = [];
    }
    const total = dataP.reduce((s: number, i: any) => s + (Number(i.harga || 0) * Number(i.jumlah || 1)), 0);
    
    const riwayatBaru = this.riwayatRepo.create({
      nama: pesanan.nama || 'Pelanggan',
      meja: String(pesanan.meja || '-'),
      pesanan: typeof pesanan.pesanan === 'string' ? pesanan.pesanan : JSON.stringify(pesanan.pesanan),
      totalBayar: total,
      restoId: Number(pesanan.restoId),
      tanggalTransaksi: new Date().toISOString().split('T')[0],
      waktuSelesai: new Date().toISOString()
    });

    await this.riwayatRepo.save(riwayatBaru);
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
    const h = new Date().toISOString().split('T')[0];
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

  @Post('verifikasi_karyawan')
  async verifikasiKaryawan(@Body() body: { username: string; password: string; restoId: number }) {
    try {
      const result = await this.authService.validateKaryawan(body.username || 'kasir', body.password, body.restoId);
      
      if (!result) {
        throw new HttpException('Password salah', HttpStatus.UNAUTHORIZED);
      }

      return {
        status: 'success',
        message: 'Verifikasi berhasil',
        user: result,
      };
    } catch (error) {
      throw new HttpException('Password salah atau akses ditolak', HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('menu/update-location')
  async updateLocation(@Body() body: { restoId: number, lat: number, lon: number }) {
    await this.restoRepo.update(this.validateRestoId(body.restoId), { latitude: body.lat, longitude: body.lon });
    return { status: "Sukses" };
  }

  @Post('menu/resto/wa/update')
  async updateWa(@Body() body: { restoId: number, nomor: string }) {
    return await this.restoRepo.update(Number(body.restoId), { nomorWa: body.nomor });
  }

  @Post('midtrans-callback')
  async handleMidtransCallback(@Body() notification: any) {
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = notification;

    let realPesananId = order_id;
    if (order_id.includes('RESTO-')) {
      const parts = order_id.split('-');
      realPesananId = parts[1]; 
    }

    const pesanan = await this.pesananRepo.findOne({ where: { id: Number(realPesananId) } });
    if (!pesanan) {
      throw new HttpException('Data pesanan tidak ditemukan', HttpStatus.NOT_FOUND);
    }

    const resto = await this.restoRepo.findOne({ where: { id: pesanan.restoId } });
    if (!resto || !resto.midtransServerKey) {
      throw new HttpException('Kredensial Resto tidak valid', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const localSignature = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + resto.midtransServerKey)
      .digest('hex');

    if (localSignature !== signature_key) {
      throw new HttpException('Tanda tangan enkripsi tidak cocok! Akses ditolak.', HttpStatus.UNAUTHORIZED);
    }

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      await this.pesananRepo.update(pesanan.id, { 
        statusPembayaran: 'lunas',
        status: 'pending' 
      }); 
      return { status: 'success', message: 'Pembayaran terverifikasi' };
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      await this.pesananRepo.update(pesanan.id, { statusPembayaran: 'gagal' });
      return { status: 'failed', message: 'Transaksi dibatalkan/kadaluwarsa' };
    }

    return { status: 'pending' };
  }

  @Get('/menu/resto/wa')
  async getWa(@Query('restoId') restoId: number) {
    const resto = await this.restoRepo.findOne({ where: { id: restoId } });
    return resto ? resto.nomorWa : "";
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

  @Get(['api/resto/public-status', 'resto/api/resto/public-status'])
  async getPublicStatus(@Query('token') token: string) {
    if (!token) {
      return { is_buka: true };
    }
    
    const resto = await this.restoRepo.findOne({ 
      where: [
        { tokenUnik: token },
        { username: token }
      ] 
    });

    if (!resto) {
      return { is_buka: true };
    }

    if (resto.statusAktif === false || Number(resto.statusAktif) === 0) {
      return { is_buka: false, message: 'Restoran dinonaktifkan oleh Administrator' };
    }

    if (resto.isMaintenance === true || Number(resto.isMaintenance) === 1) {
      return { is_buka: false, message: 'Restoran sedang maintenance' };
    }

    return { is_buka: true };
  }

  @Post('update-status')
  async updateStatus(@Body() body: { restoId: number, status: boolean }) {
    const restoId = this.validateRestoId(body.restoId);
    const resto = await this.restoRepo.findOne({ where: { id: restoId } });
    if (!resto) throw new HttpException('Resto tidak ditemukan', HttpStatus.NOT_FOUND);

    resto.isMaintenance = !body.status; 
    await this.restoRepo.save(resto);
    return { success: true, is_buka: body.status };
  }

  @Post('edit-harga')
  async editHarga(@Body() data: { id: number; harga: number }) {
    await this.menuRepo.update(data.id, { harga: data.harga });
    return { status: "Harga Diperbarui" };
  }

  @Post('update-midtrans')
  async updateMidtrans(@Body() body: { restoId: any, server_key: string, client_key: string }) {
    const rId = this.validateRestoId(body.restoId);

    await this.restoRepo.update(rId, {
      midtransServerKey: body.server_key,
      midtransClientKey: body.client_key
    });

    return { status: "Sukses", message: "Kunci Midtrans berhasil diperbarui" };
  }

  @UseGuards(AuthGuard) @Post('kasir/reset-data')
  async resetData(@Body('restoId') rId: string) {
    await this.riwayatRepo.delete({ restoId: this.validateRestoId(rId) });
    return { status: "Sukses" };
  }
}