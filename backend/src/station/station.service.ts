import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StationService {
  constructor(private readonly db: DatabaseService) {}

  getCapacity(stationId: number) {
    const station = this.db.get('SELECT * FROM station WHERE id = ?', [stationId]);
    if (!station) return null;

    const today = new Date().toISOString().split('T')[0];

    const activeRiders = this.db.get(
      `SELECT COUNT(*) as count FROM shift WHERE station_id = ? AND date = ? AND status IN ('scheduled', 'active')`,
      [stationId, today],
    );

    const busyRiders = this.db.get(
      `SELECT COUNT(DISTINCT rider_id) as count FROM orders WHERE station_id = ? AND status IN ('accepted', 'arrived_store', 'picked_up', 'delivering')`,
      [stationId],
    );

    const onlineRiders = activeRiders?.count || 0;
    const busy = busyRiders?.count || 0;
    const idle = Math.max(0, onlineRiders - busy);

    const currentOrders = this.db.get(
      `SELECT COUNT(*) as count FROM orders WHERE station_id = ? AND status NOT IN ('signed', 'exception')`,
      [stationId],
    );

    const pendingOrders = this.db.get(
      `SELECT COUNT(*) as count FROM orders WHERE station_id = ? AND status = 'pending'`,
      [stationId],
    );

    const deliveredOrders = this.db.all(
      `SELECT julianday(signed_at) - julianday(accepted_at) as delivery_time
       FROM orders WHERE station_id = ? AND status = 'signed' AND signed_at IS NOT NULL AND accepted_at IS NOT NULL
       LIMIT 50`,
      [stationId],
    );

    const avgDeliveryTime = deliveredOrders.length > 0
      ? Math.round((deliveredOrders.reduce((sum: number, o: any) => sum + (o.delivery_time || 0), 0) / deliveredOrders.length) * 24 * 60)
      : 0;

    const weatherAlert = this.db.get(
      `SELECT * FROM weather_alert WHERE station_id = ? AND datetime(end_time) > datetime('now') ORDER BY level DESC LIMIT 1`,
      [stationId],
    );

    const peakPlan = this.db.get(
      `SELECT * FROM peak_plan WHERE station_id = ? AND status = 'active' LIMIT 1`,
      [stationId],
    );

    return {
      stationId: station.id,
      stationName: station.name,
      onlineRiders,
      idleRiders: idle,
      busyRiders: busy,
      currentOrders: currentOrders?.count || 0,
      pendingOrders: pendingOrders?.count || 0,
      avgDeliveryTime,
      weatherAlert: weatherAlert ? `${weatherAlert.level}预警: ${weatherAlert.description}` : null,
      peakPlanActive: !!peakPlan,
    };
  }

  getHeatmap(stationId: number, timeRange?: string) {
    const station = this.db.get('SELECT * FROM station WHERE id = ?', [stationId]);
    if (!station) return null;

    const orders = this.db.all(
      `SELECT customer_address, COUNT(*) as count FROM orders WHERE station_id = ? AND status NOT IN ('exception') GROUP BY customer_address`,
      [stationId],
    );

    const areas = this.generateHeatmapAreas(station, orders);
    const totalOrders = orders.reduce((sum: number, o: any) => sum + o.count, 0);

    return {
      areas,
      timeRange: timeRange || 'today',
      totalOrders,
    };
  }

  private generateHeatmapAreas(station: any, orders: any[]) {
    const baseAreas = [
      { name: `${station.service_area}中心区`, lat: station.lat, lng: station.lng, offset: 0 },
      { name: `${station.service_area}北区`, lat: station.lat + 0.02, lng: station.lng, offset: 0.005 },
      { name: `${station.service_area}南区`, lat: station.lat - 0.02, lng: station.lng, offset: -0.005 },
      { name: `${station.service_area}东区`, lat: station.lat, lng: station.lng + 0.02, offset: 0.01 },
      { name: `${station.service_area}西区`, lat: station.lat, lng: station.lng - 0.02, offset: -0.01 },
    ];

    return baseAreas.map((area, index) => {
      const orderCount = orders.length > index ? orders[index]?.count || Math.floor(Math.random() * 30) + 5 : Math.floor(Math.random() * 20) + 3;
      let density: 'low' | 'medium' | 'high' | 'critical';
      if (orderCount < 10) density = 'low';
      else if (orderCount < 25) density = 'medium';
      else if (orderCount < 40) density = 'high';
      else density = 'critical';

      return {
        name: area.name,
        lat: area.lat + (area.offset || 0),
        lng: area.lng + (area.offset || 0),
        orderCount,
        density,
      };
    });
  }
}
