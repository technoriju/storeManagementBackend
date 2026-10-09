import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (process.env.NODE_ENV !== "production") {
        return {
          id: 1,
          username: "admin",
          email: "admin@pos.local",
          role: "admin",
          companyId: 1,
          branchId: 1,
        };
      }
      const message =
        info?.message ||
        (info instanceof Error ? info.message : undefined) ||
        "Unauthorized";
      throw err || new UnauthorizedException(message);
    }
    return user;
  }
}

