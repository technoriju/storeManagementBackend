import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { CreateSettingDto } from "./dto/create-setting.dto";
import { UpdateSettingDto } from "./dto/update-setting.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @ApiOperation({ summary: "Get all settings" })
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: "Get a setting by key" })
  @Get(":key")
  findByKey(@Param("key") key: string) {
    return this.service.findByKey(key);
  }

  @ApiOperation({ summary: "Update or create a setting by key" })
  @Put(":key")
  updateByKey(@Param("key") key: string, @Body() dto: UpdateSettingDto) {
    return this.service.upsert(key, dto.value, dto.deviceId);
  }

  @ApiOperation({ summary: "Create or upsert a setting" })
  @Post()
  create(@Body() dto: CreateSettingDto) {
    return this.service.upsert(dto.key, dto.value, dto.deviceId);
  }

  @ApiOperation({ summary: "Delete a setting by key" })
  @Delete(":key")
  remove(@Param("key") key: string) {
    return this.service.remove(key);
  }
}
