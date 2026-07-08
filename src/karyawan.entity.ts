import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Karyawan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column()
    password: string;

    @Column()
    restoId: number;
}