import {
  Logger,
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;
    if (!authorization) {
      this.logger.warn('Missing Authorization header');
    } else {
      const [scheme, token] = authorization.split(' ');
      this.logger.debug(
        `Authorization header received: scheme=${scheme}, tokenLength=${token?.length ?? 0}, tokenPrefix=${token?.slice(0, 12) ?? 'none'}...`,
      );
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired. Please login again.');
      }
      if (info instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token. Please login again.');
      }
      throw new UnauthorizedException('Unauthorized. Please provide a valid token.');
    }
    return user;
  }
}
