import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TicketsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(query?: { status?: string; type?: string; exceptionId?: number }) {
    let sql = `SELECT t.*, e.type as exception_type, o.order_no, u.name as assigned_to_name
               FROM ticket t
               JOIN exception_record e ON t.exception_id = e.id
               JOIN orders o ON t.order_id = o.id
               LEFT JOIN user u ON t.assigned_to = u.id
               WHERE 1=1`;
    const params: any[] = [];

    if (query?.status) {
      sql += ` AND t.status = ?`;
      params.push(query.status);
    }
    if (query?.type) {
      sql += ` AND t.type = ?`;
      params.push(query.type);
    }
    if (query?.exceptionId) {
      sql += ` AND t.exception_id = ?`;
      params.push(query.exceptionId);
    }

    sql += ` ORDER BY t.created_at DESC`;
    const rows = this.db.all(sql, params);
    return rows.map(this.mapRow);
  }

  findOne(id: number) {
    const row = this.db.get(
      `SELECT t.*, e.type as exception_type, o.order_no, u.name as assigned_to_name
       FROM ticket t
       JOIN exception_record e ON t.exception_id = e.id
       JOIN orders o ON t.order_id = o.id
       LEFT JOIN user u ON t.assigned_to = u.id
       WHERE t.id = ?`,
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  create(data: {
    exceptionId: number;
    orderId: number;
    type: string;
    priority?: string;
    assignedTo?: number;
  }) {
    const result = this.db.run(
      `INSERT INTO ticket (exception_id, order_id, type, priority, assigned_to)
       VALUES (?, ?, ?, ?, ?)`,
      [data.exceptionId, data.orderId, data.type, data.priority || 'medium', data.assignedTo || null],
    );
    return this.findOne(Number(result.lastInsertRowid));
  }

  judge(id: number, responsibility: string, resolution: string) {
    this.db.run(
      `UPDATE ticket SET responsibility = ?, resolution = ?, status = 'judged', judged_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [responsibility, resolution, id],
    );
    return this.findOne(id);
  }

  compensate(id: number, userId: number) {
    const ticket = this.findOne(id);
    if (!ticket) return null;

    this.db.run(
      `UPDATE ticket SET status = 'compensating', updated_at = datetime('now') WHERE id = ?`,
      [id],
    );

    const order = this.db.get('SELECT * FROM orders WHERE id = ?', [ticket.orderId]);
    let recipientType: string;
    let recipientId: number;
    let recipientName: string;
    let compType: string;
    let amount: number;

    switch (ticket.responsibility) {
      case 'platform':
        recipientType = 'customer';
        compType = 'refund_customer';
        amount = (order?.total_amount || 0) * 0.3;
        recipientId = 0;
        recipientName = order?.customer_name || '顾客';
        break;
      case 'merchant':
        recipientType = 'rider';
        compType = 'compensate_rider';
        amount = 15;
        recipientId = order?.rider_id || 0;
        const rider = this.db.get('SELECT name FROM user WHERE id = ?', [order?.rider_id]);
        recipientName = rider?.name || '骑手';
        break;
      case 'rider':
        recipientType = 'customer';
        compType = 'refund_customer';
        amount = (order?.total_amount || 0) * 0.5;
        recipientId = 0;
        recipientName = order?.customer_name || '顾客';
        break;
      case 'customer':
        recipientType = 'rider';
        compType = 'compensate_rider';
        amount = 10;
        recipientId = order?.rider_id || 0;
        const rider2 = this.db.get('SELECT name FROM user WHERE id = ?', [order?.rider_id]);
        recipientName = rider2?.name || '骑手';
        break;
      default:
        recipientType = 'customer';
        compType = 'refund_customer';
        amount = (order?.total_amount || 0) * 0.2;
        recipientId = 0;
        recipientName = order?.customer_name || '顾客';
    }

    this.db.run(
      `INSERT INTO compensation (ticket_id, order_id, type, amount, recipient_type, recipient_id, recipient_name, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ticket.orderId,
        compType,
        Math.round(amount * 100) / 100,
        recipientType,
        recipientId,
        recipientName,
        `基于工单${ticket.id}责任判定(${ticket.responsibility})自动生成`,
      ],
    );

    return this.findOne(id);
  }

  update(id: number, data: { status?: string; priority?: string; assignedTo?: number }) {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      fields.push('status = ?');
      params.push(data.status);
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?');
      params.push(data.priority);
    }
    if (data.assignedTo !== undefined) {
      fields.push('assigned_to = ?');
      params.push(data.assignedTo);
    }

    if (fields.length === 0) return this.findOne(id);

    if (data.status === 'closed') {
      fields.push("closed_at = datetime('now')");
    }
    fields.push("updated_at = datetime('now')");
    params.push(id);

    this.db.run(`UPDATE ticket SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findOne(id);
  }

  remove(id: number) {
    const ticket = this.findOne(id);
    if (!ticket) return null;
    this.db.run('DELETE FROM ticket WHERE id = ?', [id]);
    return ticket;
  }

  private mapRow(row: any) {
    return {
      id: row.id,
      exceptionId: row.exception_id,
      orderId: row.order_id,
      orderNo: row.order_no,
      type: row.type,
      exceptionType: row.exception_type,
      priority: row.priority,
      status: row.status,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      responsibility: row.responsibility,
      resolution: row.resolution,
      judgedAt: row.judged_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
