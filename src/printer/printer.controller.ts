import { Controller, Post, Body, BadRequestException, Get, Query } from '@nestjs/common';
import { PrinterService } from './printer.service';

@Controller('api/printer')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Post('settings')
  async updateSettings(@Body() body: any) {
    const { resto_id, auto_print } = body;
    if (!resto_id) {
        throw new BadRequestException('Resto ID tidak ditemukan');
    }
    return await this.printerService.updateSettings(Number(resto_id), auto_print);
  }

  // --- PERBAIKI BAGIAN GET INI ---
@Get('settings')
async getSettings(@Query('resto_id') resto_id: string) {
    if (!resto_id) {
        throw new BadRequestException('Resto ID diperlukan');
    }
    // Pastikan memanggil dengan argumen yang benar
    return await this.printerService.getSettings(Number(resto_id));
}
}