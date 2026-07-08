import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Resto } from './resto.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Resto)
    private restoRepository: Repository<Resto>,
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
        accessToken: "token_akses_aktif",
        role: 'admin'
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