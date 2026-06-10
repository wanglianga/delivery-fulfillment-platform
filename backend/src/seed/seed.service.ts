import { Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    const userCount = this.db.get('SELECT COUNT(*) as count FROM user');
    if (userCount.count > 0) return;

    await this.seedAll();
  }

  private async seedAll() {
    const password = await bcrypt.hash('123456', 10);
    const now = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    this.seedStations();
    this.seedMerchants();
    await this.seedUsers(password);
    this.seedShifts(now);
    this.seedOrders(now, tomorrow);
    this.seedExceptions();
    this.seedWeatherAlerts();
    this.seedPeakPlans();
  }

  private seedStations() {
    this.db.run(
      `INSERT INTO station (name, address, service_area, lat, lng) VALUES (?, ?, ?, ?, ?)`,
      ['朝阳配送站', '北京市朝阳区建国路88号', '朝阳区', 39.92, 116.46],
    );
    this.db.run(
      `INSERT INTO station (name, address, service_area, lat, lng) VALUES (?, ?, ?, ?, ?)`,
      ['海淀配送站', '北京市海淀区中关村大街1号', '海淀区', 39.96, 116.31],
    );
  }

  private seedMerchants() {
    const merchants = [
      { name: '川味轩', address: '朝阳区建外大街12号', stationId: 1, phone: '010-65001234' },
      { name: '粤港茶餐厅', address: '朝阳区望京西路8号', stationId: 1, phone: '010-65002345' },
      { name: '湘里人家', address: '朝阳区三里屯路19号', stationId: 1, phone: '010-65003456' },
      { name: '面之道', address: '朝阳区国贸建外SOHO 3号', stationId: 1, phone: '010-65004567' },
      { name: '老北京涮肉', address: '海淀区五道口华联商厦', stationId: 2, phone: '010-62001234' },
      { name: '麻辣诱惑', address: '海淀区西直门外大街1号', stationId: 2, phone: '010-62002345' },
      { name: '日式拉面馆', address: '海淀区学院路5号', stationId: 2, phone: '010-62003456' },
      { name: '沙县小吃', address: '海淀区知春路10号', stationId: 2, phone: '010-62004567' },
    ];

    for (const m of merchants) {
      this.db.run(
        `INSERT INTO merchant (name, address, station_id, phone) VALUES (?, ?, ?, ?)`,
        [m.name, m.address, m.stationId, m.phone],
      );
    }
  }

  private async seedUsers(password: string) {
    const station1Riders = [
      { username: 'rider_zhangming', name: '张明' },
      { username: 'rider_liqiang', name: '李强' },
      { username: 'rider_wanglei', name: '王磊' },
      { username: 'rider_zhaogang', name: '赵刚' },
      { username: 'rider_liuyang', name: '刘洋' },
      { username: 'rider_chenhui', name: '陈辉' },
      { username: 'rider_yangfan', name: '杨帆' },
      { username: 'rider_zhoupeng', name: '周鹏' },
    ];

    const station2Riders = [
      { username: 'rider_wuyong', name: '吴勇' },
      { username: 'rider_zhengkai', name: '郑凯' },
      { username: 'rider_suntao', name: '孙涛' },
      { username: 'rider_machao', name: '马超' },
      { username: 'rider_hanfei', name: '韩飞' },
      { username: 'rider_zhuliang', name: '朱亮' },
      { username: 'rider_hubin', name: '胡斌' },
      { username: 'rider_linfeng', name: '林峰' },
    ];

    for (const r of station1Riders) {
      this.db.run(
        `INSERT INTO user (username, password, role, name, station_id) VALUES (?, ?, 'rider', ?, 1)`,
        [r.username, password, r.name],
      );
    }

    for (const r of station2Riders) {
      this.db.run(
        `INSERT INTO user (username, password, role, name, station_id) VALUES (?, ?, 'rider', ?, 2)`,
        [r.username, password, r.name],
      );
    }

    this.db.run(
      `INSERT INTO user (username, password, role, name, station_id) VALUES ('station_a', ?, 'station', '调度员A', 1)`,
      [password],
    );
    this.db.run(
      `INSERT INTO user (username, password, role, name, station_id) VALUES ('station_b', ?, 'station', '调度员B', 1)`,
      [password],
    );
    this.db.run(
      `INSERT INTO user (username, password, role, name, station_id) VALUES ('station_c', ?, 'station', '调度员C', 2)`,
      [password],
    );
    this.db.run(
      `INSERT INTO user (username, password, role, name, station_id) VALUES ('station_d', ?, 'station', '调度员D', 2)`,
      [password],
    );

    this.db.run(
      `INSERT INTO user (username, password, role, name) VALUES ('cs_a', ?, 'cs', '客服A')`,
      [password],
    );
    this.db.run(
      `INSERT INTO user (username, password, role, name) VALUES ('cs_b', ?, 'cs', '客服B')`,
      [password],
    );
    this.db.run(
      `INSERT INTO user (username, password, role, name) VALUES ('cs_c', ?, 'cs', '客服C')`,
      [password],
    );
    this.db.run(
      `INSERT INTO user (username, password, role, name) VALUES ('cs_d', ?, 'cs', '客服D')`,
      [password],
    );

    const merchantUsers = [
      { username: 'merchant_1', name: '川味轩老板', merchantId: 1 },
      { username: 'merchant_2', name: '粤港茶餐厅老板', merchantId: 2 },
      { username: 'merchant_3', name: '湘里人家老板', merchantId: 3 },
      { username: 'merchant_4', name: '面之道老板', merchantId: 4 },
      { username: 'merchant_5', name: '老北京涮肉老板', merchantId: 5 },
      { username: 'merchant_6', name: '麻辣诱惑老板', merchantId: 6 },
      { username: 'merchant_7', name: '日式拉面馆老板', merchantId: 7 },
      { username: 'merchant_8', name: '沙县小吃老板', merchantId: 8 },
    ];

    for (const m of merchantUsers) {
      this.db.run(
        `INSERT INTO user (username, password, role, name, merchant_id) VALUES (?, ?, 'merchant', ?, ?)`,
        [m.username, password, m.name, m.merchantId],
      );
    }

    this.db.run(
      `INSERT INTO user (username, password, role, name) VALUES ('admin', ?, 'admin', '管理员')`,
      [password],
    );
  }

  private seedShifts(date: string) {
    const shifts = [
      { riderId: 1, stationId: 1, type: 'morning', startTime: '08:00', endTime: '12:00', serviceArea: '朝阳区建外' },
      { riderId: 2, stationId: 1, type: 'afternoon', startTime: '12:00', endTime: '18:00', serviceArea: '朝阳区望京' },
      { riderId: 3, stationId: 1, type: 'evening', startTime: '18:00', endTime: '22:00', serviceArea: '朝阳区三里屯' },
      { riderId: 9, stationId: 2, type: 'morning', startTime: '08:00', endTime: '12:00', serviceArea: '海淀区五道口' },
      { riderId: 10, stationId: 2, type: 'afternoon', startTime: '12:00', endTime: '18:00', serviceArea: '海淀区西直门' },
    ];

    for (const s of shifts) {
      this.db.run(
        `INSERT INTO shift (rider_id, station_id, date, start_time, end_time, type, status, service_area) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
        [s.riderId, s.stationId, date, s.startTime, s.endTime, s.type, s.serviceArea],
      );
    }
  }

  private seedOrders(now: string, tomorrow: string) {
    const orders = [
      { stationId: 1, merchantId: 1, riderId: 1, status: 'pending', customer: '张先生', address: '朝阳区建国路100号', amount: 58, fee: 5 },
      { stationId: 1, merchantId: 2, riderId: null, status: 'pending', customer: '李女士', address: '朝阳区望京花园', amount: 42, fee: 5 },
      { stationId: 1, merchantId: 3, riderId: null, status: 'pending', customer: '王先生', address: '朝阳区三里屯SOHO', amount: 35, fee: 6 },
      { stationId: 1, merchantId: 4, riderId: null, status: 'pending', customer: '赵女士', address: '朝阳区国贸CBD', amount: 28, fee: 5 },
      { stationId: 1, merchantId: 1, riderId: null, status: 'pending', customer: '刘先生', address: '朝阳区大望路', amount: 65, fee: 7 },
      { stationId: 1, merchantId: 2, riderId: 2, status: 'accepted', customer: '陈先生', address: '朝阳区朝阳公园', amount: 48, fee: 5 },
      { stationId: 1, merchantId: 3, riderId: 3, status: 'accepted', customer: '杨女士', address: '朝阳区劲松', amount: 52, fee: 6 },
      { stationId: 1, merchantId: 4, riderId: 4, status: 'accepted', customer: '周先生', address: '朝阳区双井', amount: 38, fee: 5 },
      { stationId: 1, merchantId: 1, riderId: 5, status: 'arrived_store', customer: '吴女士', address: '朝阳区团结湖', amount: 45, fee: 5 },
      { stationId: 1, merchantId: 2, riderId: 6, status: 'arrived_store', customer: '郑先生', address: '朝阳区十里堡', amount: 62, fee: 6 },
      { stationId: 1, merchantId: 3, riderId: 7, status: 'picked_up', customer: '孙女士', address: '朝阳区金台路', amount: 33, fee: 5 },
      { stationId: 2, merchantId: 5, riderId: 9, status: 'picked_up', customer: '马先生', address: '海淀区五道口华联', amount: 88, fee: 5 },
      { stationId: 2, merchantId: 6, riderId: 10, status: 'delivering', customer: '韩女士', address: '海淀区中关村南大街', amount: 55, fee: 6 },
      { stationId: 2, merchantId: 7, riderId: 11, status: 'delivering', customer: '朱先生', address: '海淀区学院路', amount: 42, fee: 5 },
      { stationId: 2, merchantId: 8, riderId: 12, status: 'delivered', customer: '胡女士', address: '海淀区知春路', amount: 25, fee: 5 },
      { stationId: 1, merchantId: 1, riderId: 1, status: 'delivered', customer: '林先生', address: '朝阳区呼家楼', amount: 72, fee: 6 },
      { stationId: 1, merchantId: 4, riderId: 8, status: 'delivered', customer: '何女士', address: '朝阳区甜水园', amount: 48, fee: 5 },
      { stationId: 2, merchantId: 5, riderId: 13, status: 'signed', customer: '高先生', address: '海淀区清华园', amount: 95, fee: 5 },
      { stationId: 2, merchantId: 6, riderId: 14, status: 'signed', customer: '田女士', address: '海淀区北太平庄', amount: 36, fee: 6 },
      { stationId: 2, merchantId: 8, riderId: 15, status: 'exception', customer: '罗先生', address: '海淀区西土城', amount: 41, fee: 5 },
    ];

    const itemsOptions = [
      [{ name: '宫保鸡丁', quantity: 1, price: 38 }, { name: '米饭', quantity: 2, price: 10 }],
      [{ name: '叉烧饭', quantity: 1, price: 32 }, { name: '冻柠茶', quantity: 1, price: 10 }],
      [{ name: '剁椒鱼头', quantity: 1, price: 58 }, { name: '米饭', quantity: 2, price: 10 }],
      [{ name: '牛肉拉面', quantity: 2, price: 28 }],
      [{ name: '水煮鱼', quantity: 1, price: 55 }, { name: '米饭', quantity: 2, price: 10 }],
      [{ name: '虾饺', quantity: 2, price: 24 }, { name: '白粥', quantity: 1, price: 8 }],
      [{ name: '小炒肉', quantity: 1, price: 42 }, { name: '米饭', quantity: 1, price: 5 }],
      [{ name: '担担面', quantity: 1, price: 22 }, { name: '酸辣汤', quantity: 1, price: 16 }],
      [{ name: '麻婆豆腐', quantity: 1, price: 28 }, { name: '米饭', quantity: 1, price: 5 }],
      [{ name: '蒸排骨', quantity: 1, price: 38 }, { name: '米饭', quantity: 2, price: 10 }],
      [{ name: '红烧肉', quantity: 1, price: 48 }, { name: '米饭', quantity: 1, price: 5 }],
      [{ name: '涮羊肉套餐', quantity: 1, price: 88 }],
      [{ name: '麻辣香锅', quantity: 1, price: 55 }],
      [{ name: '味噌拉面', quantity: 1, price: 32 }, { name: '煎饺', quantity: 1, price: 10 }],
      [{ name: '拌面', quantity: 1, price: 15 }, { name: '蒸蛋', quantity: 1, price: 10 }],
      [{ name: '回锅肉', quantity: 1, price: 42 }, { name: '米饭', quantity: 2, price: 10 }],
      [{ name: '炸酱面', quantity: 2, price: 24 }],
      [{ name: '铜锅涮肉', quantity: 1, price: 95 }],
      [{ name: '口水鸡', quantity: 1, price: 36 }],
      [{ name: '扁肉拌面', quantity: 1, price: 18 }, { name: '卤蛋', quantity: 1, price: 5 }],
    ];

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const orderNo = `ORD2026061000${(i + 1).toString().padStart(2, '0')}`;
      const items = JSON.stringify(itemsOptions[i] || []);
      const estTime = new Date(Date.now() + 45 * 60 * 1000).toISOString();

      this.db.run(
        `INSERT INTO orders (order_no, station_id, merchant_id, rider_id, customer_name, customer_address, status, items, total_amount, delivery_fee, estimated_delivery_time, accepted_at, arrived_store_at, picked_up_at, delivering_at, delivered_at, signed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNo,
          o.stationId,
          o.merchantId,
          o.riderId,
          o.customer,
          o.address,
          o.status,
          items,
          o.amount,
          o.fee,
          estTime,
          ['accepted', 'arrived_store', 'picked_up', 'delivering', 'delivered', 'signed', 'exception'].includes(o.status) ? new Date(Date.now() - 30 * 60 * 1000).toISOString() : null,
          ['arrived_store', 'picked_up', 'delivering', 'delivered', 'signed', 'exception'].includes(o.status) ? new Date(Date.now() - 25 * 60 * 1000).toISOString() : null,
          ['picked_up', 'delivering', 'delivered', 'signed', 'exception'].includes(o.status) ? new Date(Date.now() - 20 * 60 * 1000).toISOString() : null,
          ['delivering', 'delivered', 'signed', 'exception'].includes(o.status) ? new Date(Date.now() - 15 * 60 * 1000).toISOString() : null,
          ['delivered', 'signed'].includes(o.status) ? new Date(Date.now() - 5 * 60 * 1000).toISOString() : null,
          ['signed'].includes(o.status) ? new Date(Date.now() - 2 * 60 * 1000).toISOString() : null,
        ],
      );

      const orderId = this.db.get('SELECT last_insert_rowid() as id').id;
      this.db.run(
        `INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'created', 'system', '订单创建')`,
        [orderId],
      );

      if (o.riderId) {
        const rider = this.db.get('SELECT name FROM user WHERE id = ?', [o.riderId]);
        if (['accepted', 'arrived_store', 'picked_up', 'delivering', 'delivered', 'signed', 'exception'].includes(o.status)) {
          this.db.run(`INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'accepted', ?, '骑手接单')`, [orderId, rider?.name || '']);
        }
        if (['arrived_store', 'picked_up', 'delivering', 'delivered', 'signed', 'exception'].includes(o.status)) {
          this.db.run(`INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'arrived_store', ?, '骑手到店')`, [orderId, rider?.name || '']);
        }
        if (['picked_up', 'delivering', 'delivered', 'signed', 'exception'].includes(o.status)) {
          this.db.run(`INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'picked_up', ?, '骑手取货')`, [orderId, rider?.name || '']);
        }
        if (['delivering', 'delivered', 'signed', 'exception'].includes(o.status)) {
          this.db.run(`INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'delivering', ?, '骑手配送中')`, [orderId, rider?.name || '']);
        }
        if (['delivered', 'signed'].includes(o.status)) {
          this.db.run(`INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'delivered', ?, '已送达')`, [orderId, rider?.name || '']);
        }
        if (['signed'].includes(o.status)) {
          this.db.run(`INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'signed', ?, '顾客签收')`, [orderId, rider?.name || '']);
        }
        if (o.status === 'exception') {
          this.db.run(`INSERT INTO order_timeline (order_id, event, operator, detail) VALUES (?, 'exception', ?, '订单标记为异常')`, [orderId, rider?.name || '']);
        }
      }
    }
  }

  private seedExceptions() {
    const exceptionOrder = this.db.get("SELECT id FROM orders WHERE status = 'exception' LIMIT 1");
    if (!exceptionOrder) return;

    this.db.run(
      `INSERT INTO exception_record (order_id, type, description, reported_by, reported_by_role, photos, status) VALUES (?, 'lost', '配送过程中餐品丢失', ?, 'rider', '[]', 'pending')`,
      [exceptionOrder.id, 15],
    );

    const deliveringOrder = this.db.get("SELECT id FROM orders WHERE status = 'delivering' LIMIT 1");
    if (deliveringOrder) {
      this.db.run(
        `INSERT INTO exception_record (order_id, type, description, reported_by, reported_by_role, photos, status) VALUES (?, 'slow_prepare', '商户出餐过慢导致配送超时', ?, 'rider', '[]', 'processing')`,
        [deliveringOrder.id, 10],
      );
    }

    const pickedUpOrder = this.db.get("SELECT id FROM orders WHERE status = 'picked_up' LIMIT 1");
    if (pickedUpOrder) {
      this.db.run(
        `INSERT INTO exception_record (order_id, type, description, reported_by, reported_by_role, photos, status) VALUES (?, 'rider_accident', '骑手途中发生轻微交通事故', ?, 'rider', '[]', 'pending')`,
        [pickedUpOrder.id, 7],
      );
    }

    const exceptions = this.db.all('SELECT id, order_id FROM exception_record');

    if (exceptions.length >= 1) {
      this.db.run(
        `INSERT INTO ticket (exception_id, order_id, type, priority, status, assigned_to) VALUES (?, ?, '丢餐', 'high', 'pending', 21)`,
        [exceptions[0].id, exceptions[0].order_id],
      );
    }

    if (exceptions.length >= 2) {
      this.db.run(
        `INSERT INTO ticket (exception_id, order_id, type, priority, status, assigned_to, responsibility, resolution, judged_at) VALUES (?, ?, '出餐慢', 'medium', 'judged', 22, 'merchant', '商户承担责任，补偿骑手等待费用', datetime('now'))`,
        [exceptions[1].id, exceptions[1].order_id],
      );

      this.db.run(
        `INSERT INTO compensation (ticket_id, order_id, type, amount, status, recipient_type, recipient_id, recipient_name, reason) VALUES (?, ?, 'compensate_rider', 15, 'pending', 'rider', ?, '骑手', '基于工单责任判定(merchant)自动生成')`,
        [this.db.get('SELECT last_insert_rowid() as id').id, exceptions[1].order_id, 10],
      );
    }

    if (exceptions.length >= 3) {
      this.db.run(
        `INSERT INTO ticket (exception_id, order_id, type, priority, status, assigned_to, responsibility, resolution, judged_at) VALUES (?, ?, '骑手事故', 'urgent', 'compensating', 23, 'platform', '平台保险承担，启动骑手意外险赔付', datetime('now'))`,
        [exceptions[2].id, exceptions[2].order_id],
      );

      const ticketId = this.db.get('SELECT last_insert_rowid() as id').id;
      this.db.run(
        `INSERT INTO compensation (ticket_id, order_id, type, amount, status, recipient_type, recipient_id, recipient_name, reason) VALUES (?, ?, 'insurance_claim', 200, 'approved', 'rider', ?, '骑手', '基于工单责任判定(platform)自动生成')`,
        [ticketId, exceptions[2].order_id, 7],
      );
    }
  }

  private seedWeatherAlerts() {
    const now = new Date();
    const startStr = now.toISOString().replace('T', ' ').split('.')[0];
    const endStr = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];

    this.db.run(
      `INSERT INTO weather_alert (station_id, type, level, description, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`,
      [1, '暴雨', 'yellow', '预计未来6小时内有短时强降雨，请注意配送安全', startStr, endStr],
    );

    this.db.run(
      `INSERT INTO weather_alert (station_id, type, level, description, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)`,
      [2, '大风', 'orange', '预计未来6小时内有大风天气，风力6-7级，建议减少户外配送', startStr, endStr],
    );
  }

  private seedPeakPlans() {
    this.db.run(
      `INSERT INTO peak_plan (station_id, name, trigger_condition, actions, status, activated_at) VALUES (?, ?, ?, ?, 'active', datetime('now'))`,
      [1, '午高峰应对方案', '订单量超过30单/小时', '["增加配送费5元", "延长配送时效15分钟", "调度备用骑手"]'],
    );

    this.db.run(
      `INSERT INTO peak_plan (station_id, name, trigger_condition, actions, status) VALUES (?, ?, ?, ?, 'inactive')`,
      [2, '暴雨天气应急预案', '暴雨预警触发', '["暂停新订单接单", "延长配送时效30分钟", "通知商户延迟出餐"]'],
    );
  }
}
