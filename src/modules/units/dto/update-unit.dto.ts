import { PartialType } from "@nestjs/swagger";
import { CreateUnitsDto } from "./create-unit.dto";

export class UpdateUnitsDto extends PartialType(CreateUnitsDto) {}
