import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PeakPlansService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: { stationId?: number; status?: string }) {
    let sql = `SELECT pp.*, s.name as station_name
               FROM peak_plan pp
               JOIN station s ON pp.station_id = s.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.stationId) {
      sql += ` AND pp.station_id = ?`;
      params.push(query.stationId);
    }
    if (query?.status) {
      sql += ` AND pp.status = ?`;
      params.push(query.status);
    }

    sql += ` ORDER BY pp.created_at DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  findOne(id: number) {
    const row = this.db.get(
      `SELECT pp.*, s.name as station_name
       FROM peak_plan pp
       JOIN station s ON pp.station_id = s.id
       WHERE pp.id = ?`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  create(data: {
    stationId: number;
    name: string;
    triggerCondition?: string;
    actions?: string[];
  }) {
    const result = this.db.run(
      `INSERT INTO peak_plan (station_id, name, trigger_condition, actions)
       VALUES (?, ?, ?, ?)`,
      [data.stationId, data.name, data.triggerCondition || '', JSON.stringify(data.actions || [])],
    );
    return this.findOne(Number(result.lastInsertRowid));
  }

  update(id: number, data: {
    name?: string;
    triggerCondition?: string;
    actions?: string[];
  }) {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      params.push(data.name);
    }
    if (data.triggerCondition !== undefined) {
      fields.push('trigger_condition = ?');
      params.push(data.triggerCondition);
    }
    if (data.actions !== undefined) {
      fields.push('actions = ?');
      params.push(JSON.stringify(data.actions));
    }

    if (fields.length === 0) return this.findOne(id);

    fields.push("updated_at = datetime('now')");
    params.push(id);

    this.db.run(`UPDATE peak_plan SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findOne(id);
  }

  activate(id: number) {
    this.db.run(
      `UPDATE peak_plan SET status = 'active', activated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [id],
    );
    return this.findOne(id);
  }

  deactivate(id: number) {
    this.db.run(
      `UPDATE peak_plan SET status = 'inactive', updated_at = datetime('now') WHERE id = ?`,
      [id],
    );
    return this.findOne(id);
  }

  remove(id: number) {
    const plan = this.findOne(id);
    if (!plan) return null;
    this.db.run('DELETE FROM peak_plan WHERE id = ?', [id]);
    return plan;
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      stationId: row.station_id,
      stationName: row.station_name,
      name: row.name,
      triggerCondition: row.trigger_condition,
      actions: JSON.parse(row.actions || '[]'),
      status: row.status,
      activatedAt: row.activated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
