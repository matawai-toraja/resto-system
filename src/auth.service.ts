import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Resto } from './resto.entity';
import { Karyawan } from './karyawan.entity';

@Injectable()
export class AuthService {
constructor(
  @InjectRepository(Resto)
  private restoRepository: Repository<Resto>,
  @InjectRepository(Karyawan) // Tambahkan ini
  private karyawanRepository: Repository<Karyawan>,
) {}

 async validateUser(username: string, password: string): Promise<any> {
    const resto = await this.restoRepository.findOne({ where: { username } });

    if (!resto || !(await bcrypt.compare(password, resto.password))) {
        throw new UnauthorizedException('Kredensial tidak valid');
    }

    const { password: _, ...restoData } = resto;
    
    return {
        ...restoData,
        restoId: resto.id, // <--- INI KUNCI YANG DIBUTUHKAN FRONTEND
namaResto: resto.namaResto,
        accessToken: "token_akses_aktif",
        role: 'admin'
    };
}
async validateKaryawan(username: string, password: string, restoId: number): Promise<any> {
    // 1. Log untuk memastikan apa yang dikirim
    console.log("Mencari karyawan dengan:", { username, restoId: Number(restoId) });

    // 2. Coba cari semua karyawan di resto ini untuk memastikan datanya ada
    const semuaKaryawanDiResto = await this.karyawanRepository.find({ where: { restoId: Number(restoId) } });
    console.log("Daftar karyawan di resto ini:", semuaKaryawanDiResto);

    // 3. Cari karyawan spesifik
    const karyawan = await this.karyawanRepository.findOne({ 
        where: { username, restoId: Number(restoId) } 
    });

    if (!karyawan) {
        console.log("Karyawan TIDAK ditemukan dengan username tersebut.");
        throw new UnauthorizedException('Karyawan tidak ditemukan');
    }
    const isMatch = await bcrypt.compare(password, karyawan.password);
    console.log("Apakah password cocok?", isMatch);

    if (!isMatch) {
        throw new UnauthorizedException('Password salah');
    }

    const { password: _, ...karyawanData } = karyawan;
    
    return {
        ...karyawanData,
        role: 'karyawan'
    };
}
  async register(username: string, password: string, namaResto: string): Promise<any> {
    const existing = await this.restoRepository.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('Username sudah terpakai');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newResto = this.restoRepository.create({
      username,
      password: hashedPassword,
      namaResto,
    });

    const savedResto = await this.restoRepository.save(newResto);
    const { password: _, ...result } = savedResto;
    return result;
  }
}