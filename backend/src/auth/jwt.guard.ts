import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwtStrategy: JwtStrategy) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('缺少认证信息');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('认证格式错误');
    }

    const token = parts[1];
    const payload = await this.jwtStrategy.validate(token);

    request.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
      name: payload.name,
      stationId: payload.stationId,
      merchantId: payload.merchantId,
    };

    return true;
  }
}
