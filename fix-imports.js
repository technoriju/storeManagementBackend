const { Project } = require('ts-morph');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const filesToUpdate = [
  'src/modules/auth/dto/auth.dto.ts',
  'src/modules/categories/dto/create-category.dto.ts',
  'src/modules/reports/dto/report-filters.dto.ts',
  'src/modules/products/dto/create-product.dto.ts',
  'src/modules/subcategories/dto/create-subcategory.dto.ts'
];

for (const filePath of filesToUpdate) {
  const sourceFile = project.getSourceFile(filePath);
  if (sourceFile) {
    const classValidatorImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === 'class-validator');
    if (classValidatorImport) {
      const namedImports = classValidatorImport.getNamedImports().map(i => i.getName());
      if (!namedImports.includes('IsNumber')) {
        classValidatorImport.addNamedImport('IsNumber');
      }
    } else {
      sourceFile.addImportDeclaration({
        namedImports: ['IsNumber'],
        moduleSpecifier: 'class-validator'
      });
    }

    // Fix deviceId to be string instead of number
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      for (const prop of cls.getProperties()) {
        if (prop.getName() === 'deviceId') {
          prop.setType('string');
        }
      }
    }

    sourceFile.saveSync();
    console.log('Fixed', filePath);
  }
}

const catService = project.getSourceFile('src/modules/categories/categories.service.ts');
if (catService) {
   // deviceId in CategoriesService 
   // Wait, if deviceId is passed to Prisma it should be a string, let's just make it `any` or check if the TS error is because DTO passed number instead of string.
   // Changing DTO deviceId back to string will fix CategoriesService!
}
