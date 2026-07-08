import { Injectable } from '@nestjs/common';

@Injectable()
export class MenuService {
  private menus = [
    { id: 1, nama: 'Nasi Goreng', harga: 20000, kategori: 'Makanan' },
    { id: 2, nama: 'Es Teh Manis', harga: 5000, kategori: 'Minuman' }
  ];

  findAll() { return this.menus; }

  create(menuData: any) {
    const newMenu = { id: this.menus.length + 1, ...menuData };
    this.menus.push(newMenu);
    return newMenu;
  }
}