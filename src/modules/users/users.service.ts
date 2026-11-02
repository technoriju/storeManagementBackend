import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from "./dto/users.dto";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId?: number) {
    const where: any = {
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        companyId: true,
        branchId: true,
        roleId: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return users;
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        roleId: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    id: true,
                    action: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const permissions = user.role.permissions.map((rp) => rp.permission);

    return {
      ...user,
      role: {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions,
      },
    };
  }

  async create(dto: CreateUserDto) {
    // Check if username is already taken
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existing) {
      throw new ConflictException(`Username '${dto.username}' is already in use`);
    }

    // Verify role exists
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, deletedAt: null },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${dto.roleId} does not exist`);
    }

    // Resolve companyId: default to provided or first active company
    let targetCompanyId = dto.companyId;
    if (!targetCompanyId) {
      const defaultCompany = await this.prisma.company.findFirst({
        where: { deletedAt: null },
      });
      if (!defaultCompany) {
        throw new BadRequestException("No company exists to assign user to");
      }
      targetCompanyId = defaultCompany.id;
    } else {
      const company = await this.prisma.company.findUnique({
        where: { id: targetCompanyId },
      });
      if (!company) {
        throw new NotFoundException(`Company with ID ${targetCompanyId} not found`);
      }
    }

    // Verify branch if provided
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
        companyId: targetCompanyId,
        branchId: dto.branchId ?? null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        status: dto.isActive === false ? "INACTIVE" : "ACTIVE",
      },
    });

    return this.findOne(newUser.id);
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updateData: any = {};

    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;

    if (dto.roleId !== undefined) {
      const role = await this.prisma.role.findFirst({
        where: { id: dto.roleId, deletedAt: null },
      });
      if (!role) {
        throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
      }
      updateData.roleId = dto.roleId;
    }

    if (dto.branchId !== undefined) {
      if (dto.branchId !== null) {
        const branch = await this.prisma.branch.findUnique({
          where: { id: dto.branchId },
        });
        if (!branch) {
          throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
        }
      }
      updateData.branchId = dto.branchId;
    }

    if (dto.companyId !== undefined) {
      const company = await this.prisma.company.findUnique({
        where: { id: dto.companyId },
      });
      if (!company) {
        throw new NotFoundException(`Company with ID ${dto.companyId} not found`);
      }
      updateData.companyId = dto.companyId;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
      updateData.status = dto.isActive ? "ACTIVE" : "INACTIVE";
    }

    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(id);
  }

  async toggleStatus(id: number, isActive: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.username === "admin" && !isActive) {
      throw new BadRequestException("Primary administrator cannot be deactivated");
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isActive,
        status: isActive ? "ACTIVE" : "INACTIVE",
      },
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.username === "admin") {
      throw new BadRequestException("Primary administrator account cannot be deleted");
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: "DELETED",
      },
    });

    return {
      success: true,
      message: `User '${user.username}' deleted successfully`,
    };
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (dto.currentPassword) {
      const match = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!match) {
        throw new BadRequestException("Current password does not match");
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return {
      success: true,
      message: "Password changed successfully",
    };
  }
}
