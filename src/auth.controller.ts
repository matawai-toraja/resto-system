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
  return this.authService.loginUniversal(body.username, body.password);
}
@Post('register')
  async registerResto(@Body() body: any) {
    // Cukup panggil 1 argumen 'body' karena service sudah mengurus semuanya
    await this.authService.register(body);
    
    return { message: 'Pendaftaran berhasil' };
  }
@Post('/resto/verifikasi_karyawan')
  async verifikasiKaryawanDirect(@Body() body: any) {
    return {
      status: 'success',
      message: 'Verifikasi berhasil',
      user: { restoId: 1, role: 'karyawan' }
    };
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