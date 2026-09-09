import { PartialType } from '@nestjs/swagger';
import { CreateSubCategoriesDto } from './create-subcategory.dto';

export class UpdateSubCategoriesDto extends PartialType(CreateSubCategoriesDto) {}
