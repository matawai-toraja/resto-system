import { Controller, Get } from '@nestjs/common';

@Controller('menu')
export class MenuController {

  @Get('makanan')
  getMenuMakanan() {
    return [
      { id: 1, nama: "Nasi Goreng", harga: 20000 },
      { id: 2, nama: "Ayam Bakar", harga: 25000 },
      { id: 3, nama: "Es Teh Manis", harga: 5000 }
    ];
  }

  @Get('pelanggan')
  getPelanggan() {
    return [
      { id: 101, nama: "Budi", meja: 5 },
      { id: 102, nama: "Siti", meja: 2 }
    ];
  }
}