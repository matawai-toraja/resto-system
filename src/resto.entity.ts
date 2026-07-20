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
  password: string;

  @Column({ nullable: true })
  nomorWa: string;

@Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
latitude: number;

@Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
longitude: number;
@Column({ type: 'varchar', length: 255, nullable: true })
  midtransServerKey: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  midtransClientKey: string;

@Column({ type: 'int', default: 5 }) // default 5 km
radiusJarak: number;

  @OneToMany(() => Menu, (menu) => menu.resto)
  menus: Menu[];
}