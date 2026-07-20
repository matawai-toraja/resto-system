import { Injectable, BadRequestException } from '@nestjs/common'; 
import cloudinary from './cloudinary.config'; 
import { Readable } from 'stream';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './menu.entity';
import { Pesanan } from './pesanan.entity';
import { Riwayat } from './riwayat.entity';
import { Transaksi } from './transaksi.entity';
import { Resto } from './resto.entity';
import * as fs from 'fs';
import * as path from 'path';
import { AppGateway } from './app.gateway';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Resto) private restoRepository: Repository<Resto>,
    @InjectRepository(Menu) private menuRepository: Repository<Menu>,
    @InjectRepository(Pesanan) private pesananRepository: Repository<Pesanan>,
    @InjectRepository(Riwayat) private riwayatRepository: Repository<Riwayat>,
    @InjectRepository(Transaksi) private transaksiRepository: Repository<Transaksi>,
    private readonly appGateway: AppGateway,
  ) {}

  // --- ALUR MONITOR & TRANSAKSI ---
  async updateStatusDapur(id: number, statusDapur: string) {
    return await this.pesananRepository.update(id, { statusDapur: statusDapur });
  }

async selesaikanPesanan(id: number, uangBayar: number, metode: string) {
    // 1. Ambil data pesanan
    const p = await this.pesananRepository.findOne({ where: { id: id } });
    if (!p) throw new Error("Pesanan tidak ditemukan");

    // 2. Hitung total harga item
    const items = typeof p.pesanan === 'string' ? JSON.parse(p.pesanan) : p.pesanan;
    const totalBayar = await this.hitungTotal(items);

    // 3. Simpan ke Riwayat
    const r = new Riwayat();
    r.nama = p.nama || "";
    r.meja = (p.meja || 0).toString();
    r.totalBayar = totalBayar;
    r.pesanan = JSON.stringify(items);
    
    r.restoId = p.restoId;
    r.waktuSelesai = new Date().toISOString();
    r.tanggalTransaksi = new Date().toISOString().split('T')[0];
    
    await this.riwayatRepository.save(r);
    await this.pesananRepository.delete(id);
    
    return { success: true };
  }  async hitungTotal(items: any[]) {
    let total = 0;
    for (const item of items) {
      const menuAsli = await this.menuRepository.findOne({ where: { nama: item.nama } });
      total += (menuAsli ? Number(menuAsli.harga) : Number(item.harga || 0)) * (Number(item.jumlah) || 1);
    }
    return total;
  }

  async cetakStruk(id: number, uangBayar: number) {
    const p = await this.pesananRepository.findOne({ where: { id: id } });
    if (!p) return;

    const items = typeof p.pesanan === 'string' ? JSON.parse(p.pesanan) : p.pesanan;
    const totalHarga = await this.hitungTotal(items);
    const kembalian = uangBayar - totalHarga;

    let struk = `--- STRUK PEMBAYARAN ---\n`;
    struk += `ID: ${p.id} | Meja: ${p.meja}\n`;
    items.forEach((i: any) => {
        struk += `${i.nama} x ${i.jumlah} : ${i.harga * i.jumlah}\n`;
    });
    struk += `Total: ${totalHarga}\nBayar: ${uangBayar}\nKembali: ${kembalian}\n`;
    
    console.log("Mencetak Struk:", struk);
  }

  // --- FUNGSI LAINNYA ---
  async tambahMenu(data: any, file: Express.Multer.File) {
    if (file) {
      const result = await new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { folder: 'menu_restoran' }, 
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        Readable.from(file.buffer).pipe(upload);
      });
      // Simpan URL dari Cloudinary ke kolom gambarUrl
      data.gambarUrl = (result as any).secure_url; 
    }
    return await this.menuRepository.save(data);
  }

  async ambilStatusToko(restoId: string) { 
    const pathData = path.join(process.cwd(), 'data-resto.json'); 
    return fs.existsSync(pathData) ? JSON.parse(fs.readFileSync(pathData, 'utf8')) : { tokoBuka: true }; 
  }

  async updateRestoRadius(restoId: number, radius: number) { 
    return await this.restoRepository.update({ id: Number(restoId) }, { radiusJarak: radius }); 
  }

  async ambilLaporanHarian(restoId: number) { 
    const hariIni = new Date().toISOString().split('T')[0]; 
    return await this.riwayatRepository.find({ where: { restoId, tanggalTransaksi: hariIni }, order: { waktuSelesai: 'DESC' } }); 
  }

  async updateNomorWa(restoId: number, nomorWa: string) { 
    return await this.restoRepository.update({ id: Number(restoId) }, { nomorWa }); 
  }

  async ambilNomorWa(restoId: number) { 
    const r = await this.restoRepository.findOne({ where: { id: restoId } }); 
    return r?.nomorWa || ''; 
  }

  async ambilInfoResto(restoId: number) { 
    return await this.restoRepository.findOne({ where: { id: restoId } }); 
  }

  async updateLocation(restoId: number, lat: number, lon: number) { 
    return await this.restoRepository.update({ id: Number(restoId) }, { latitude: lat, longitude: lon }); 
  }

  async getLaporanHarianStatistik(restoId: number) { 
    const h = new Date().toISOString().split('T')[0]; 
    const d = await this.riwayatRepository.find({ where: { restoId, tanggalTransaksi: h } }); 
    return { totalOmset: d.reduce((s, i) => s + Number(i.totalBayar || 0), 0), jumlahTransaksi: d.length, data: d }; 
  }

  async getAnalisaKasir(restoId: number) {
    const riwayat = await this.riwayatRepository.find({ where: { restoId: restoId } });
    const analisa: any = {};

    riwayat.forEach(r => {
        let items: any[] = [];
        try {
            items = typeof r.pesanan === 'string' ? JSON.parse(r.pesanan) : [];
        } catch (e) {
            return; 
        }

        if (Array.isArray(items)) {
            items.forEach(i => {
                if (!analisa[i.nama]) {
                    analisa[i.nama] = { jumlah: 0, totalPendapatan: 0 };
                }
                const jumlah = Number(i.jumlah) || 0;
                const harga = Number(i.harga) || 0;
                
                analisa[i.nama].jumlah += jumlah;
                analisa[i.nama].totalPendapatan += (harga * jumlah);
            });
        }
    });

    return analisa;
  }

  private statusPesanan: Map<string, string> = new Map();
  updateStatusPesanan(id: string, status: string) { this.statusPesanan.set(id, status); }
  getStatusPesanan(id: string): string { return this.statusPesanan.get(id) || 'Menunggu'; }

  async prosesPesanSemua(data: any) {
    // 1. Simpan pesanan awal ke database local
    const p = new Pesanan();
    p.nama = data.nama;
    p.meja = data.meja;
    p.pesanan = JSON.stringify(data.pesanan);
    p.restoId = Number(data.restoId);
    p.metodePembayaran = data.metodePembayaran; 
    p.statusPembayaran = 'menunggu';
    
    const pesananTersimpan = await this.pesananRepository.save(p);

    // 2. JIKA memilih Bayar Digital, minta token dengan HTTP Request Native (Bypass Bug SDK)
    if (data.metodePembayaran === 'Bayar Digital (QRIS/Transfer)') {
        try {
            const resto = await this.restoRepository.findOne({ where: { id: p.restoId } });
            if (!resto || !resto.midtransServerKey) {
                throw new Error("Midtrans Server Key untuk restoran ini belum diatur di database!");
            }

            const cleanServerKey = resto.midtransServerKey.trim();
            const totalHarga = await this.hitungTotal(data.pesanan);

            const parameter = {
                transaction_details: {
                    order_id: `RESTO-${pesananTersimpan.id}-${Date.now()}`,
                    gross_amount: Math.round(totalHarga), 
                },
                customer_details: {
                    first_name: data.nama || 'Pelanggan',
                }
            };

            // Mengonversi kunci otorisasi ke dalam standar Base64
            const authString = Buffer.from(cleanServerKey + ':').toString('base64');

            // Menembak langsung ke server utama Production Midtrans
            const responseMidtrans = await fetch('https://app.midtrans.com/snap/v1/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Basic ${authString}`
                },
                body: JSON.stringify(parameter)
            });

            const hasilTransaksi = await responseMidtrans.json();

            // Jika ada kode error dari Midtrans, cetak di log terminal Anda
            if (!responseMidtrans.ok || hasilTransaksi.error_messages) {
                console.log("=== DETAIL EROR DARI MIDTRANS (FETCH METHOD) ===");
                console.log(JSON.stringify(hasilTransaksi, null, 2));
                console.log("=================================================");
                throw new Error(hasilTransaksi.error_messages ? hasilTransaksi.error_messages.join(', ') : 'Gagal memproses transaksi.');
            }

            return {
                ...pesananTersimpan,
                token: hasilTransaksi.token,
                redirect_url: hasilTransaksi.redirect_url
            };

        } catch (error) {
            console.log("=== EROR PADA PROSES PESAN DIGITAL ===");
            console.log(error.message || error);
            console.log("======================================");

            throw new BadRequestException('Metode pembayaran QRIS/Digital sedang gangguan.');
        }
    }

    // 3. JIKA Bayar Tunai di Kasir, langsung kembalikan data biasa
    return pesananTersimpan;
  }

  async ambilMenuResto(restoId: number) { return await this.menuRepository.find({ where: { restoId } }); }
  
  async updateStatusToko(restoId: string, status: boolean) { 
    fs.writeFileSync(path.join(process.cwd(), 'data-resto.json'), JSON.stringify({ tokoBuka: status })); 
    return { success: true }; 
  }

  async konfirmasiPembayaran(id: number) {
    return await this.pesananRepository.update(id, { 
        statusPembayaran: 'lunas' 
    });
  }
}