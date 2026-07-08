import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Menu } from './menu.entity';

@Entity('resto')
export class Resto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  namaResto: string;

  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password: string; // Ingat: nanti kita akan simpan hasil hash bcrypt di sini

  // Relasi: Satu Resto punya banyak Menu
  @OneToMany(() => Menu, (menu) => menu.resto)
  menus: Menu[];
}