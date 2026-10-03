const fs = require('fs');
const path = require('path');

function searchProtoFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchProtoFiles(full);
    } else if (entry.name.endsWith('.proto') || entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('BattleItemCard') || content.includes('awardCardNotice') || content.includes('AwardCardNotice')) {
          console.log('\nFound relevant file:', full);
          // Look for enum or message definition
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('BattleItemCard') || lines[i].includes('AwardCardNotice') || lines[i].includes('cardType')) {
              console.log(`${i+1}: ${lines[i].trim()}`);
              for (let j = 1; j <= 15 && i + j < lines.length; j++) {
                console.log(`   +${j}: ${lines[i+j].trim()}`);
              }
              break;
            }
          }
        }
      } catch (e) {}
    }
  }
}

searchProtoFiles(path.resolve('node_modules'));
