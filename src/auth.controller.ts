import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { KaryawanService } from './karyawan.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly karyawanService: KaryawanService,
  ) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const result = await this.authService.validateUser(body.username, body.password);
    if (!result) throw new UnauthorizedException('Login gagal');
    return {
      token: result.accessToken,
      restoId: result.restoId,
      role: result.role,
    };
  }

  @Post('register')
  async registerResto(@Body() body: any) {
    const resto = await this.authService.register(
      body.username,
      body.password,
      body.namaResto,
    );
    await this.karyawanService.tambahKaryawan(
      body.usernameKasir,
      body.passwordKasir,
      resto.id,
    );
    return { message: 'Pendaftaran berhasil' };
  }

  @Post('login-karyawan')
  async loginKaryawan(@Body() body: { username: string; password: string; restoId: number }) {
    const result = await this.authService.validateKaryawan(body.username, body.password, body.restoId);
    if (!result) throw new UnauthorizedException('Login karyawan gagal');
    return {
      message: 'Login karyawan berhasil',
      user: result,
    };
  }
}