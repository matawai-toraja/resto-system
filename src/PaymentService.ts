import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resto } from './resto.entity';
import { Pesanan } from './pesanan.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Resto)
    private readonly restoRepo: Repository<Resto>,

    @InjectRepository(Pesanan)
    private readonly pesananRepo: Repository<Pesanan>,
  ) {}

  async createSnapToken(restoId: number, orderData: any) {
    const resto = await this.restoRepo.findOne({ where: { id: restoId } });

    if (!resto || !resto.midtransServerKey) {
      throw new BadRequestException("Restoran tidak ditemukan atau belum mengatur kredensial Pembayaran Digital!");
    }

    try {
      const cleanServerKey = resto.midtransServerKey.trim();

      let rawPesanan = orderData.pesanan;
      while (typeof rawPesanan === 'string') {
        rawPesanan = JSON.parse(rawPesanan);
      }

      const itemDetails = Array.isArray(rawPesanan)
        ? rawPesanan.map((item: any) => ({
            id: String(item.id || item.nama),
            price: Math.round(Number(item.harga)),
            quantity: Number(item.jumlah),
            name: String(item.nama).substring(0, 50),
          }))
        : [];

      if (itemDetails.length === 0 && Number(orderData.total) > 0) {
        itemDetails.push({
          id: `ORDER-${orderData.order_id}`,
          price: Math.round(Number(orderData.total)),
          quantity: 1,
          name: `Total Pesanan #${orderData.order_id}`,
        });
      }

      const uniqueOrderId = `RESTO-${orderData.order_id}-${Date.now()}`;
      const totalBayar = Math.round(Number(orderData.total));

      const parameter = {
        transaction_details: {
          order_id: uniqueOrderId, 
          gross_amount: totalBayar,
        },
        item_details: itemDetails,
        enabled_payments: ['qris', 'gopay', 'shopeepay'],
        credit_card: {
          secure: true,
        },
      };

      const authString = Buffer.from(cleanServerKey + ':').toString('base64');

      const responseMidtrans = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify(parameter)
      });

      const hasilTransaksi = await responseMidtrans.json();

      if (!responseMidtrans.ok || hasilTransaksi.error_messages) {
        console.log("=== DETAIL EROR DARI MIDTRANS SANDBOX ===");
        console.log(JSON.stringify(hasilTransaksi, null, 2));
        console.log("=========================================");
        throw new Error(hasilTransaksi.error_messages ? hasilTransaksi.error_messages.join(', ') : 'Ditolak oleh Midtrans');
      }

      return {
        token: hasilTransaksi.token,
        redirectUrl: hasilTransaksi.redirect_url
      };

    } catch (error) {
      console.error(`[Midtrans Error] Gagal membuat token untuk Resto ID ${restoId}:`, error.message || error);
      throw new InternalServerErrorException("Gagal memproses pembuatan kode QRIS ke server pembayaran: " + (error.message || ''));
    }
  }

  async handleNotification(notificationDto: any) {
    try {
      const orderIdFull = notificationDto.order_id;
      const transactionStatus = notificationDto.transaction_status;
      const fraudStatus = notificationDto.fraud_status;

      let statusPesanan = 'menunggu';

      if (transactionStatus == 'capture') {
        if (fraudStatus == 'challenge') {
          statusPesanan = 'challenge';
        } else if (fraudStatus == 'accept') {
          statusPesanan = 'lunas';
        }
      } else if (transactionStatus == 'settlement') {
        statusPesanan = 'lunas';
      } else if (
        transactionStatus == 'cancel' ||
        transactionStatus == 'deny' ||
        transactionStatus == 'expire'
      ) {
        statusPesanan = 'gagal';
      }

      console.log(`[Midtrans Webhook] Order ${orderIdFull} status: ${statusPesanan}`);

      const parts = orderIdFull.split('-');
      if (parts.length >= 2) {
        const idPesananAsli = Number(parts[1]);

        await this.pesananRepo.update(
          { id: idPesananAsli },
          { statusPembayaran: statusPesanan }
        );

        console.log(`[Database Updated] Pesanan ID ${idPesananAsli} berhasil diubah statusPembayaran-nya menjadi: ${statusPesanan}`);
      }

      return { status: 'OK', message: 'Notifikasi berhasil diproses' };
    } catch (error) {
      console.error('[Notification Error]:', error);
      throw new InternalServerErrorException('Gagal memproses notifikasi pembayaran');
    }
  }
}