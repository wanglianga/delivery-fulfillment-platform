import { Injectable } from '@nestjs/common';
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
  }) {
    const result = this.db.run(
      `INSERT INTO weather_alert (station_id, type, level, description, start_time, end_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.stationId, data.type, data.level, data.description || '', data.startTime, data.endTime],
    );
    return this.findOne(Number(result.lastInsertRowid));
  }

  update(id: number, data: {
    type?: string;
    level?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
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
      createdAt: row.created_at,
    };
  }
}
