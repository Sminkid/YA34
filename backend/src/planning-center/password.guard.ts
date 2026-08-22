import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class PasswordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedPassword = request.headers['x-app-password'];

    if (providedPassword !== process.env.APP_ACCESS_PASSWORD) {
      throw new UnauthorizedException('Incorrect or missing password');
    }

    return true;
  }
}
