import { Injectable } from '@nestjs/common';
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

  async selesaikanPesanan(id: number, uangBayar: number) {
    const p = await this.pesananRepository.findOne({ where: { id: id } });
    if (!p) throw new Error("Pesanan tidak ditemukan");

    const items = typeof p.pesanan === 'string' ? JSON.parse(p.pesanan) : p.pesanan;
    const totalBayar = await this.hitungTotal(items);

    // ... (kode bagian simpan ke Transaksi tetap sama) ...

    // Simpan ke Riwayat
    const r = new Riwayat();
    r.nama = p.nama || "";
    r.meja = (p.meja || 0).toString();
    r.totalBayar = totalBayar;
    
    // --- UBAH BAGIAN INI ---
    // Hapus atau ganti baris lama yang menggunakan .map().join(', ') menjadi:
    r.pesanan = JSON.stringify(items); 
    // -----------------------
    
    r.restoId = p.restoId;
    r.waktuSelesai = new Date().toISOString();
    r.tanggalTransaksi = new Date().toISOString().split('T')[0];
    await this.riwayatRepository.save(r);

    await this.pesananRepository.delete(id);
    return { success: true };
  }
  async hitungTotal(items: any[]) {
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
  async tambahMenu(data: any) { return await this.menuRepository.save(data); }
  async ambilStatusToko(restoId: string) { const pathData = path.join(process.cwd(), 'data-resto.json'); return fs.existsSync(pathData) ? JSON.parse(fs.readFileSync(pathData, 'utf8')) : { tokoBuka: true }; }
  async updateRestoRadius(restoId: number, radius: number) { return await this.restoRepository.update({ id: Number(restoId) }, { radiusJarak: radius }); }
  async ambilLaporanHarian(restoId: number) { const hariIni = new Date().toISOString().split('T')[0]; return await this.riwayatRepository.find({ where: { restoId, tanggalTransaksi: hariIni }, order: { waktuSelesai: 'DESC' } }); }
  async updateNomorWa(restoId: number, nomorWa: string) { return await this.restoRepository.update({ id: Number(restoId) }, { nomorWa }); }
  async ambilNomorWa(restoId: number) { const r = await this.restoRepository.findOne({ where: { id: restoId } }); return r?.nomorWa || ''; }
  async ambilInfoResto(restoId: number) { return await this.restoRepository.findOne({ where: { id: restoId } }); }
  async updateLocation(restoId: number, lat: number, lon: number) { return await this.restoRepository.update({ id: Number(restoId) }, { latitude: lat, longitude: lon }); }
  async getLaporanHarianStatistik(restoId: number) { const h = new Date().toISOString().split('T')[0]; const d = await this.riwayatRepository.find({ where: { restoId, tanggalTransaksi: h } }); return { totalOmset: d.reduce((s, i) => s + Number(i.totalBayar || 0), 0), jumlahTransaksi: d.length, data: d }; }
async getAnalisaKasir(restoId: number) {
    // 1. Ambil semua riwayat transaksi dari database
    const riwayat = await this.riwayatRepository.find({ where: { restoId: restoId } });
    
    // 2. Siapkan wadah untuk menampung hasil perhitungan
    const analisa: any = {};

    // 3. Loop setiap transaksi untuk diolah
    riwayat.forEach(r => {
        // Karena r.pesanan di Riwayat adalah string (hasil .join), 
        // kita perlu memprosesnya kembali menjadi objek
        // Catatan: Jika r.pesanan berupa JSON String, kita parse.
        // Jika berupa format lama "nama x jumlah, nama x jumlah", kita pecah.
        
        let items: any[] = [];
        try {
            // Coba parse jika itu JSON String
            items = typeof r.pesanan === 'string' ? JSON.parse(r.pesanan) : [];
        } catch (e) {
            // Jika gagal parse, artinya format lama, abaikan saja atau buat logika fallback
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

    // 4. Kembalikan data yang sudah terhitung rapi
    return analisa;
  }
  private statusPesanan: Map<string, string> = new Map();
  updateStatusPesanan(id: string, status: string) { this.statusPesanan.set(id, status); }
  getStatusPesanan(id: string): string { return this.statusPesanan.get(id) || 'Menunggu'; }

  async prosesPesanSemua(data: any) {
    const p = new Pesanan();
    p.nama = data.nama; p.meja = data.meja; p.restoId = data.restoId;
    p.pesanan = typeof data.pesanan === 'string' ? data.pesanan : JSON.stringify(data.pesanan);
    p.status = 'pending'; p.statusDapur = 'menunggu';
    const saved = await this.pesananRepository.save(p);
    this.appGateway.server.emit('pesanan_baru', saved);
    return saved;
  }
  async ambilMenuResto(restoId: number) { return await this.menuRepository.find({ where: { restoId } }); }
  async updateStatusToko(restoId: string, status: boolean) { 
    fs.writeFileSync(path.join(process.cwd(), 'data-resto.json'), JSON.stringify({ tokoBuka: status })); 
    return { success: true }; 
  }
}