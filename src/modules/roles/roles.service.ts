import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../infrastructure/data-access/prisma/prisma.service";
import { CreateRoleDto, UpdateRoleDto } from "./dto/roles.dto";

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  private async resolvePermissionIds(dto: { permissionIds?: number[]; permissions?: string[] }): Promise<number[] | undefined> {
    if (dto.permissionIds !== undefined && Array.isArray(dto.permissionIds)) {
      return Array.from(new Set(dto.permissionIds.map(Number)));
    }
    if (dto.permissions !== undefined && Array.isArray(dto.permissions)) {
      if (dto.permissions.length === 0) return [];
      const matched = await this.prisma.permission.findMany({
        where: { action: { in: dto.permissions } },
        select: { id: true },
      });
      return matched.map((p) => p.id);
    }
    return undefined;
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            users: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      usersCount: role._count?.users ?? 0,
      permissions: role.permissions.map((rp) => rp.permission.action),
      permissionsList: role.permissions.map((rp) => rp.permission),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            users: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      status: role.status,
      usersCount: role._count?.users ?? 0,
      permissions: role.permissions.map((rp) => rp.permission.action),
      permissionsList: role.permissions.map((rp) => rp.permission),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async create(dto: CreateRoleDto) {
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: dto.name,
        deletedAt: null,
      },
    });

    if (existingRole) {
      throw new ConflictException(`Role '${dto.name}' already exists`);
    }

    const createdRole = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: "ACTIVE",
      },
    });

    const targetPermissionIds = await this.resolvePermissionIds(dto);
    if (targetPermissionIds && targetPermissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: targetPermissionIds.map((pId) => ({
          roleId: createdRole.id,
          permissionId: pId,
          status: "ACTIVE",
        })),
        skipDuplicates: true,
      });
    }

    return this.findOne(createdRole.id);
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (dto.name && dto.name !== role.name) {
      const nameConflict = await this.prisma.role.findFirst({
        where: {
          name: dto.name,
          deletedAt: null,
          NOT: { id },
        },
      });
      if (nameConflict) {
        throw new ConflictException(`Role with name '${dto.name}' already exists`);
      }
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name ?? role.name,
        description: dto.description !== undefined ? dto.description : role.description,
      },
    });

    const targetPermissionIds = await this.resolvePermissionIds(dto);
    if (targetPermissionIds !== undefined) {
      // Remove old role permissions
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Insert new ones
      if (targetPermissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: targetPermissionIds.map((pId) => ({
            roleId: id,
            permissionId: pId,
            status: "ACTIVE",
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Protect built-in Super Admin role
    if (role.name === "Super Admin") {
      throw new BadRequestException("The Super Admin role cannot be deleted");
    }

    // Check if any active users are assigned
    const activeUsersCount = await this.prisma.user.count({
      where: {
        roleId: id,
        deletedAt: null,
      },
    });

    if (activeUsersCount > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}'. It is currently assigned to ${activeUsersCount} user(s). Reassign them first.`,
      );
    }

    // Soft delete role
    await this.prisma.role.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
      },
    });

    return {
      success: true,
      message: `Role '${role.name}' deleted successfully`,
    };
  }
}
