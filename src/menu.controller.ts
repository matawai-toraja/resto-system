import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MenuService } from './menu.service';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  async tambah(@Body() body: any) {
    return await this.menuService.tambahMenu(body);
  }

  @Get(':restoId')
  async tampilkan(@Param('restoId') restoId: number) {
    return await this.menuService.ambilMenuResto(restoId);
  }
}