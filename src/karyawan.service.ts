import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt'; // <--- 1. Tambahkan import bcrypt
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

    // 3. Hash password menggunakan bcrypt sebelum disimpan
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Jika belum ada, baru buat dengan password yang sudah ter-hash
    const newKaryawan = this.karyawanRepository.create({
        username,
        password: hashedPassword, // <--- Menggunakan password terenkripsi
        restoId: Number(restoId),
    });
    
    return await this.karyawanRepository.save(newKaryawan);
  }
}