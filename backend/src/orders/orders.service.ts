import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventEmitter } from 'events';

export const ORDER_EVENTS = new EventEmitter();

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: {
    status?: string;
    stationId?: number;
    merchantId?: number;
    riderId?: number;
  }) {
    let sql = `SELECT o.*, m.name as merchant_name, u.name as rider_name
               FROM orders o
               JOIN merchant m ON o.merchant_id = m.id
               LEFT JOIN user u ON o.rider_id = u.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.status) {
      sql += ` AND o.status = ?`;
      params.push(query.status);
    }
    if (query?.stationId) {
      sql += ` AND o.station_id = ?`;
      params.push(query.stationId);
    }
    if (query?.merchantId) {
      sql += ` AND o.merchant_id = ?`;
      params.push(query.merchantId);
    }
    if (query?.riderId) {
      sql += ` AND o.rider_id = ?`;
      params.push(query.riderId);
    }

    sql += ` ORDER BY o.created_at DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  findOne(id: number) {
    const row = this.db.get(
      `SELECT o.*, m.name as merchant_name, u.name as rider_name
       FROM orders o
       JOIN merchant m ON o.merchant_id = m.id
       LEFT JOIN user u ON o.rider_id = u.id
       WHERE o.id = ?`,
      [id],
    );
    if (!row) return null;

    const order: any = this.mapRow(row);
    const timelines = this.db.all(
      'SELECT * FROM order_timeline WHERE order_id = ? ORDER BY timestamp ASC',
      [id],
    );
    order.timeline = timelines.map((t: any) => ({
      id: t.id,
      orderId: t.order_id,
      event: t.event,
      timestamp: t.timestamp,
      operator: t.operator,
      detail: t.detail,
    }));

    return order;
  }

  create(data: {
    stationId: number;
    merchantId: number;
    customerName: string;
    customerAddress: string;
    customerPhone?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
    totalAmount?: number;
    deliveryFee?: number;
    estimatedDeliveryTime?: string;
  }) {
    const orderNo = `ORD${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const items = data.items || [];
    const totalAmount = data.totalAmount || items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = data.deliveryFee || 5;

    const result = this.db.run(
      `INSERT INTO orders (order_no, station_id, merchant_id, customer_name, customer_address, customer_phone, items, total_amount, delivery_fee, estimated_delivery_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNo,
        data.stationId,
        data.merchantId,
        data.customerName,
        data.customerAddress,
        data.customerPhone || '',
        JSON.stringify(items),
        totalAmount,
        deliveryFee,
        data.estimatedDeliveryTime || null,
      ],
    );

    const orderId = Number(result.lastInsertRowid);
    this.addTimeline(orderId, 'created', '', '订单创建');
    const order = this.findOne(orderId);
    this.emitOrderUpdate(order);
    return order;
  }

  update(id: number, data: any) {
    const fields: string[] = [];
    const params: any[] = [];

    const allowedFields: Record<string, string> = {
      customerName: 'customer_name',
      customerAddress: 'customer_address',
      customerPhone: 'customer_phone',
      totalAmount: 'total_amount',
      deliveryFee: 'delivery_fee',
      estimatedDeliveryTime: 'estimated_delivery_time',
    };

    for (const [key, column] of Object.entries(allowedFields)) {
      if (data[key] !== undefined) {
        fields.push(`${column} = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) return this.findOne(id);

    fields.push("updated_at = datetime('now')");
    params.push(id);

    this.db.run(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findOne(id);
  }

  remove(id: number) {
    const order = this.findOne(id);
    if (!order) return null;
    this.db.run('DELETE FROM order_timeline WHERE order_id = ?', [id]);
    this.db.run('DELETE FROM orders WHERE id = ?', [id]);
    return order;
  }

  accept(id: number, riderId: number, riderName: string) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'pending') {
      throw new BadRequestException('只有待接单状态的订单可以接单');
    }
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET rider_id = ?, status = 'accepted', accepted_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [riderId, now, id],
    );
    this.addTimeline(id, 'accepted', riderName, '骑手接单');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  arriveStore(id: number, operator: string) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'accepted') {
      throw new BadRequestException('只有已接单状态的订单可以到店');
    }
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET status = 'arrived_store', arrived_store_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, id],
    );
    this.addTimeline(id, 'arrived_store', operator, '骑手到店');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  pickUp(id: number, operator: string) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'arrived_store') {
      throw new BadRequestException('只有已到店状态的订单可以取货');
    }
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET status = 'picked_up', picked_up_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, id],
    );
    this.addTimeline(id, 'picked_up', operator, '骑手取货');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  deliver(id: number, operator: string) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'picked_up') {
      throw new BadRequestException('只有已取货状态的订单可以开始配送');
    }
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET status = 'delivering', delivering_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, id],
    );
    this.addTimeline(id, 'delivering', operator, '骑手配送中');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  deliverPhoto(id: number, photoUrl: string, operator: string) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'delivering') {
      throw new BadRequestException('只有配送中的订单可以上传送达照片');
    }
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET status = 'delivered', delivered_at = ?, delivery_photo = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, photoUrl, id],
    );
    this.addTimeline(id, 'delivered', operator, '已送达，照片已上传');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  sign(id: number, operator: string) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'delivered') {
      throw new BadRequestException('只有已送达的订单可以签收');
    }
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET status = 'signed', signed_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, id],
    );
    this.addTimeline(id, 'signed', operator, '顾客签收');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  merchantPrepare(id: number, operator: string) {
    const order = this.getOrderOrThrow(id);
    if (!['pending', 'accepted', 'arrived_store'].includes(order.status)) {
      throw new BadRequestException('当前订单状态无法开始备餐');
    }
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET prepare_started_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, id],
    );
    this.addTimeline(id, 'merchant_prepare', operator, '商户开始备餐');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  merchantReady(id: number, operator: string) {
    const order = this.getOrderOrThrow(id);
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET prepare_completed_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, id],
    );
    this.addTimeline(id, 'merchant_ready', operator, '商户出餐完成');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  markException(id: number, operator: string, detail: string) {
    const order = this.getOrderOrThrow(id);
    this.db.run(
      `UPDATE orders SET status = 'exception', updated_at = datetime('now') WHERE id = ?`,
      [id],
    );
    this.addTimeline(id, 'exception', operator, detail || '订单标记为异常');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  private getOrderOrThrow(id: number) {
    const row = this.db.get(
      `SELECT o.*, m.name as merchant_name, u.name as rider_name
       FROM orders o
       JOIN merchant m ON o.merchant_id = m.id
       LEFT JOIN user u ON o.rider_id = u.id
       WHERE o.id = ?`,
      [id],
    );
    if (!row) {
      throw new NotFoundException('订单不存在');
    }
    return this.mapRow(row);
  }

  private addTimeline(orderId: number, event: string, operator: string, detail: string) {
    this.db.run(
      `INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, ?, ?, ?)`,
      [orderId, event, operator, detail],
    );
  }

  private emitOrderUpdate(order: any) {
    ORDER_EVENTS.emit('order:updated', order);
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      orderNo: row.order_no,
      stationId: row.station_id,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      riderId: row.rider_id,
      riderName: row.rider_name,
      customerName: row.customer_name,
      customerAddress: row.customer_address,
      customerPhone: row.customer_phone,
      status: row.status,
      items: JSON.parse(row.items || '[]'),
      totalAmount: row.total_amount,
      deliveryFee: row.delivery_fee,
      estimatedDeliveryTime: row.estimated_delivery_time,
      acceptedAt: row.accepted_at,
      arrivedStoreAt: row.arrived_store_at,
      pickedUpAt: row.picked_up_at,
      deliveringAt: row.delivering_at,
      deliveredAt: row.delivered_at,
      signedAt: row.signed_at,
      prepareStartedAt: row.prepare_started_at,
      prepareCompletedAt: row.prepare_completed_at,
      deliveryPhoto: row.delivery_photo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
