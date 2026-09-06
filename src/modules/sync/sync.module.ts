import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { PrismaModule } from "../../infrastructure/data-access/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
