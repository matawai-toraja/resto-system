import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pesanan } from './pesanan.entity';
import { Resto } from './resto.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Pesanan)
    private pesananRepository: Repository<Pesanan>,
    @InjectRepository(Resto)
    private restoRepository: Repository<Resto>,
  ) {}

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

  async updateNomorWa(restoId: number, nomor: string) {
    return await this.restoRepository.update(restoId, { nomorWa: nomor });
  }

  async getNomorWa(restoId: number) {
    const resto = await this.restoRepository.findOne({ where: { id: restoId } });
    return resto ? resto.nomorWa : "";
  }
}