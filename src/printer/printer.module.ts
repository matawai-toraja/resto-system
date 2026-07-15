import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Pastikan ini terimpor
import { PrinterService } from './printer.service';
import { PrinterController } from './printer.controller';
import { PrinterSettings } from './printer-settings.entity'; // Pastikan path benar

@Module({
  imports: [TypeOrmModule.forFeature([PrinterSettings])], // Pastikan PrinterSettings ada di sini
  controllers: [PrinterController],
  providers: [PrinterService],
})
export class PrinterModule {}