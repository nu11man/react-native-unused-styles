const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const readline = require('readline');

const isStyleSheetCreateCall = (initCallee) => initCallee?.object?.name === 'StyleSheet' && initCallee?.property?.name === 'create'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


rl.question('Enter the path to the React Native component file: ', (filePath) => {
  // Ensure filePath is provided
  if (!filePath) {
    console.error('No path provided. Exiting.');
    rl.close();
    return;
  }

  
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript', // Assuming TypeScript. Remove if JS.
        'classProperties',
      ],
    });

    let styleSheetNames = new Set();
    let usedStyles = new Set();

    traverse(ast, {
      // Find StyleSheet.create({...}) definitions
      VariableDeclarator(path) {
        const initCallee = path.node.init?.callee
        if (isStyleSheetCreateCall(initCallee)) {
          path.node.init.arguments[0].properties.forEach((prop) => {
            const key = prop.key.name;
            styleSheetNames.add(key);
          });
        }
      },
      // Find style usage, e.g., styles.example
      MemberExpression(path) {
        if (path.node.object.name === 'styles') {
          const styleName = path.node.property.name;
          usedStyles.add(styleName);
        }
      },
    });

    // Compare defined styles with used styles
    const unusedStyles = [...styleSheetNames].filter(style => !usedStyles.has(style));

    if (unusedStyles.length > 0) {
      console.log('Unused styles:', unusedStyles);
    } else {
      console.log('No unused styles found.');
    }
  } catch (error) {
    console.error('Failed to read or process the file:', error.message);
  }

  rl.close();
});

