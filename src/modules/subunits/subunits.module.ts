import { Module } from "@nestjs/common";
import { SubUnitsController } from "./subunits.controller";
import { SubUnitsService } from "./subunits.service";

@Module({ controllers: [SubUnitsController], providers: [SubUnitsService] })
export class SubUnitsModule {}
