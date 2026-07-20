import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('riwayat')
export class Riwayat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  nama: string;

  // Diubah menjadi string agar sinkron dengan input data Anda
  @Column({ nullable: true })
  meja: string; 

  @Column('text', { nullable: true }) // Menggunakan 'text' agar lebih aman untuk JSON.stringify
  pesanan: string;

  @Column({ nullable: true })
  waktuSelesai: string;

  @Column({ nullable: true })
  tanggalTransaksi: string;



@Column({ nullable: true })
restoId: number;

  // Menggunakan presisi agar database tidak error saat menyimpan angka desimal
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  totalBayar: number;
}