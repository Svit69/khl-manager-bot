import { mkdir, writeFile } from 'node:fs/promises';

export class ImportRecordWriter {
  async writeModules(directory, prefix, exportName, records) {
    await mkdir(directory, { recursive: true });
    const groups = [];
    for (let index = 0; index < records.length; index += 30) {
      const name = `${prefix}${groups.length + 1}`;
      const content = `export const ${name} = [\n${records.slice(index, index + 30).map(record => '  ' + JSON.stringify(record) + ',').join('\n')}\n];\n`;
      await writeFile(`${directory}/${name}.js`, content, 'utf8');
      groups.push(name);
    }
    const imports = groups.map(name => `import { ${name} } from './${name}.js';`).join('\n');
    await writeFile(`${directory}/index.js`, `${imports}\nexport const ${exportName} = [${groups.map(name => '...' + name).join(', ')}];\n`, 'utf8');
  }
}
