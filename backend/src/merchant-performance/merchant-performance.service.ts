import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MerchantPerformanceService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: { stationId?: number; merchantId?: number }) {
    let sql = `SELECT mp.*, m.name AS merchant_name, m.station_id
               FROM merchant_performance mp
               JOIN merchant m ON mp.merchant_id = m.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.stationId) {
      sql += ` AND m.station_id = ?`;
      params.push(query.stationId);
    }
    if (query?.merchantId) {
      sql += ` AND mp.merchant_id = ?`;
      params.push(query.merchantId);
    }

    sql += ` ORDER BY mp.score DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapPerformanceRow);
  }

  findOne(id: number) {
    const row = this.db.get(
      `SELECT mp.*, m.name AS merchant_name, m.station_id
       FROM merchant_performance mp
       JOIN merchant m ON mp.merchant_id = m.id
       WHERE mp.id = ? OR mp.merchant_id = ?`,
      [id, id],
    );
    return row ? this.mapPerformanceRow(row) : null;
  }

  findSlowRecords(query?: { merchantId?: number }) {
    let sql = `SELECT spr.*, m.name AS merchant_name, o.order_no, o.station_id
               FROM slow_prepare_record spr
               JOIN merchant m ON spr.merchant_id = m.id
               JOIN orders o ON spr.order_id = o.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.merchantId) {
      sql += ` AND spr.merchant_id = ?`;
      params.push(query.merchantId);
    }

    sql += ` ORDER BY spr.created_at DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapSlowRecordRow);
  }

  appealSlowPrepare(recordId: number) {
    const record = this.db.get(
      `SELECT * FROM slow_prepare_record WHERE id = ?`,
      [recordId],
    );
    if (!record) return null;
    if (record.status !== 'pending' && record.status !== 'confirmed') {
      throw new Error('只有待确认或已确认的出餐慢记录可以申诉');
    }

    this.db.run(
      `UPDATE slow_prepare_record SET status = 'appealed', updated_at = datetime('now') WHERE id = ?`,
      [recordId],
    );
    return this.findSlowRecordById(recordId);
  }

  confirmSlowRecord(recordId: number) {
    const record = this.db.get(
      `SELECT * FROM slow_prepare_record WHERE id = ?`,
      [recordId],
    );
    if (!record) return null;
    if (record.status !== 'pending') {
      throw new Error('只有待确认的出餐慢记录可以确认');
    }

    this.db.transaction(() => {
      this.db.run(
        `UPDATE slow_prepare_record SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?`,
        [recordId],
      );

      const merchantId = record.merchant_id;
      const impactScore = record.impact_score || 0;

      this.db.run(
        `UPDATE merchant_performance 
         SET score = MAX(0, score - ?), 
             slow_prepare_count = slow_prepare_count + 1,
             updated_at = datetime('now')
         WHERE merchant_id = ?`,
        [impactScore, merchantId],
      );
    });

    return this.findSlowRecordById(recordId);
  }

  private findSlowRecordById(id: number) {
    const row = this.db.get(
      `SELECT spr.*, m.name AS merchant_name, o.order_no, o.station_id
       FROM slow_prepare_record spr
       JOIN merchant m ON spr.merchant_id = m.id
       JOIN orders o ON spr.order_id = o.id
       WHERE spr.id = ?`,
      [id],
    );
    return row ? this.mapSlowRecordRow(row) : null;
  }

  private mapPerformanceRow(row: any) {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      stationId: row.station_id,
      score: row.score,
      totalOrders: row.total_orders,
      slowPrepareCount: row.slow_prepare_count,
      onTimeRate: row.on_time_rate,
      avgPrepareSeconds: row.avg_prepare_seconds,
      lastCalculatedAt: row.last_calculated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSlowRecordRow(row: any) {
    return {
      id: row.id,
      orderId: row.order_id,
      orderNo: row.order_no,
      merchantId: row.merchant_id,
      merchantName: row.merchant_name,
      stationId: row.station_id,
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
}
