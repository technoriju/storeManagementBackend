const { Project } = require('ts-morph');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const sourceFiles = project.getSourceFiles();

for (const sourceFile of sourceFiles) {
  let changed = false;

  const classes = sourceFile.getClasses();
  for (const cls of classes) {
    for (const prop of cls.getProperties()) {
      const name = prop.getName();
      if (name === 'id' || name.endsWith('Id')) {
        const typeNode = prop.getTypeNode();
        if (typeNode && typeNode.getText() === 'string') {
          prop.setType('number');
          
          const decorators = prop.getDecorators();
          for (const dec of decorators) {
            if (dec.getName() === 'IsString') {
              // replace with IsNumber() or simply remove IsString, actually better to just replace expression
              // since class-validator has IsNumber
              dec.replaceWithText('@IsNumber()');
            }
          }
          changed = true;
        }
      }
    }
  }

  const functions = sourceFile.getFunctions();
  const methods = sourceFile.getClasses().flatMap(c => c.getMethods());
  
  for (const method of [...functions, ...methods]) {
    for (const param of method.getParameters()) {
      const name = param.getName();
      if (name === 'id' || name.endsWith('Id')) {
        const typeNode = param.getTypeNode();
        if (typeNode && typeNode.getText() === 'string') {
          param.setType('any');
          changed = true;
        }
      }
    }
  }

  if (changed) {
    sourceFile.saveSync();
    console.log(`Updated ${sourceFile.getFilePath()}`);
  }
}
