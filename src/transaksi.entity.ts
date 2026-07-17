import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('transaksi')
export class Transaksi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idTransaksi: string;

  // Hanya satu deklarasi idPelanggan dengan nullable: true agar tidak error
  @Column({ nullable: true })
  idPelanggan: number;

  @Column()
  namaPelanggan: string;

  @Column()
  meja: number;

  @Column('text')
  item: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalBayar: number;

  @Column({ nullable: true })
  restoId: number; 
}