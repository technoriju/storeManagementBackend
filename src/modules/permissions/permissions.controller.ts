import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { PermissionsService } from "./permissions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Permissions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("permissions")
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @ApiOperation({ summary: "Get all permissions with module metadata" })
  @ApiResponse({ status: 200, description: "List of all active system permissions" })
  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @ApiOperation({ summary: "Get permissions categorized by module" })
  @ApiResponse({ status: 200, description: "Permissions grouped into modules" })
  @Get("modules")
  findModules() {
    return this.permissionsService.findModules();
  }
}
