import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrinterSettings } from './printer-settings.entity';

@Injectable()
export class PrinterService {
  constructor(
    @InjectRepository(PrinterSettings)
    private printerSettingsRepository: Repository<PrinterSettings>,
  ) {}

  async getSettings(restoId: number) {
    // Mencari data berdasarkan resto_id
    const settings = await this.printerSettingsRepository.findOne({ where: { resto_id: restoId } });
    // Jika tidak ditemukan, kembalikan objek default agar frontend tidak bingung
    return settings || { resto_id: restoId, auto_print: false };
  }

  async updateSettings(restoId: number, autoPrint: boolean) {
    let settings = await this.printerSettingsRepository.findOne({ where: { resto_id: restoId } });
    
    if (settings) {
      settings.auto_print = autoPrint;
      return await this.printerSettingsRepository.save(settings);
    } else {
      const newSettings = this.printerSettingsRepository.create({ 
        resto_id: restoId, 
        auto_print: autoPrint 
      });
      return await this.printerSettingsRepository.save(newSettings);
    }
  }
}