import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WeatherService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: { stationId?: number; level?: string }) {
    let sql = `SELECT w.*, s.name as station_name
               FROM weather_alert w
               JOIN station s ON w.station_id = s.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.stationId) {
      sql += ` AND w.station_id = ?`;
      params.push(query.stationId);
    }
    if (query?.level) {
      sql += ` AND w.level = ?`;
      params.push(query.level);
    }

    sql += ` ORDER BY w.start_time DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  findOne(id: number) {
    const row = this.db.get(
      `SELECT w.*, s.name as station_name
       FROM weather_alert w
       JOIN station s ON w.station_id = s.id
       WHERE w.id = ?`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  getActiveAlerts(stationId?: number) {
    let sql = `SELECT w.*, s.name as station_name
               FROM weather_alert w
               JOIN station s ON w.station_id = s.id
               WHERE datetime(w.end_time) > datetime('now')`;
    const params: any[] = [];

    if (stationId) {
      sql += ` AND w.station_id = ?`;
      params.push(stationId);
    }

    sql += ` ORDER BY w.level DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  create(data: {
    stationId: number;
    type: string;
    level: string;
    description?: string;
    startTime: string;
    endTime: string;
    deliveryRangeShrink?: number;
    etaAddMinutes?: number;
    shiftAdjustment?: string;
    shiftDelayMinutes?: number;
  }) {
    const result = this.db.run(
      `INSERT INTO weather_alert (station_id, type, level, description, start_time, end_time, delivery_range_shrink, eta_add_minutes, shift_adjustment, shift_delay_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.stationId,
        data.type,
        data.level,
        data.description || '',
        data.startTime,
        data.endTime,
        data.deliveryRangeShrink || 0,
        data.etaAddMinutes || 0,
        data.shiftAdjustment || 'none',
        data.shiftDelayMinutes || 0,
      ],
    );
    return this.findOne(Number(result.lastInsertRowid));
  }

  update(id: number, data: {
    type?: string;
    level?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    deliveryRangeShrink?: number;
    etaAddMinutes?: number;
    shiftAdjustment?: string;
    shiftDelayMinutes?: number;
  }) {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.type !== undefined) {
      fields.push('type = ?');
      params.push(data.type);
    }
    if (data.level !== undefined) {
      fields.push('level = ?');
      params.push(data.level);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description);
    }
    if (data.startTime !== undefined) {
      fields.push('start_time = ?');
      params.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      fields.push('end_time = ?');
      params.push(data.endTime);
    }
    if (data.deliveryRangeShrink !== undefined) {
      fields.push('delivery_range_shrink = ?');
      params.push(data.deliveryRangeShrink);
    }
    if (data.etaAddMinutes !== undefined) {
      fields.push('eta_add_minutes = ?');
      params.push(data.etaAddMinutes);
    }
    if (data.shiftAdjustment !== undefined) {
      fields.push('shift_adjustment = ?');
      params.push(data.shiftAdjustment);
    }
    if (data.shiftDelayMinutes !== undefined) {
      fields.push('shift_delay_minutes = ?');
      params.push(data.shiftDelayMinutes);
    }

    if (fields.length === 0) return this.findOne(id);
    params.push(id);

    this.db.run(`UPDATE weather_alert SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findOne(id);
  }

  remove(id: number) {
    const alert = this.findOne(id);
    if (!alert) return null;
    this.db.run('DELETE FROM weather_alert WHERE id = ?', [id]);
    return alert;
  }

  applyCapacityAdjustment(alertId: number) {
    const alert = this.findOne(alertId);
    if (!alert) {
      throw new BadRequestException('预警不存在');
    }

    const now = new Date().toISOString();
    const stationId = alert.stationId;

    if (alert.etaAddMinutes && alert.etaAddMinutes > 0) {
      const activeOrders = this.db.all(
        `SELECT id, estimated_delivery_time FROM orders 
         WHERE station_id = ? AND status IN ('pending', 'accepted', 'arrived_store', 'picked_up', 'delivering')`,
        [stationId],
      );

      for (const order of activeOrders) {
        const originalEta = order.estimated_delivery_time
          ? new Date(order.estimated_delivery_time).getTime()
          : Date.now() + 45 * 60 * 1000;
        const newEta = new Date(originalEta + alert.etaAddMinutes * 60 * 1000).toISOString();

        const existingAffected = this.db.get(
          `SELECT weather_affected FROM orders WHERE id = ?`,
          [order.id],
        );
        const affectedArr = existingAffected?.weather_affected
          ? existingAffected.weather_affected.split('|').filter(Boolean)
          : [];
        const affectedTag = `weather:${alert.type}:${alert.level}:+${alert.etaAddMinutes}min`;
        if (!affectedArr.includes(affectedTag)) {
          affectedArr.push(affectedTag);
        }

        this.db.run(
          `UPDATE orders SET estimated_delivery_time = ?, weather_affected = ?, updated_at = datetime('now') WHERE id = ?`,
          [newEta, affectedArr.join('|'), order.id],
        );

        this.db.run(
          `INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'weather_adjust', 'system', ?)`,
          [order.id, `受${alert.type}(${this.levelLabel(alert.level)})影响，预计送达时间延长${alert.etaAddMinutes}分钟`],
        );
      }
    }

    if (alert.shiftAdjustment && alert.shiftAdjustment !== 'none') {
      const today = new Date().toISOString().split('T')[0];
      const shifts = this.db.all(
        `SELECT id, start_time, end_time, status FROM shift WHERE station_id = ? AND date = ? AND status IN ('scheduled', 'active')`,
        [stationId, today],
      );

      for (const shift of shifts) {
        if (alert.shiftAdjustment === 'delay' && alert.shiftDelayMinutes > 0) {
          const [startH, startM] = shift.start_time.split(':').map(Number);
          const [endH, endM] = shift.end_time.split(':').map(Number);
          const startTotal = startH * 60 + startM + alert.shiftDelayMinutes;
          const endTotal = endH * 60 + endM + alert.shiftDelayMinutes;
          const newStart = `${Math.floor(startTotal / 60).toString().padStart(2, '0')}:${(startTotal % 60).toString().padStart(2, '0')}`;
          const newEnd = `${Math.floor(endTotal / 60).toString().padStart(2, '0')}:${(endTotal % 60).toString().padStart(2, '0')}`;
          this.db.run(
            `UPDATE shift SET start_time = ?, end_time = ?, updated_at = datetime('now') WHERE id = ?`,
            [newStart, newEnd, shift.id],
          );
        } else if (alert.shiftAdjustment === 'cancel') {
          this.db.run(
            `UPDATE shift SET status = 'absent', updated_at = datetime('now') WHERE id = ?`,
            [shift.id],
          );
        }
      }
    }

    return {
      success: true,
      alert,
      appliedAt: now,
      message: `已应用${alert.type}运力调整：延长预计送达${alert.etaAddMinutes || 0}分钟，班次调整策略：${this.shiftAdjustmentLabel(alert.shiftAdjustment)}`,
    };
  }

  private levelLabel(level: string) {
    const map: Record<string, string> = { yellow: '黄色预警', orange: '橙色预警', red: '红色预警' };
    return map[level] || level;
  }

  private shiftAdjustmentLabel(s: string) {
    const map: Record<string, string> = { none: '不调整', delay: '延迟班次', reduce: '减少班次', cancel: '取消非必要班次' };
    return map[s] || s;
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      stationId: row.station_id,
      stationName: row.station_name,
      type: row.type,
      level: row.level,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      deliveryRangeShrink: row.delivery_range_shrink || 0,
      etaAddMinutes: row.eta_add_minutes || 0,
      shiftAdjustment: row.shift_adjustment || 'none',
      shiftDelayMinutes: row.shift_delay_minutes || 0,
      createdAt: row.created_at,
    };
  }
}
