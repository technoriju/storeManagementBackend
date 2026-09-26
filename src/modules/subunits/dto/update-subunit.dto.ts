import { PartialType } from "@nestjs/swagger";
import { CreateSubUnitDto } from "./create-subunit.dto";

export class UpdateSubUnitDto extends PartialType(CreateSubUnitDto) {}
