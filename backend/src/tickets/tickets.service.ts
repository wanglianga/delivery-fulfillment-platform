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
    const ticket = this.findOne(id);
    if (!ticket) return null;

    let finalResolution = resolution;

    if (responsibility === 'platform') {
      const order = this.db.get('SELECT * FROM orders WHERE id = ?', [ticket.orderId]);
      const activeAlerts = this.db.all(
        `SELECT type, level, description, eta_add_minutes 
         FROM weather_alert 
         WHERE station_id = ? AND datetime(end_time) > datetime('now') 
           AND datetime(start_time) <= datetime('now')`,
        [order?.station_id],
      );
      const hasSevereWeather = activeAlerts.some(
        (a: any) => a.level === 'red' || a.level === 'orange' || a.eta_add_minutes >= 15,
      );
      const excludeRider = hasSevereWeather;

      if (excludeRider) {
        const contextParts: string[] = [];

        if (order?.weather_affected) {
          const weatherInfo = order.weather_affected;
          const parts = weatherInfo.split(':');
          const type = parts[1] || '天气';
          const level = parts[2] || '';
          const detail = parts[3] || '';
          contextParts.push(`受${level ? level + '级' : ''}${type}影响${detail ? '(' + detail + ')' : ''}`);
        }

        if (order?.slow_prepare_flag === 1) {
          const waitMin = Math.floor((order.slow_prepare_wait_seconds || 0) / 60);
          contextParts.push(`商户出餐慢（等待约${waitMin}分钟）`);
        }

        if (contextParts.length > 0) {
          finalResolution = `${resolution || ''} | 上下文说明：${contextParts.join('；')}，骑手免责`;
        }
      }
    }

    this.db.run(
      `UPDATE ticket SET responsibility = ?, resolution = ?, status = 'judged', judged_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [responsibility, finalResolution, id],
    );
    return this.findOne(id);
  }

  private calculateCompensation(ruleType: string, value: number, totalAmount: number, minAmount: number, maxAmount: number): number {
    let amount = 0;

    switch (ruleType) {
      case 'percent':
        amount = totalAmount * value;
        break;
      case 'fixed':
        amount = value;
        break;
      case 'hybrid':
        amount = totalAmount * value;
        if (minAmount > 0 && amount < minAmount) {
          amount = minAmount;
        }
        if (maxAmount > 0 && amount > maxAmount) {
          amount = maxAmount;
        }
        break;
      default:
        amount = totalAmount * 0.2;
    }

    if (ruleType !== 'hybrid') {
      if (minAmount > 0 && amount < minAmount) {
        amount = minAmount;
      }
      if (maxAmount > 0 && amount > maxAmount) {
        amount = maxAmount;
      }
    }

    return Math.round(amount * 100) / 100;
  }

  private getCompensationRule(responsibility: string): any {
    return this.db.get(
      'SELECT * FROM customer_compensation_rule WHERE responsibility = ?',
      [responsibility],
    );
  }

  compensate(id: number, userId: number) {
    const ticket = this.findOne(id);
    if (!ticket) return null;

    this.db.run(
      `UPDATE ticket SET status = 'compensating', updated_at = datetime('now') WHERE id = ?`,
      [id],
    );

    const order = this.db.get('SELECT * FROM orders WHERE id = ?', [ticket.orderId]);
    const totalAmount = order?.total_amount || 0;
    const rider = order?.rider_id ? this.db.get('SELECT name FROM user WHERE id = ?', [order.rider_id]) : null;
    const customerName = order?.customer_name || '顾客';
    const riderName = rider?.name || '骑手';
    const riderId = order?.rider_id || 0;

    const compensationsToCreate: Array<{
      type: string;
      amount: number;
      recipientType: string;
      recipientId: number;
      recipientName: string;
      reason: string;
    }> = [];

    switch (ticket.responsibility) {
      case 'platform': {
        const rule = this.getCompensationRule('platform');
        const amount = rule
          ? this.calculateCompensation(rule.rule_type, rule.value, totalAmount, rule.min_amount, rule.max_amount)
          : totalAmount * 0.3;
        compensationsToCreate.push({
          type: 'refund_customer',
          amount,
          recipientType: 'customer',
          recipientId: 0,
          recipientName: customerName,
          reason: `基于工单${ticket.id}责任判定(platform)自动生成${rule ? `，规则：${rule.rule_type}(${rule.value})` : ''}`,
        });
        break;
      }
      case 'merchant': {
        const riderRule = this.getCompensationRule('rider');
        const riderAmount = riderRule
          ? this.calculateCompensation(riderRule.rule_type, riderRule.value, totalAmount, riderRule.min_amount, riderRule.max_amount)
          : 15;
        compensationsToCreate.push({
          type: 'compensate_rider',
          amount: riderAmount,
          recipientType: 'rider',
          recipientId: riderId,
          recipientName: riderName,
          reason: `基于工单${ticket.id}责任判定(merchant)自动补偿骑手${riderRule ? `，规则：${riderRule.rule_type}(${riderRule.value})` : ''}`,
        });

        const customerRule = this.getCompensationRule('merchant');
        const customerAmount = customerRule
          ? this.calculateCompensation(customerRule.rule_type, customerRule.value, totalAmount, customerRule.min_amount, customerRule.max_amount)
          : totalAmount * 0.2;
        compensationsToCreate.push({
          type: 'refund_customer',
          amount: customerAmount,
          recipientType: 'customer',
          recipientId: 0,
          recipientName: customerName,
          reason: `基于工单${ticket.id}责任判定(merchant)自动补偿顾客${customerRule ? `，规则：${customerRule.rule_type}(${customerRule.value})` : ''}`,
        });
        break;
      }
      case 'rider': {
        const rule = this.getCompensationRule('rider');
        const amount = rule
          ? this.calculateCompensation(rule.rule_type, rule.value, totalAmount, rule.min_amount, rule.max_amount)
          : totalAmount * 0.5;
        compensationsToCreate.push({
          type: 'refund_customer',
          amount,
          recipientType: 'customer',
          recipientId: 0,
          recipientName: customerName,
          reason: `基于工单${ticket.id}责任判定(rider)自动生成${rule ? `，规则：${rule.rule_type}(${rule.value})` : ''}`,
        });
        break;
      }
      case 'customer': {
        const rule = this.getCompensationRule('customer');
        const amount = rule
          ? this.calculateCompensation(rule.rule_type, rule.value, totalAmount, rule.min_amount, rule.max_amount)
          : 10;
        compensationsToCreate.push({
          type: 'compensate_rider',
          amount,
          recipientType: 'rider',
          recipientId: riderId,
          recipientName: riderName,
          reason: `基于工单${ticket.id}责任判定(customer)自动生成${rule ? `，规则：${rule.rule_type}(${rule.value})` : ''}`,
        });
        break;
      }
      default: {
        const amount = totalAmount * 0.2;
        compensationsToCreate.push({
          type: 'refund_customer',
          amount,
          recipientType: 'customer',
          recipientId: 0,
          recipientName: customerName,
          reason: `基于工单${ticket.id}责任判定(默认)自动生成`,
        });
      }
    }

    for (const comp of compensationsToCreate) {
      this.db.run(
        `INSERT INTO compensation (ticket_id, order_id, type, amount, recipient_type, recipient_id, recipient_name, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          ticket.orderId,
          comp.type,
          comp.amount,
          comp.recipientType,
          comp.recipientId,
          comp.recipientName,
          comp.reason,
        ],
      );
    }

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
