import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateSubCategoriesDto } from "./dto/create-subcategory.dto";
import { UpdateSubCategoriesDto } from "./dto/update-subcategory.dto";

@Injectable()
export class SubCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createSubCategoriesDto: CreateSubCategoriesDto) {
    return this.prisma.subCategory.create({
      data: createSubCategoriesDto,
    });
  }

  async findAll() {
    return this.prisma.subCategory.findMany({
      where: { deletedAt: null },
    });
  }

  async findOne(id: any) {
    const item = await this.prisma.subCategory.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException("SubCategories not found");
    }
    return item;
  }

  async update(id: any, updateSubCategoriesDto: UpdateSubCategoriesDto) {
    await this.findOne(id);
    return this.prisma.subCategory.update({
      where: { id },
      data: updateSubCategoriesDto,
    });
  }

  async remove(id: any) {
    await this.findOne(id);
    return this.prisma.subCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
