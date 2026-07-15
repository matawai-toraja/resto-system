import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './menu.entity';
import { Pesanan } from './pesanan.entity';
import { Riwayat } from './riwayat.entity';
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
    private readonly appGateway: AppGateway,
  ) {}

  async selesaikanPesanan(pesananId: number) {
    const p = await this.pesananRepository.findOne({ where: { id: pesananId } });
    if (!p) throw new Error("Pesanan tidak ditemukan");

    const items = typeof p.pesanan === 'string' ? JSON.parse(p.pesanan) : p.pesanan;
    let totalBayar = 0;
    let daftarItem = "";

    if (Array.isArray(items)) {
      daftarItem = items.map(i => `${i.nama} x${i.jumlah}`).join(', ');
      for (const item of items) {
        const menuAsli = await this.menuRepository.findOne({ where: { nama: item.nama } });
        totalBayar += (menuAsli ? Number(menuAsli.harga) : Number(item.harga || 0)) * (Number(item.jumlah) || 1);
      }
    }

    const riwayatBaru = new Riwayat();
    riwayatBaru.nama = p.nama || "";
    riwayatBaru.meja = (p.meja || 0).toString();
    riwayatBaru.totalBayar = totalBayar;
    riwayatBaru.pesanan = daftarItem;
    riwayatBaru.restoId = p.restoId;
    riwayatBaru.waktuSelesai = new Date().toISOString();
    riwayatBaru.tanggalTransaksi = new Date().toISOString().split('T')[0];

    await this.riwayatRepository.save(riwayatBaru);
    await this.pesananRepository.delete(pesananId);
    return { success: true };
  }

  async getRiwayat(restoId: number) {
    return await this.riwayatRepository.find({ where: { restoId }, order: { waktuSelesai: 'DESC' } });
  }

  async ambilLaporanHarian(restoId: number) {
    const hariIni = new Date().toISOString().split('T')[0];
    return await this.riwayatRepository.find({ where: { restoId, tanggalTransaksi: hariIni }, order: { waktuSelesai: 'DESC' } });
  }
async getAnalisaMenu(restoId: number) {
  // 1. Ambil data riwayat yang sudah terbukti benar
  const data = await this.riwayatRepository.find({ where: { restoId } });

  // 2. Olah data (Sama seperti statistik laporan harian)
  const menuStats: Record<string, { terjual: number, totalPendapatan: number }> = {};
  
  data.forEach(item => {
    if (item.pesanan) {
      item.pesanan.split(', ').forEach(p => {
        const parts = p.split(' x');
        const nama = parts[0];
        const jumlah = parseInt(parts[1]) || 1;
        
        if (!menuStats[nama]) menuStats[nama] = { terjual: 0, totalPendapatan: 0 };
        menuStats[nama].terjual += jumlah;
      });
    }
  });

  // 3. Ubah ke bentuk array agar mudah ditampilkan di tabel
  return Object.keys(menuStats).map(nama => ({
    nama,
    terjual: menuStats[nama].terjual,
    totalPendapatan: 0 // Anda bisa isi logic harga jika punya data harga
  }));
}

  async tambahMenu(data: any) {
    return await this.menuRepository.save(data);
  }

  async ambilMenuResto(restoId: number) {
    return await this.menuRepository.find({ where: { restoId } });
  }

  async ambilStatusToko(restoId: string) {
    const pathData = path.join(process.cwd(), 'data-resto.json');
    if (!fs.existsSync(pathData)) return { tokoBuka: true };
    return JSON.parse(fs.readFileSync(pathData, 'utf8'));
  }

  async updateStatusToko(restoId: string, status: boolean) {
    const pathData = path.join(process.cwd(), 'data-resto.json');
    fs.writeFileSync(pathData, JSON.stringify({ tokoBuka: status }));
    return { success: true };
  }


