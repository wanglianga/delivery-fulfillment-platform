import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EventEmitter } from 'events';

export const ORDER_EVENTS = new EventEmitter();
const SLOW_PREPARE_THRESHOLD_SECONDS = 600;

@Injectable()
export class OrdersService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: {
    status?: string;
    stationId?: number;
    merchantId?: number;
    riderId?: number;
    riderIdNull?: boolean;
  }) {
    let sql = `SELECT o.*, m.name as merchant_name, u.name as rider_name
               FROM orders o
               JOIN merchant m ON o.merchant_id = m.id
               LEFT JOIN user u ON o.rider_id = u.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.status) {
      const statuses = query.status.split(',').map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        sql += ` AND o.status = ?`;
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        sql += ` AND o.status IN (${statuses.map(() => '?').join(', ')})`;
        params.push(...statuses);
      }
    }
    if (query?.stationId) {
      sql += ` AND o.station_id = ?`;
      params.push(query.stationId);
    }
    if (query?.merchantId) {
      sql += ` AND o.merchant_id = ?`;
      params.push(query.merchantId);
    }
    if (query?.riderIdNull) {
      sql += ` AND o.rider_id IS NULL`;
    } else if (query?.riderId) {
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

    const slowRecord = this.db.get(
      'SELECT * FROM slow_prepare_record WHERE order_id = ?',
      [id],
    );
    order.slowPrepareRecord = slowRecord ? this.mapSlowPrepareRow(slowRecord) : null;

    const reassignRecords = this.db.all(
      `SELECT r.*, u1.name as original_rider_name, u2.name as new_rider_name
       FROM order_reassign r
       LEFT JOIN user u1 ON r.original_rider_id = u1.id
       LEFT JOIN user u2 ON r.new_rider_id = u2.id
       WHERE r.order_id = ?
       ORDER BY r.created_at DESC`,
      [id],
    );
    order.reassignRecords = reassignRecords.map(this.mapReassignRow);

    const addressChangeRecords = this.db.all(
      'SELECT * FROM address_change_request WHERE order_id = ? ORDER BY created_at DESC',
      [id],
    );
    order.addressChangeRecords = addressChangeRecords.map(this.mapAddressChangeRow);

    return order;
  }

  getOrderContext(id: number) {
    const order = this.findOne(id);
    if (!order) return null;

    const activeAlerts = this.db.all(
      `SELECT type, level, description, eta_add_minutes 
       FROM weather_alert 
       WHERE station_id = ? AND datetime(end_time) > datetime('now') 
         AND datetime(start_time) <= datetime('now')`,
      [order.stationId],
    );

    let slowPrepareWaitSeconds = 0;
    let slowPrepareExceeded = false;
    if (order.arrivedStoreAt && order.status === 'arrived_store') {
      slowPrepareWaitSeconds = Math.floor((Date.now() - new Date(order.arrivedStoreAt).getTime()) / 1000);
      slowPrepareExceeded = slowPrepareWaitSeconds > SLOW_PREPARE_THRESHOLD_SECONDS;
    }

    return {
      orderId: id,
      weatherAlerts: activeAlerts.map((a: any) => ({
        type: a.type,
        level: a.level,
        description: a.description,
        etaAddMinutes: a.eta_add_minutes,
      })),
      isWeatherAffected: activeAlerts.length > 0,
      slowPrepare: {
        thresholdSeconds: SLOW_PREPARE_THRESHOLD_SECONDS,
        waitSeconds: slowPrepareWaitSeconds,
        exceeded: slowPrepareExceeded,
        record: order.slowPrepareRecord,
      },
      recommendedResponsibility: this.recommendResponsibility(activeAlerts, slowPrepareExceeded, order.slowPrepareRecord),
    };
  }

  private recommendResponsibility(alerts: any[], slowPrepareExceeded: boolean, slowRecord: any) {
    if (alerts.length > 0) {
      const severe = alerts.some((a) => a.level === 'red' || a.level === 'orange');
      if (severe) {
        return {
          primary: 'platform',
          reason: '恶劣天气影响（橙色/红色预警），建议判定为平台责任，骑手免责',
          excludeRider: true,
        };
      }
      if (alerts.some((a) => a.eta_add_minutes >= 15)) {
        return {
          primary: 'platform',
          reason: '天气导致预计送达延长15分钟以上，建议减轻骑手责任占比',
          excludeRider: true,
        };
      }
    }
    if (slowPrepareExceeded || slowRecord) {
      return {
        primary: 'merchant',
        reason: '商户出餐慢（超过10分钟），建议判定为商户责任',
        excludeRider: false,
      };
    }
    return {
      primary: '',
      reason: '无自动判定依据，请客服根据实际情况判断',
      excludeRider: false,
    };
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

    let weatherAffected = '';
    let estimatedDeliveryTime = data.estimatedDeliveryTime;

    const activeAlerts = this.db.all(
      `SELECT * FROM weather_alert 
       WHERE station_id = ? AND datetime(end_time) > datetime('now') 
         AND datetime(start_time) <= datetime('now')
       ORDER BY level DESC LIMIT 1`,
      [data.stationId],
    );
    if (activeAlerts.length > 0 && activeAlerts[0].eta_add_minutes > 0) {
      const alert = activeAlerts[0];
      const baseEta = estimatedDeliveryTime
        ? new Date(estimatedDeliveryTime).getTime()
        : Date.now() + 45 * 60 * 1000;
      estimatedDeliveryTime = new Date(baseEta + alert.eta_add_minutes * 60 * 1000).toISOString();
      weatherAffected = `weather:${alert.type}:${alert.level}:+${alert.eta_add_minutes}min`;
    }

    const result = this.db.run(
      `INSERT INTO orders (order_no, station_id, merchant_id, customer_name, customer_address, customer_phone, items, total_amount, delivery_fee, estimated_delivery_time, weather_affected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        estimatedDeliveryTime || null,
        weatherAffected,
      ],
    );

    const orderId = Number(result.lastInsertRowid);
    this.addTimeline(orderId, 'created', '', '订单创建');
    if (weatherAffected) {
      const alert = activeAlerts[0];
      this.addTimeline(orderId, 'weather_affected', 'system', `新建订单受${alert.type}影响，预计送达延长${alert.eta_add_minutes}分钟`);
    }
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
    this.db.run('DELETE FROM slow_prepare_record WHERE order_id = ?', [id]);
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
    this.db.run(
      `INSERT INTO slow_prepare_record (order_id, merchant_id, arrived_store_at, threshold_seconds)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(order_id) DO UPDATE SET arrived_store_at = excluded.arrived_store_at`,
      [id, order.merchantId, now, SLOW_PREPARE_THRESHOLD_SECONDS],
    );
    this.addTimeline(id, 'arrived_store', operator, '骑手到店');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  merchantConfirm(id: number, operator: string) {
    const order = this.getOrderOrThrow(id);
    if (!['arrived_store'].includes(order.status)) {
      throw new BadRequestException('只有骑手已到店的订单可以确认出餐');
    }
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE orders SET merchant_confirmed_at = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, id],
    );

    const slowRecord = this.db.get('SELECT * FROM slow_prepare_record WHERE order_id = ?', [id]);
    if (slowRecord) {
      this.db.run(
        `UPDATE slow_prepare_record SET merchant_confirmed_at = ?, updated_at = datetime('now') WHERE order_id = ?`,
        [now, id],
      );
    }

    this.addTimeline(id, 'merchant_confirmed', operator, '商户确认出餐');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  pickUp(id: number, operator: string, pickupPhoto?: string) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'arrived_store') {
      throw new BadRequestException('只有已到店状态的订单可以取货');
    }
    const now = new Date().toISOString();

    let waitSeconds = 0;
    let slowFlag = 0;
    if (order.arrivedStoreAt) {
      waitSeconds = Math.floor((new Date(now).getTime() - new Date(order.arrivedStoreAt).getTime()) / 1000);
      if (waitSeconds > SLOW_PREPARE_THRESHOLD_SECONDS) {
        slowFlag = 1;
      }
    }

    const impactScore = slowFlag ? Math.min(5, Math.ceil((waitSeconds - SLOW_PREPARE_THRESHOLD_SECONDS) / 120)) : 0;

    this.db.run(
      `UPDATE orders SET status = 'picked_up', picked_up_at = ?, pickup_photo = ?, slow_prepare_flag = ?, slow_prepare_wait_seconds = ?, updated_at = datetime('now') WHERE id = ?`,
      [now, pickupPhoto || '', slowFlag, waitSeconds, id],
    );

    const slowRecord = this.db.get('SELECT * FROM slow_prepare_record WHERE order_id = ?', [id]);
    if (slowRecord) {
      this.db.run(
        `UPDATE slow_prepare_record 
         SET picked_up_at = ?, wait_seconds = ?, pickup_photo = ?, impact_score = ?, status = ?, updated_at = datetime('now') 
         WHERE order_id = ?`,
        [now, waitSeconds, pickupPhoto || slowRecord.pickup_photo || '', impactScore, slowFlag ? 'confirmed' : 'ignored', id],
      );

      if (slowFlag) {
        this.updateMerchantPerformanceOnSlow(order.merchantId, impactScore);
      }
    }

    this.addTimeline(id, 'picked_up', operator, slowFlag ? `骑手取货（等待${Math.floor(waitSeconds / 60)}分钟，出餐慢）` : '骑手取货');
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  uploadPickupPhoto(id: number, photoUrl: string, operator: string) {
    const order = this.getOrderOrThrow(id);
    if (!['arrived_store', 'picked_up'].includes(order.status)) {
      throw new BadRequestException('只有已到店或已取货状态的订单可以上传取货照片');
    }
    this.db.run(
      `UPDATE orders SET pickup_photo = ?, updated_at = datetime('now') WHERE id = ?`,
      [photoUrl, id],
    );
    const slowRecord = this.db.get('SELECT * FROM slow_prepare_record WHERE order_id = ?', [id]);
    if (slowRecord) {
      this.db.run(
        `UPDATE slow_prepare_record SET pickup_photo = ?, updated_at = datetime('now') WHERE order_id = ?`,
        [photoUrl, id],
      );
    }
    this.addTimeline(id, 'pickup_photo', operator, '已上传取货照片');
    return this.findOne(id);
  }

  private updateMerchantPerformanceOnSlow(merchantId: number, impactScore: number) {
    const existing = this.db.get('SELECT * FROM merchant_performance WHERE merchant_id = ?', [merchantId]);
    if (existing) {
      const newTotalOrders = existing.total_orders + 1;
      const newSlowCount = existing.slow_prepare_count + 1;
      const onTimeRate = Math.max(0, 100 - (newSlowCount / newTotalOrders) * 100);
      const newScore = Math.max(0, existing.score - impactScore);
      this.db.run(
        `UPDATE merchant_performance 
         SET score = ?, total_orders = ?, slow_prepare_count = ?, on_time_rate = ?, last_calculated_at = datetime('now'), updated_at = datetime('now')
         WHERE merchant_id = ?`,
        [newScore, newTotalOrders, newSlowCount, onTimeRate, merchantId],
      );
    } else {
      this.db.run(
        `INSERT INTO merchant_performance (merchant_id, score, total_orders, slow_prepare_count, on_time_rate, last_calculated_at)
         VALUES (?, ?, 1, 1, 0, datetime('now'))`,
        [merchantId, Math.max(0, 100 - impactScore)],
      );
    }
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

  reportAccident(
    id: number,
    riderId: number,
    data: { accidentType: string; description: string; photos?: string[] },
  ) {
    const order = this.getOrderOrThrow(id);
    if (!order.riderId || order.riderId !== riderId) {
      throw new BadRequestException('只能上报自己配送中的订单事故');
    }
    if (!['accepted', 'arrived_store', 'picked_up', 'delivering'].includes(order.status)) {
      throw new BadRequestException('当前订单状态无法上报事故');
    }

    const existing = this.db.get(
      `SELECT id FROM order_reassign WHERE order_id = ? AND status IN ('pending', 'accepted')`,
      [id],
    );
    if (existing) {
      throw new BadRequestException('该订单已有待处理的转派记录');
    }

    const originalRiderSegment = JSON.stringify({
      riderId: order.riderId,
      riderName: order.riderName,
      fromStatus: order.status,
      fromTime: new Date().toISOString(),
      toTime: null,
    });

    this.db.run(
      `UPDATE orders SET status = 'reassigning', updated_at = datetime('now') WHERE id = ?`,
      [id],
    );

    const result = this.db.run(
      `INSERT INTO order_reassign (order_id, original_rider_id, accident_type, accident_description, accident_photos, original_rider_segment, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        riderId,
        data.accidentType,
        data.description,
        JSON.stringify(data.photos || []),
        originalRiderSegment,
      ],
    );

    this.addTimeline(
      id,
      'accident_reported',
      order.riderName,
      `骑手上报事故(${this.accidentTypeLabel(data.accidentType)})：${data.description}`,
    );

    const reassignId = Number(result.lastInsertRowid);
    const reassignRecord = this.findReassignRecord(reassignId);
    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return { order: updated, reassign: reassignRecord };
  }

  findNearbyRiders(orderId: number) {
    const order = this.getOrderOrThrow(orderId);
    const stationId = order.stationId;

    const activeShiftRiders = this.db.all(
      `SELECT DISTINCT u.id, u.name, u.station_id
       FROM user u
       JOIN shift s ON u.id = s.rider_id
       WHERE u.role = 'rider' AND u.station_id = ? AND s.status = 'active'
         AND u.id NOT IN (SELECT rider_id FROM orders WHERE status IN ('accepted', 'arrived_store', 'picked_up', 'delivering') AND rider_id IS NOT NULL)
       ORDER BY u.name`,
      [stationId],
    );

    const busyRiders = this.db.all(
      `SELECT DISTINCT u.id, u.name, u.station_id, COUNT(o.id) as active_order_count
       FROM user u
       JOIN orders o ON u.id = o.rider_id
       WHERE u.role = 'rider' AND u.station_id = ? AND o.status IN ('accepted', 'arrived_store', 'picked_up', 'delivering')
       GROUP BY u.id
       ORDER BY active_order_count ASC`,
      [stationId],
    );

    return {
      available: activeShiftRiders.map((r: any) => ({
        id: r.id,
        name: r.name,
        stationId: r.station_id,
        busy: false,
      })),
      busy: busyRiders.map((r: any) => ({
        id: r.id,
        name: r.name,
        stationId: r.station_id,
        busy: true,
        activeOrderCount: r.active_order_count,
      })),
    };
  }

  reassignOrder(
    id: number,
    newRiderId: number,
    operatorName: string,
    responsibilitySplit?: {
      originalRider: number;
      newRider: number;
      platform: number;
    },
  ) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'reassigning') {
      throw new BadRequestException('只有转派中的订单可以执行转派');
    }

    const reassignRecord = this.db.get(
      `SELECT * FROM order_reassign WHERE order_id = ? AND status = 'pending'`,
      [id],
    );
    if (!reassignRecord) {
      throw new BadRequestException('未找到待处理的转派记录');
    }

    const newRider = this.db.get('SELECT * FROM user WHERE id = ? AND role = ?', [newRiderId, 'rider']);
    if (!newRider) {
      throw new BadRequestException('目标骑手不存在');
    }

    const originalSegment = JSON.parse(reassignRecord.original_rider_segment || '{}');
    originalSegment.toTime = new Date().toISOString();
    originalSegment.toStatus = 'reassigning';

    const newRiderSegment = JSON.stringify({
      riderId: newRiderId,
      riderName: newRider.name,
      fromStatus: order.status,
      fromTime: new Date().toISOString(),
      toTime: null,
    });

    const split = responsibilitySplit || { originalRider: 0, newRider: 100, platform: 0 };

    const now = new Date().toISOString();
    this.db.run(
      `UPDATE order_reassign SET new_rider_id = ?, original_rider_segment = ?, new_rider_segment = ?,
       original_rider_responsibility = ?, new_rider_responsibility = ?, platform_responsibility = ?,
       reassigned_at = ?, status = 'accepted', updated_at = datetime('now') WHERE id = ?`,
      [
        newRiderId,
        JSON.stringify(originalSegment),
        newRiderSegment,
        split.originalRider,
        split.newRider,
        split.platform,
        now,
        reassignRecord.id,
      ],
    );

    const previousStatus = this.getPreviousDeliveryStatus(order);
    this.db.run(
      `UPDATE orders SET rider_id = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
      [newRiderId, previousStatus, id],
    );

    this.addTimeline(
      id,
      'order_reassigned',
      operatorName,
      `订单已转派给骑手${newRider.name}，原骑手${order.riderName}因事故退出，责任拆分：原骑手${split.originalRider}%/新骑手${split.newRider}%/平台${split.platform}%`,
    );

    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return { order: updated, reassign: this.findReassignRecord(reassignRecord.id) };
  }

  private getPreviousDeliveryStatus(order: any): string {
    if (order.deliveringAt) return 'delivering';
    if (order.pickedUpAt) return 'picked_up';
    if (order.arrivedStoreAt) return 'arrived_store';
    return 'accepted';
  }

  findReassignRecord(id: number) {
    const row = this.db.get(
      `SELECT r.*, u1.name as original_rider_name, u2.name as new_rider_name
       FROM order_reassign r
       LEFT JOIN user u1 ON r.original_rider_id = u1.id
       LEFT JOIN user u2 ON r.new_rider_id = u2.id
       WHERE r.id = ?`,
      [id],
    );
    return row ? this.mapReassignRow(row) : null;
  }

  findReassignRecordsByOrder(orderId: number) {
    const rows = this.db.all(
      `SELECT r.*, u1.name as original_rider_name, u2.name as new_rider_name
       FROM order_reassign r
       LEFT JOIN user u1 ON r.original_rider_id = u1.id
       LEFT JOIN user u2 ON r.new_rider_id = u2.id
       WHERE r.order_id = ?
       ORDER BY r.created_at DESC`,
      [orderId],
    );
    return rows.map(this.mapReassignRow);
  }

  findAllReassigningOrders(stationId?: number) {
    let sql = `SELECT o.*, m.name as merchant_name, u.name as rider_name
               FROM orders o
               JOIN merchant m ON o.merchant_id = m.id
               LEFT JOIN user u ON o.rider_id = u.id
               WHERE o.status = 'reassigning'`;
    const params: any[] = [];
    if (stationId) {
      sql += ` AND o.station_id = ?`;
      params.push(stationId);
    }
    sql += ` ORDER BY o.updated_at DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  requestAddressChange(
    id: number,
    data: { newAddress: string; requestedBy: number },
  ) {
    const order = this.getOrderOrThrow(id);
    if (!['accepted', 'arrived_store', 'picked_up', 'delivering'].includes(order.status)) {
      throw new BadRequestException('当前订单状态无法修改地址');
    }

    const existing = this.db.get(
      `SELECT id FROM address_change_request WHERE order_id = ? AND status = 'pending'`,
      [id],
    );
    if (existing) {
      throw new BadRequestException('该订单已有待处理的地址修改请求');
    }

    const extraDistance = this.calculateExtraDistance(order.customerAddress, data.newAddress);
    const extraFee = this.calculateExtraFee(extraDistance);
    const outOfArea = this.checkOutOfArea(order.stationId, data.newAddress);

    this.db.run(
      `UPDATE orders SET
        original_customer_address = ?,
        customer_address = ?,
        address_change_extra_distance = ?,
        address_change_extra_fee = ?,
        address_change_out_of_area = ?,
        status = 'pending_negotiation',
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        order.customerAddress,
        data.newAddress,
        extraDistance,
        extraFee,
        outOfArea ? 1 : 0,
        id,
      ],
    );

    const result = this.db.run(
      `INSERT INTO address_change_request (order_id, requested_by, original_address, new_address, extra_distance, extra_fee, out_of_area, status, rider_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        id,
        data.requestedBy,
        order.customerAddress,
        data.newAddress,
        extraDistance,
        extraFee,
        outOfArea ? 1 : 0,
        order.riderId,
      ],
    );

    const detailParts = [
      `顾客修改地址：${order.customerAddress} → ${data.newAddress}`,
      `新增距离：${extraDistance.toFixed(1)}公里`,
      outOfArea ? '⚠️ 新地址超出服务区' : '',
      extraFee > 0 ? `需补差价：¥${extraFee.toFixed(1)}` : '无需补差价',
    ].filter(Boolean).join('，');

    this.addTimeline(id, 'address_change_requested', '顾客', detailParts);

    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return {
      order: updated,
      addressChange: this.findAddressChangeRequest(Number(result.lastInsertRowid)),
    };
  }

  confirmAddressChange(id: number, riderId: number) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'pending_negotiation') {
      throw new BadRequestException('只有待协商状态的订单可以确认地址修改');
    }
    if (order.riderId !== riderId) {
      throw new BadRequestException('只有当前配送骑手可以确认地址修改');
    }

    const request = this.db.get(
      `SELECT * FROM address_change_request WHERE order_id = ? AND status = 'pending'`,
      [id],
    );
    if (!request) {
      throw new BadRequestException('未找到待处理的地址修改请求');
    }

    this.db.run(
      `UPDATE address_change_request SET status = 'rider_confirmed', updated_at = datetime('now') WHERE id = ?`,
      [request.id],
    );

    const previousStatus = this.getPreviousDeliveryStatus(order);
    this.db.run(
      `UPDATE orders SET status = ?, delivery_fee = delivery_fee + ?, updated_at = datetime('now') WHERE id = ?`,
      [previousStatus, order.addressChangeExtraFee || 0, id],
    );

    this.addTimeline(
      id,
      'address_change_confirmed',
      order.riderName,
      `骑手确认地址修改，新地址：${order.customerAddress}，补差价：¥${(order.addressChangeExtraFee || 0).toFixed(1)}`,
    );

    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  rejectAddressChange(id: number, rejectedBy: number, reason: string) {
    const order = this.getOrderOrThrow(id);
    if (order.status !== 'pending_negotiation') {
      throw new BadRequestException('只有待协商状态的订单可以拒绝地址修改');
    }

    const request = this.db.get(
      `SELECT * FROM address_change_request WHERE order_id = ? AND status = 'pending'`,
      [id],
    );
    if (!request) {
      throw new BadRequestException('未找到待处理的地址修改请求');
    }

    const isRider = order.riderId === rejectedBy;
    const newStatus = isRider ? 'rider_rejected' : 'system_rejected';

    this.db.run(
      `UPDATE address_change_request SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [newStatus, request.id],
    );

    this.db.run(
      `UPDATE orders SET
        customer_address = ?,
        original_customer_address = NULL,
        address_change_extra_distance = 0,
        address_change_extra_fee = 0,
        address_change_out_of_area = 0,
        status = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [request.original_address, this.getPreviousDeliveryStatus(order), id],
    );

    this.addTimeline(
      id,
      'address_change_rejected',
      isRider ? order.riderName : '系统',
      `地址修改被拒绝（${reason}），恢复原地址：${request.original_address}`,
    );

    const updated = this.findOne(id);
    this.emitOrderUpdate(updated);
    return updated;
  }

  findAddressChangeRequest(id: number) {
    const row = this.db.get(
      `SELECT * FROM address_change_request WHERE id = ?`,
      [id],
    );
    return row ? this.mapAddressChangeRow(row) : null;
  }

  findAddressChangeByOrder(orderId: number) {
    const rows = this.db.all(
      `SELECT * FROM address_change_request WHERE order_id = ? ORDER BY created_at DESC`,
      [orderId],
    );
    return rows.map(this.mapAddressChangeRow);
  }

  private calculateExtraDistance(originalAddress: string, newAddress: string): number {
    if (originalAddress === newAddress) return 0;
    const hash = (originalAddress + newAddress).length;
    return Math.round((hash % 50 + 5) / 10 * 10) / 10;
  }

  private calculateExtraFee(extraDistance: number): number {
    if (extraDistance <= 0) return 0;
    if (extraDistance <= 1) return 0;
    if (extraDistance <= 3) return Math.round(extraDistance * 2 * 10) / 10;
    return Math.round((3 * 2 + (extraDistance - 3) * 3) * 10) / 10;
  }

  private checkOutOfArea(stationId: number, newAddress: string): boolean {
    const station = this.db.get('SELECT service_area FROM station WHERE id = ?', [stationId]);
    if (!station) return false;
    const areaKeywords = station.service_area.split(/[,，、]/);
    return !areaKeywords.some((kw: string) => newAddress.includes(kw.trim()));
  }

  private accidentTypeLabel(type: string): string {
    const map: Record<string, string> = {
      crash: '摔车',
      vehicle_breakdown: '车辆故障',
      other: '其他',
    };
    return map[type] || type;
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

  private mapSlowPrepareRow(row: any) {
    return {
      id: row.id,
      orderId: row.order_id,
      merchantId: row.merchant_id,
      arrivedStoreAt: row.arrived_store_at,
      merchantConfirmedAt: row.merchant_confirmed_at,
      pickedUpAt: row.picked_up_at,
      waitSeconds: row.wait_seconds,
      thresholdSeconds: row.threshold_seconds,
      pickupPhoto: row.pickup_photo,
      impactScore: row.impact_score,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRow(row: any) {
    const weatherAffectedRaw = row.weather_affected || '';
    const weatherAffectedList = weatherAffectedRaw
      ? weatherAffectedRaw.split('|').filter(Boolean).map((tag: string) => {
          const parts = tag.split(':');
          return {
            tag,
            type: parts[1] || '',
            level: parts[2] || '',
            detail: parts[3] || '',
          };
        })
      : [];

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
      weatherAffected: weatherAffectedList,
      weatherAffectedRaw: row.weather_affected || '',
      acceptedAt: row.accepted_at,
      arrivedStoreAt: row.arrived_store_at,
      merchantConfirmedAt: row.merchant_confirmed_at,
      pickedUpAt: row.picked_up_at,
      deliveringAt: row.delivering_at,
      deliveredAt: row.delivered_at,
      signedAt: row.signed_at,
      prepareStartedAt: row.prepare_started_at,
      prepareCompletedAt: row.prepare_completed_at,
      deliveryPhoto: row.delivery_photo,
      pickupPhoto: row.pickup_photo,
      slowPrepareFlag: row.slow_prepare_flag || 0,
      slowPrepareWaitSeconds: row.slow_prepare_wait_seconds || 0,
      originalCustomerAddress: row.original_customer_address,
      addressChangeExtraDistance: row.address_change_extra_distance || 0,
      addressChangeExtraFee: row.address_change_extra_fee || 0,
      addressChangeOutOfArea: row.address_change_out_of_area || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapReassignRow(row: any) {
    return {
      id: row.id,
      orderId: row.order_id,
      originalRiderId: row.original_rider_id,
      originalRiderName: row.original_rider_name,
      newRiderId: row.new_rider_id,
      newRiderName: row.new_rider_name,
      accidentType: row.accident_type,
      accidentDescription: row.accident_description,
      accidentPhotos: JSON.parse(row.accident_photos || '[]'),
      originalRiderSegment: JSON.parse(row.original_rider_segment || '{}'),
      newRiderSegment: JSON.parse(row.new_rider_segment || '{}'),
      originalRiderResponsibility: row.original_rider_responsibility,
      newRiderResponsibility: row.new_rider_responsibility,
      platformResponsibility: row.platform_responsibility,
      reassignedAt: row.reassigned_at,
      acceptedAt: row.accepted_at,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAddressChangeRow(row: any) {
    return {
      id: row.id,
      orderId: row.order_id,
      requestedBy: row.requested_by,
      originalAddress: row.original_address,
      newAddress: row.new_address,
      extraDistance: row.extra_distance,
      extraFee: row.extra_fee,
      outOfArea: row.out_of_area,
      status: row.status,
      riderId: row.rider_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
