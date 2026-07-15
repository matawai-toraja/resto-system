import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Karyawan } from './karyawan.entity';

@Injectable()
export class KaryawanService {
  constructor(
    @InjectRepository(Karyawan)
    private karyawanRepository: Repository<Karyawan>,
  ) {}

 async tambahKaryawan(username: string, password: string, restoId: number) {
    // 1. Cek apakah di resto ini SUDAH ADA akun karyawan
    const existingKaryawan = await this.karyawanRepository.findOne({ 
        where: { restoId: Number(restoId) } 
    });

    // 2. Jika sudah ada, jangan buat lagi (Error)
    if (existingKaryawan) {
        throw new ConflictException('Akun karyawan untuk resto ini sudah ada!');
    }

    // 3. Jika belum ada, baru buat
    const newKaryawan = this.karyawanRepository.create({
        username,
        password,
        restoId: Number(restoId),
    });
    
    return await this.karyawanRepository.save(newKaryawan);
}
}