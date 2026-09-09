import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitsDto } from './dto/create-unit.dto';
import { UpdateUnitsDto } from './dto/update-unit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @ApiOperation({ summary: 'Create a new unit' })
  @Post()
  create(@Body() createUnitsDto: CreateUnitsDto) {
    return this.unitsService.create(createUnitsDto);
  }

  @ApiOperation({ summary: 'Get all units' })
  @Get()
  findAll() {
    return this.unitsService.findAll();
  }

  @ApiOperation({ summary: 'Get a unit by id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a unit by id' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnitsDto: UpdateUnitsDto) {
    return this.unitsService.update(id, updateUnitsDto);
  }

  @ApiOperation({ summary: 'Delete a unit by id' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
