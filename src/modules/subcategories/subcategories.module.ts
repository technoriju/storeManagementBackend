import { Module } from '@nestjs/common';
import { SubCategoriesController } from './subcategories.controller';
import { SubCategoriesService } from './subcategories.service';

@Module({
  controllers: [SubCategoriesController],
  providers: [SubCategoriesService],
})
export class SubCategoriesModule {}
