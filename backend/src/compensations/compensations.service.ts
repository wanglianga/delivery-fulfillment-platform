import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CompensationsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: { status?: string; ticketId?: number }) {
    let sql = `SELECT c.*, o.order_no
               FROM compensation c
               JOIN orders o ON c.order_id = o.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.status) {
      sql += ` AND c.status = ?`;
      params.push(query.status);
    }
    if (query?.ticketId) {
      sql += ` AND c.ticket_id = ?`;
      params.push(query.ticketId);
    }

    sql += ` ORDER BY c.created_at DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  findOne(id: number) {
    const row = this.db.get(
      `SELECT c.*, o.order_no
       FROM compensation c
       JOIN orders o ON c.order_id = o.id
       WHERE c.id = ?`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  approve(id: number, approvedBy: number, reason?: string) {
    const comp = this.findOne(id);
    if (!comp) return null;
    if (comp.status !== 'pending') {
      throw new Error('只有待审批的赔付可以审批');
    }

    this.db.run(
      `UPDATE compensation SET status = 'approved', approved_by = ?, approved_at = datetime('now'), reason = ?, updated_at = datetime('now') WHERE id = ?`,
      [approvedBy, reason || comp.reason, id],
    );
    return this.findOne(id);
  }

  reject(id: number, approvedBy: number, reason?: string) {
    const comp = this.findOne(id);
    if (!comp) return null;
    if (comp.status !== 'pending') {
      throw new Error('只有待审批的赔付可以驳回');
    }

    this.db.run(
      `UPDATE compensation SET status = 'rejected', approved_by = ?, approved_at = datetime('now'), reason = ?, updated_at = datetime('now') WHERE id = ?`,
      [approvedBy, reason || comp.reason, id],
    );
    return this.findOne(id);
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      ticketId: row.ticket_id,
      orderId: row.order_id,
      orderNo: row.order_no,
      type: row.type,
      amount: row.amount,
      currency: 'CNY',
      status: row.status,
      recipientType: row.recipient_type,
      recipientId: row.recipient_id,
      recipientName: row.recipient_name,
      reason: row.reason,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
