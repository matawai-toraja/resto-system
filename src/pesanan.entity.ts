import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pesanan')
export class Pesanan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  nama: string;

  @Column({ nullable: true })
  meja: string;

  @Column('text', { nullable: true })
  pesanan: string;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  statusDapur: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  harga: number;

  @Column({ nullable: true })
  jumlah: number;

  @Column({ nullable: true })
  kategori: string;

  // Tambahkan baris ini agar sinkron dengan AppController
  @Column({ nullable: true })
  restoId: number;
}