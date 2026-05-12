import { UserRole } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  userType: 'admin' | 'employee';
  iat?: number;
  exp?: number;
}
