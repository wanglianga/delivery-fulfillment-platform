import { Injectable, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private db: Database.Database;

  constructor() {
    const dbDir = join(process.cwd(), 'data');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = join(dbDir, 'fulfillment.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  onModuleInit() {
    this.createTables();
    this.createIndexes();
  }

  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS station (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        service_area TEXT NOT NULL,
        lat REAL NOT NULL DEFAULT 0,
        lng REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS merchant (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        station_id INTEGER NOT NULL REFERENCES station(id),
        phone TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('station', 'rider', 'merchant', 'cs', 'admin')),
        name TEXT NOT NULL,
        station_id INTEGER REFERENCES station(id),
        merchant_id INTEGER REFERENCES merchant(id),
        phone TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS shift (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rider_id INTEGER NOT NULL REFERENCES user(id),
        station_id INTEGER NOT NULL REFERENCES station(id),
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('morning', 'afternoon', 'evening', 'night')),
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed', 'absent')),
        service_area TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT NOT NULL UNIQUE,
        station_id INTEGER NOT NULL REFERENCES station(id),
        merchant_id INTEGER NOT NULL REFERENCES merchant(id),
        rider_id INTEGER REFERENCES user(id),
        customer_name TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        customer_phone TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'arrived_store', 'picked_up', 'delivering', 'delivered', 'signed', 'exception')),
        items TEXT NOT NULL DEFAULT '[]',
        total_amount REAL NOT NULL DEFAULT 0,
        delivery_fee REAL NOT NULL DEFAULT 0,
        estimated_delivery_time TEXT,
        accepted_at TEXT,
        arrived_store_at TEXT,
        picked_up_at TEXT,
        delivering_at TEXT,
        delivered_at TEXT,
        signed_at TEXT,
        prepare_started_at TEXT,
        prepare_completed_at TEXT,
        delivery_photo TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS order_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        event TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        operator TEXT NOT NULL DEFAULT '',
        detail TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS exception_record (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        type TEXT NOT NULL CHECK(type IN ('rainstorm', 'slow_prepare', 'rider_accident', 'wrong_address', 'lost', 'wrong_delivery', 'customer_reject', 'timeout', 'other')),
        description TEXT NOT NULL DEFAULT '',
        reported_by INTEGER NOT NULL REFERENCES user(id),
        reported_by_role TEXT NOT NULL,
        photos TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'resolved')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ticket (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exception_id INTEGER NOT NULL REFERENCES exception_record(id),
        order_id INTEGER NOT NULL REFERENCES orders(id),
        type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'investigating', 'judged', 'compensating', 'closed')),
        assigned_to INTEGER REFERENCES user(id),
        responsibility TEXT CHECK(responsibility IN ('platform', 'merchant', 'rider', 'customer')),
        resolution TEXT,
        judged_at TEXT,
        closed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS compensation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL REFERENCES ticket(id),
        order_id INTEGER NOT NULL REFERENCES orders(id),
        type TEXT NOT NULL CHECK(type IN ('refund_customer', 'compensate_rider', 'compensate_merchant', 'insurance_claim')),
        amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'paid')),
        recipient_type TEXT NOT NULL CHECK(recipient_type IN ('customer', 'rider', 'merchant')),
        recipient_id INTEGER NOT NULL,
        recipient_name TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        approved_by INTEGER REFERENCES user(id),
        approved_at TEXT,
        paid_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS peak_plan (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL REFERENCES station(id),
        name TEXT NOT NULL,
        trigger_condition TEXT NOT NULL DEFAULT '',
        actions TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'inactive' CHECK(status IN ('active', 'inactive')),
        activated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS weather_alert (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER NOT NULL REFERENCES station(id),
        type TEXT NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('yellow', 'orange', 'red')),
        description TEXT NOT NULL DEFAULT '',
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  private createIndexes() {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_shift_rider ON shift(rider_id, date);
      CREATE INDEX IF NOT EXISTS idx_shift_station ON shift(station_id, date);
      CREATE INDEX IF NOT EXISTS idx_order_station ON orders(station_id, status);
      CREATE INDEX IF NOT EXISTS idx_order_merchant ON orders(merchant_id, status);
      CREATE INDEX IF NOT EXISTS idx_order_rider ON orders(rider_id, status);
      CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON order_timeline(order_id);
      CREATE INDEX IF NOT EXISTS idx_exception_order ON exception_record(order_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_exception ON ticket(exception_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status);
      CREATE INDEX IF NOT EXISTS idx_compensation_ticket ON compensation(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_compensation_status ON compensation(status);
    `);
  }

  all(sql: string, params?: any[]): any[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...(params || []));
  }

  get(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    return stmt.get(...(params || []));
  }

  run(sql: string, params?: any[]): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(...(params || []));
  }

  exec(sql: string) {
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }
}
