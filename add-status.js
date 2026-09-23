const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const lines = schemaContent.split('\n');
let newLines = [];
let insideModel = false;
let modelName = '';
let hasStatus = false;
let modelLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('model ') || line.startsWith('enum ')) {
        insideModel = true;
        hasStatus = false;
        modelName = line.split(' ')[1];
        modelLines.push(line);
    } else if (insideModel && line.startsWith('}')) {
        if (!hasStatus && !modelName.startsWith('Sync') && !modelName.startsWith('AuditLog') && !modelName.startsWith('RefreshToken') && !modelName.startsWith('InvoiceTemplateSetting') && !modelName.startsWith('InvoiceTemplate') && modelName !== 'TaxType') {
           // Insert status before the closing brace or before the relations/indexes.
           // Actually, let's just insert it before the createdAt/updatedAt block if possible, or just before '}'
           let insertIdx = modelLines.length;
           // find createdAt
           for (let j = 0; j < modelLines.length; j++) {
               if (modelLines[j].includes('createdAt')) {
                   insertIdx = j;
                   break;
               }
           }
           modelLines.splice(insertIdx, 0, '  status    String    @default("ACTIVE")');
        }
        modelLines.push(line);
        newLines.push(...modelLines);
        modelLines = [];
        insideModel = false;
    } else if (insideModel) {
        if (line.trim().startsWith('status ')) {
            hasStatus = true;
        }
        modelLines.push(line);
    } else {
        newLines.push(line);
    }
}

fs.writeFileSync(schemaPath, newLines.join('\n'));
console.log('Done');
