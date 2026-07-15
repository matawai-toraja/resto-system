import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('printer_settings') // Pastikan nama tabel di DB sama persis
export class PrinterSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  resto_id: number;

  @Column({ default: false })
  auto_print: boolean;

  @Column({ nullable: true })
  printer_name: string;

  @Column({ default: '80mm' })
  paper_size: string;

  @Column({ type: 'text', nullable: true })
  header_text: string;

  @Column({ type: 'text', nullable: true })
  footer_text: string;
}