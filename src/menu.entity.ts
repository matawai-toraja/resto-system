import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resto } from './resto.entity'; // Pastikan path ini benar

@Entity('menu')
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nama: string;

  // Menggunakan 'decimal' lebih aman untuk transaksi uang di resto
  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: false })
  harga: number;

  @Column({ type: 'int', default: 0 })
  stok: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  gambar: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  kategori: string;

  // Relasi profesional ke Resto
  @Column()
  restoId: number;

  @ManyToOne(() => Resto, (resto) => resto.menus)
  @JoinColumn({ name: 'restoId' })
  resto: Resto;
}