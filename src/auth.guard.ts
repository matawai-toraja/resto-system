import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  // Memeriksa token di header atau di query URL
  const token = request.headers['authorization'] || request.query.token;
  return !!token; // Mengizinkan akses jika token ditemukan
}
}