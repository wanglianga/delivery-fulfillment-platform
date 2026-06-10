import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ShiftsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: { stationId?: number; date?: string; riderId?: number }) {
    let sql = `SELECT s.*, u.name as rider_name, st.name as station_name
               FROM shift s
               JOIN user u ON s.rider_id = u.id
               JOIN station st ON s.station_id = st.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.stationId) {
      sql += ` AND s.station_id = ?`;
      params.push(query.stationId);
    }
    if (query?.date) {
      sql += ` AND s.date = ?`;
      params.push(query.date);
    }
    if (query?.riderId) {
      sql += ` AND s.rider_id = ?`;
      params.push(query.riderId);
    }

    sql += ` ORDER BY s.date DESC, s.start_time ASC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  findOne(id: number) {
    const row = this.db.get(
      `SELECT s.*, u.name as rider_name, st.name as station_name
       FROM shift s
       JOIN user u ON s.rider_id = u.id
       JOIN station st ON s.station_id = st.id
       WHERE s.id = ?`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  create(data: {
    riderId: number;
    stationId: number;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    serviceArea?: string;
  }) {
    const result = this.db.run(
      `INSERT INTO shift (rider_id, station_id, date, start_time, end_time, type, service_area)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.riderId, data.stationId, data.date, data.startTime, data.endTime, data.type, data.serviceArea || ''],
    );
    return this.findOne(Number(result.lastInsertRowid));
  }

  update(id: number, data: {
    startTime?: string;
    endTime?: string;
    type?: string;
    serviceArea?: string;
    status?: string;
  }) {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.startTime !== undefined) {
      fields.push('start_time = ?');
      params.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      fields.push('end_time = ?');
      params.push(data.endTime);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      params.push(data.type);
    }
    if (data.serviceArea !== undefined) {
      fields.push('service_area = ?');
      params.push(data.serviceArea);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }

    if (fields.length === 0) return this.findOne(id);

    fields.push("updated_at = datetime('now')");
    params.push(id);

    this.db.run(
      `UPDATE shift SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findOne(id);
  }

  remove(id: number) {
    const shift = this.findOne(id);
    if (!shift) return null;
    this.db.run('DELETE FROM shift WHERE id = ?', [id]);
    return shift;
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      riderId: row.rider_id,
      riderName: row.rider_name,
      stationId: row.station_id,
      stationName: row.station_name,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      type: row.type,
      status: row.status,
      serviceArea: row.service_area,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
