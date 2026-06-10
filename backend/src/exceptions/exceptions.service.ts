import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ExceptionsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: { orderId?: number; type?: string; status?: string }) {
    let sql = `SELECT e.*, o.order_no, u.name as reported_by_name
               FROM exception_record e
               JOIN orders o ON e.order_id = o.id
               JOIN user u ON e.reported_by = u.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.orderId) {
      sql += ` AND e.order_id = ?`;
      params.push(query.orderId);
    }
    if (query?.type) {
      sql += ` AND e.type = ?`;
      params.push(query.type);
    }
    if (query?.status) {
      sql += ` AND e.status = ?`;
      params.push(query.status);
    }

    sql += ` ORDER BY e.created_at DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  findOne(id: number) {
    const row = this.db.get(
      `SELECT e.*, o.order_no, u.name as reported_by_name
       FROM exception_record e
       JOIN orders o ON e.order_id = o.id
       JOIN user u ON e.reported_by = u.id
       WHERE e.id = ?`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  create(data: {
    orderId: number;
    type: string;
    description: string;
    reportedBy: number;
    reportedByRole: string;
    photos?: string[];
  }) {
    const result = this.db.run(
      `INSERT INTO exception_record (order_id, type, description, reported_by, reported_by_role, photos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.orderId, data.type, data.description, data.reportedBy, data.reportedByRole, JSON.stringify(data.photos || [])],
    );
    return this.findOne(Number(result.lastInsertRowid));
  }

  update(id: number, data: { status?: string; description?: string }) {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      params.push(data.description);
    }

    if (fields.length === 0) return this.findOne(id);

    fields.push("updated_at = datetime('now')");
    params.push(id);

    this.db.run(
      `UPDATE exception_record SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findOne(id);
  }

  remove(id: number) {
    const record = this.findOne(id);
    if (!record) return null;
    this.db.run('DELETE FROM exception_record WHERE id = ?', [id]);
    return record;
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      orderId: row.order_id,
      orderNo: row.order_no,
      type: row.type,
      description: row.description,
      reportedBy: row.reported_by,
      reportedByName: row.reported_by_name,
      reportedByRole: row.reported_by_role,
      photos: JSON.parse(row.photos || '[]'),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
