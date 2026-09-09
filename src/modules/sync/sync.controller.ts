import { Controller, Post, Get, Body, Query } from "@nestjs/common";
import { SyncService } from "./sync.service";

@Controller("sync")
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post("push")
  async pushChanges(@Body() body: any) {
    // Client can send a single change or an array of changes.
    // We normalize to an array.
    const changes = Array.isArray(body) ? body : [body];
    return this.syncService.pushChanges(changes);
  }

  @Get("pull")
  async pullChanges(
    @Query("lastSync") lastSync: string,
    @Query("deviceId") deviceId: string,
  ) {
    return this.syncService.pullChanges(lastSync, deviceId);
  }
}
