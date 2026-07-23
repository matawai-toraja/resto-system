import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Resto } from './resto.entity';
import { Karyawan } from './karyawan.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Resto)
    private restoRepository: Repository<Resto>,
    @InjectRepository(Karyawan) 
    private karyawanRepository: Repository<Karyawan>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const resto = await this.restoRepository.findOne({ where: { username } });

    if (!resto || !(await bcrypt.compare(password, resto.password))) {
        throw new UnauthorizedException('Kredensial tidak valid');
    }

    const { password: _, ...restoData } = resto;
    
    const payload = { username: resto.username, sub: resto.id, role: 'admin' };
    const generatedToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
        ...restoData,
        restoId: resto.id, 
        namaResto: resto.namaResto,
        accessToken: generatedToken,
        role: 'admin'
    };
  }

async validateKaryawan(username: string, password: string, restoId: number): Promise<any> {
    console.log("Mencari karyawan untuk restoId:", Number(restoId));

    const karyawan = await this.karyawanRepository.findOne({  
        where: { restoId: Number(restoId) }  
    });

    if (!karyawan) {
        console.log("Karyawan TIDAK ditemukan untuk restoId tersebut.");
        throw new UnauthorizedException('Karyawan tidak ditemukan');
    }

    // Lakukan pengecekan password yang sebenarnya
    let isMatch = false;
    if (karyawan.password.startsWith('$2b$') || karyawan.password.startsWith('$2a$')) {
        isMatch = await bcrypt.compare(password, karyawan.password);
    } else {
        isMatch = (password === karyawan.password);
    }

    if (!isMatch) {
        console.log("Password karyawan salah.");
        throw new UnauthorizedException('Password salah');
    }

    const { password: _, ...karyawanData } = karyawan;
    
    const payload = { username: karyawan.username, sub: karyawan.id, role: 'karyawan', restoId };
    const generatedToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
        ...karyawanData,
        accessToken: generatedToken,
        role: 'karyawan'
    };
  }
  async loginUniversal(username: string, password: string): Promise<any> {
    console.log("--- PROSES LOGIN DIMULAI ---");
    console.log("Mencoba username:", username);

    // 1. Cek dulu ke tabel Resto (Admin)
    const resto = await this.restoRepository.findOne({ where: { username } });
    if (resto) {
      console.log("Username ditemukan sebagai Admin Resto:", resto.username);
      let isMatchResto = false;
      if (resto.password.startsWith('$2b$') || resto.password.startsWith('$2a$')) {
        isMatchResto = await bcrypt.compare(password, resto.password);
      } else {
        isMatchResto = (password === resto.password);
      }
      
      console.log("Apakah password admin cocok?", isMatchResto);
      if (isMatchResto) {
        const { password: _, ...restoData } = resto;
        const payload = { username: resto.username, sub: resto.id, role: 'admin' };
        const generatedToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        return {
          status: 'success',
          token: generatedToken,
          role: 'admin',
          restoId: resto.id,
          namaResto: resto.namaResto
        };
      }
    } else {
      console.log("Username TIDAK ditemukan di tabel Resto.");
    }

    // 2. Jika tidak ada di Resto, cek ke tabel Karyawan
    const karyawan = await this.karyawanRepository.findOne({ where: { username } });
    if (karyawan) {
      console.log("Username ditemukan sebagai Karyawan:", karyawan.username);
      
      let isMatchKaryawan = false;
      if (karyawan.password.startsWith('$2b$') || karyawan.password.startsWith('$2a$')) {
        isMatchKaryawan = await bcrypt.compare(password, karyawan.password);
      } else {
        isMatchKaryawan = (password === karyawan.password);
      }

      console.log("Apakah password karyawan cocok?", isMatchKaryawan);
      if (isMatchKaryawan) {
        const { password: _, ...karyawanData } = karyawan;
        const payload = { username: karyawan.username, sub: karyawan.id, role: 'kasir', restoId: karyawan.restoId };
        const generatedToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        return {
          status: 'success',
          token: generatedToken,
          role: 'kasir',
          restoId: karyawan.restoId,
          namaResto: 'Kasir Area'
        };
      }
    } else {
      console.log("Username TIDAK ditemukan di tabel Karyawan.");
    }

    console.log("Login GAGAL: Kredensial tidak valid.");
    throw new UnauthorizedException('Kredensial tidak valid');
  }
  async register(body: any): Promise<any> {
    const { username, password, namaResto, usernameKasir, passwordKasir } = body;

    const existing = await this.restoRepository.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('Username admin sudah terpakai');
    }

    const hashedAdminPassword = await bcrypt.hash(password, 10);
    const newResto = this.restoRepository.create({
      username,
      password: hashedAdminPassword,
      namaResto,
    });
    const savedResto = await this.restoRepository.save(newResto);

    if (usernameKasir && passwordKasir) {
      const hashedKasirPassword = await bcrypt.hash(passwordKasir, 10);
      const newKaryawan = this.karyawanRepository.create({
        username: usernameKasir,
        password: hashedKasirPassword,
        restoId: savedResto.id,
      });
      await this.karyawanRepository.save(newKaryawan);
    }

    const { password: _, ...result } = savedResto;
    return {
      message: 'Registrasi resto dan kasir berhasil',
      ...result,
    };
  }
} 