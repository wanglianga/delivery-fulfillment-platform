import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
  ) {}

  async login(username: string, password: string, role: string) {
    const user = this.db.get(
      `SELECT u.*, s.name as station_name, m.name as merchant_name
       FROM user u
       LEFT JOIN station s ON u.station_id = s.id
       LEFT JOIN merchant m ON u.merchant_id = m.id
       WHERE u.username = ?`,
      [username],
    );

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (role && user.role !== role) {
      throw new UnauthorizedException('角色不匹配');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      stationId: user.station_id,
      merchantId: user.merchant_id,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        stationId: user.station_id,
        merchantId: user.merchant_id,
      },
    };
  }

  async getProfile(userId: number) {
    const user = this.db.get(
      `SELECT u.*, s.name as station_name, m.name as merchant_name
       FROM user u
       LEFT JOIN station s ON u.station_id = s.id
       LEFT JOIN merchant m ON u.merchant_id = m.id
       WHERE u.id = ?`,
      [userId],
    );

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      stationId: user.station_id,
      merchantId: user.merchant_id,
      phone: user.phone,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Token无效或已过期');
    }
  }
}
