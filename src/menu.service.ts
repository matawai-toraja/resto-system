import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './menu.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
  ) {}

  // Menambah menu baru
  async tambahMenu(data: { nama: string, harga: number, stok: number, kategori: string, gambar: string, restoId: number }) {
    const newMenu = this.menuRepository.create(data);
    return await this.menuRepository.save(newMenu);
  }

  // Mengambil daftar menu berdasarkan restoId
  async ambilMenuResto(restoId: number) {
    return await this.menuRepository.find({ where: { restoId } });
  }
}