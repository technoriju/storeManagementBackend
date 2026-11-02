import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import {
  CreateUserDto,
  UpdateUserDto,
  ToggleUserStatusDto,
  ChangePasswordDto,
} from "./dto/users.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Get all users (optionally filtered by company)" })
  @ApiQuery({ name: "companyId", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of users" })
  @Get()
  findAll(@Query("companyId") companyId?: string) {
    return this.usersService.findAll(companyId ? +companyId : undefined);
  }

  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({ status: 200, description: "User details with role and branch" })
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: "Create a new user" })
  @ApiResponse({ status: 201, description: "User successfully created" })
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @ApiOperation({ summary: "Update user profile / assignments" })
  @ApiResponse({ status: 200, description: "User successfully updated" })
  @Put(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @ApiOperation({ summary: "Toggle user active status" })
  @ApiResponse({ status: 200, description: "Status successfully updated" })
  @Patch(":id/status")
  toggleStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ToggleUserStatusDto,
  ) {
    return this.usersService.toggleStatus(id, dto.isActive);
  }

  @ApiOperation({ summary: "Change user password" })
  @ApiResponse({ status: 200, description: "Password updated successfully" })
  @Patch(":id/password")
  changePassword(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, dto);
  }

  @ApiOperation({ summary: "Delete user (soft delete)" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
