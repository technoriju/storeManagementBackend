const fs = require('fs');
const path = require('path');

function fixDto(moduleName, singular) {
    const file = path.join('src/modules', moduleName, 'dto', 'update-' + singular + '.dto.ts');
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace("from './create-' + moduleName.slice(0, -1) + '.dto';", "from './create-" + singular + ".dto';");
    fs.writeFileSync(file, content);
}
fixDto('subcategories', 'subcategory');
fixDto('units', 'unit');
fixDto('products', 'product');

function fixService(moduleName) {
    const file = path.join('src/modules', moduleName, moduleName + '.service.ts');
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace('../../infrastructure/prisma/prisma.service', '../../infrastructure/data-access/prisma/prisma.service');
    fs.writeFileSync(file, content);
}
fixService('subcategories');
fixService('units');
fixService('products');

let appContent = fs.readFileSync('src/app.module.ts', 'utf8');
appContent = appContent.replace("import { SubcategoriesModule } from './modules/subcategories/subcategories.module';", "import { SubCategoriesModule } from './modules/subcategories/subcategories.module';");
appContent = appContent.replace('SubcategoriesModule,', 'SubCategoriesModule,');
fs.writeFileSync('src/app.module.ts', appContent);
