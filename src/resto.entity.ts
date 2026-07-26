import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Menu } from './menu.entity';

@Entity('resto')
export class Resto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'namaResto', type: 'varchar', length: 255, nullable: false })
  namaResto: string;

  @Column({ name: 'username', type: 'varchar', length: 255, nullable: false, unique: true })
  username: string;

  @Column({ name: 'password', type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ name: 'wa_admin', nullable: true })
  wa_admin: string;

  @Column({ name: 'nomorWa', nullable: true })
  nomorWa: string;

  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ name: 'longitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  longitude: number;

  @Column({ name: 'midtransServerKey', type: 'varchar', length: 255, nullable: true })
  midtransServerKey: string;

  @Column({ name: 'midtransClientKey', type: 'varchar', length: 255, nullable: true })
  midtransClientKey: string;

  @Column({ name: 'radiusJarak', type: 'int', default: 5 })
  radiusJarak: number;

  @Column({ name: 'tokenUnik', nullable: true })
  tokenUnik: string;

  @Column({ name: 'statusAktif', default: true })
  statusAktif: boolean;

  @Column({ name: 'isMaintenance', type: 'boolean', default: false, nullable: true })
  isMaintenance: boolean;

  @OneToMany(() => Menu, (menu) => menu.resto)
  menus: Menu[];
}