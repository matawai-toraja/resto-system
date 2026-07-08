import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pesanan } from './pesanan.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Pesanan)
    private pesananRepository: Repository<Pesanan>,
  ) {}

  // Tambahkan fungsi ini untuk test simpan data
  async testSimpanData() {
    const dataBaru = this.pesananRepository.create({
      nama: 'Test Pelanggan',
      meja: '1',
      harga: 50000,
      kategori: 'Makanan',
      jumlah: 1,
    });
    return await this.pesananRepository.save(dataBaru);
  }
}