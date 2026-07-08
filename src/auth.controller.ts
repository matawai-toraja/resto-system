import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common'; // Ditambahkan UnauthorizedException
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

@Post('login')
async login(@Body() body: { username: string, password: string }) {
    const result = await this.authService.validateUser(body.username, body.password);
    if (!result) throw new UnauthorizedException('Login gagal');

    return {
        token: result.accessToken,
        restoId: result.restoId, // Data ini wajib dikirim
        role: result.role
    };
}
  @Post('register')
  async register(@Body() body: { username: string, password: string, namaResto: string }) {
    return await this.authService.register(body.username, body.password, body.namaResto);
  }
}