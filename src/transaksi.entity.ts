import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('transaksi')
export class Transaksi {
  @PrimaryGeneratedColumn()
  id: number; // Menggunakan ID internal sebagai Primary Key

  @Column()
  idTransaksi: string;

  @Column()
  idPelanggan: number;

  @Column()
  namaPelanggan: string;

  @Column()
  meja: number;

  @Column()
  item: string;

  @Column('decimal')
  totalBayar: number;
}