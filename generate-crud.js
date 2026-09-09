const fs = require('fs');
const path = require('path');

function generateModuleCode(moduleName, ModuleName, modelName) {
  const dtosDir = path.join(__dirname, 'src/modules', moduleName, 'dto');
  const createDtoCode = `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';

export class Create${ModuleName}Dto {
${moduleName === 'subcategories' ? `  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
` : ''}${moduleName === 'units' ? `  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  shortName: string;
` : ''}${moduleName === 'products' ? `  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subCategoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxRateId?: string;

  @ApiProperty()
  @IsString()
  baseUnitId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultPurchaseUnitId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultSalesUnitId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  productCode: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiPropertyOptional()
  @IsEnum(['GST', 'NON_GST'])
  @IsOptional()
  taxType?: 'GST' | 'NON_GST';

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isPriceInclusive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  batchTracking?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  expiryTracking?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  serialTracking?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  lowStockLevel?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  reorderLevel?: number;
` : ''}}
`;
  const updateDtoCode = `import { PartialType } from '@nestjs/swagger';
import { Create${ModuleName}Dto } from './create-' + moduleName.slice(0, -1) + '.dto';

export class Update${ModuleName}Dto extends PartialType(Create${ModuleName}Dto) {}
`;
  const singular = moduleName === 'subcategories' ? 'subcategory' : moduleName.slice(0, -1);
  fs.writeFileSync(path.join(dtosDir, 'create-' + singular + '.dto.ts'), createDtoCode);
  fs.writeFileSync(path.join(dtosDir, 'update-' + singular + '.dto.ts'), updateDtoCode);

  const controllerCode = `import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ${ModuleName}Service } from './${moduleName}.service';
import { Create${ModuleName}Dto } from './dto/create-' + singular + '.dto';
import { Update${ModuleName}Dto } from './dto/update-' + singular + '.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('${ModuleName}')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('${moduleName}')
export class ${ModuleName}Controller {
  constructor(private readonly ${moduleName}Service: ${ModuleName}Service) {}

  @ApiOperation({ summary: 'Create a new ${singular}' })
  @Post()
  create(@Body() create${ModuleName}Dto: Create${ModuleName}Dto) {
    return this.${moduleName}Service.create(create${ModuleName}Dto);
  }

  @ApiOperation({ summary: 'Get all ${moduleName}' })
  @Get()
  findAll() {
    return this.${moduleName}Service.findAll();
  }

  @ApiOperation({ summary: 'Get a ${singular} by id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${moduleName}Service.findOne(id);
  }

  @ApiOperation({ summary: 'Update a ${singular} by id' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() update${ModuleName}Dto: Update${ModuleName}Dto) {
    return this.${moduleName}Service.update(id, update${ModuleName}Dto);
  }

  @ApiOperation({ summary: 'Delete a ${singular} by id' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.${moduleName}Service.remove(id);
  }
}
`.replace(/' \+ singular \+ '/g, singular);
  fs.writeFileSync(path.join(__dirname, 'src/modules', moduleName, moduleName + '.controller.ts'), controllerCode);

  const serviceCode = `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Create${ModuleName}Dto } from './dto/create-' + singular + '.dto';
import { Update${ModuleName}Dto } from './dto/update-' + singular + '.dto';

@Injectable()
export class ${ModuleName}Service {
  constructor(private prisma: PrismaService) {}

  async create(create${ModuleName}Dto: Create${ModuleName}Dto) {
    return this.prisma.${modelName}.create({
      data: create${ModuleName}Dto,
    });
  }

  async findAll() {
    return this.prisma.${modelName}.findMany({
      where: { deletedAt: null },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.${modelName}.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('${ModuleName} not found');
    }
    return item;
  }

  async update(id: string, update${ModuleName}Dto: Update${ModuleName}Dto) {
    await this.findOne(id);
    return this.prisma.${modelName}.update({
      where: { id },
      data: update${ModuleName}Dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.${modelName}.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
`.replace(/' \+ singular \+ '/g, singular);
  fs.writeFileSync(path.join(__dirname, 'src/modules', moduleName, moduleName + '.service.ts'), serviceCode);
}

generateModuleCode('subcategories', 'SubCategories', 'subCategory');
generateModuleCode('units', 'Units', 'unit');
generateModuleCode('products', 'Products', 'product');