async getLaporanHarianStatistik(restoId: number) {
    const hariIni = new Date().toISOString().split('T')[0];
    const data = await this.riwayatRepository.find({ where: { restoId, tanggalTransaksi: hariIni } });
    const totalOmset = data.reduce((sum, item) => sum + Number(item.totalBayar || 0), 0);
    const jumlahTransaksi = data.length;
    const menuCount: Record<string, number> = {};
    data.forEach(item => {
      if (item.pesanan) {
        item.pesanan.split(', ').forEach(p => {
          const [nama, jmlStr] = p.split(' x');
          menuCount[nama] = (menuCount[nama] || 0) + (parseInt(jmlStr) || 1);
        });
      }
    });
    const menuTerlaris = Object.keys(menuCount).reduce((a, b) => (menuCount[a] > menuCount[b] ? a : b), 'Belum ada');
    return { totalOmset, jumlahTransaksi, menuTerlaris, data };
  }

  async getAnalisaKasir(restoId: number) {
  // 1. Ambil semua menu resto untuk referensi harga
  const daftarMenu = await this.menuRepository.find({ where: { restoId } });
  const hargaMenu: Record<string, number> = {};
  daftarMenu.forEach(m => {
    hargaMenu[m.nama] = Number(m.harga) || 0;
  });

  // 2. Ambil data riwayat
  const riwayat = await this.riwayatRepository.find({ where: { restoId } });
  const analisa: Record<string, { jumlah: number, totalPendapatan: number }> = {};

  riwayat.forEach(r => {
    if (r.pesanan) {
      r.pesanan.split(', ').forEach(item => {
        const parts = item.split(' x');
        const nama = parts[0];
        const jumlah = parseInt(parts[1]) || 1;
        
        if (!analisa[nama]) {
          analisa[nama] = { jumlah: 0, totalPendapatan: 0 };
        }
        
        analisa[nama].jumlah += jumlah;
        // Hitung pendapatan: jumlah porsi * harga dari daftarMenu
        analisa[nama].totalPendapatan += (jumlah * (hargaMenu[nama] || 0));
      });
    }
  });
  return analisa;
}
async ambilInfoResto(restoId: number) {
    return await this.restoRepository.findOne({ where: { id: restoId } });
}

async prosesPesanSemua(data: any) {
    const pesananBaru = new Pesanan();
    
    pesananBaru.nama = data.nama;
    pesananBaru.meja = data.meja;
    pesananBaru.restoId = data.restoId;
    
    const items = typeof data.pesanan === 'string' ? JSON.parse(data.pesanan) : data.pesanan;
    let totalHarga = 0;

    for (const item of items) {
        const menuAsli = await this.menuRepository.findOne({ where: { nama: item.nama } });
        const hargaAsli = menuAsli ? Number(menuAsli.harga) : 0;
        totalHarga += hargaAsli * Number(item.jumlah);
    }

    pesananBaru.pesanan = JSON.stringify(items);
    pesananBaru.harga = totalHarga;
    pesananBaru.jumlah = items.reduce((sum, i) => sum + Number(i.jumlah), 0);
    
    pesananBaru.status = 'pending';
    pesananBaru.statusDapur = 'menunggu';
    pesananBaru.kategori = 'umum';

    // 1. Simpan ke database dan tangkap hasilnya
    const pesananTersimpan = await this.pesananRepository.save(pesananBaru);
    
    // 2. KIRIM SINYAL (Tambahkan baris ini)
    this.appGateway.server.emit('pesanan_baru', pesananTersimpan);

    return pesananTersimpan;
}
async ambilNomorWa(restoId: number) {
    const resto = await this.restoRepository.findOne({ where: { id: restoId } });
    return resto?.nomorWa || '';
}

async updateNomorWa(restoId: number, nomorWa: string) {
  // Tambahkan { id: restoId } sebagai kriteria pencarian
  return await this.restoRepository.update({ id: Number(restoId) }, { 
    nomorWa: nomorWa 
  });
}
async updateLocation(restoId: number, lat: number, lon: number) {
    // Tambahkan validasi angka
    if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Data koordinat tidak valid (NaN)');
    }

    const resto = await this.restoRepository.findOne({ where: { id: Number(restoId) } });
    if (!resto) {
        throw new Error('Restoran tidak ditemukan');
    }

    resto.latitude = lat;
    resto.longitude = lon;
    
    return await this.restoRepository.save(resto);
}

async updateRestoRadius(restoId: number, radius: number) {
  return await this.restoRepository.update({ id: Number(restoId) }, {
    radiusJarak: radius
  });
}
private statusPesanan: Map<string, string> = new Map();

  updateStatusPesanan(id: string, status: string) {
    this.statusPesanan.set(id, status);
  }

  getStatusPesanan(id: string): string {
    return this.statusPesanan.get(id) || 'Menunggu Konfirmasi';
  }
}