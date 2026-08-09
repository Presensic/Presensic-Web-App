const fs = require("fs");
const path = require("path");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith(".tsx")) results.push(file);
  });
  return results;
}

walk("src").forEach(file => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    // Look for .map( ( ... ) => ( ... < ... > ... ) )
    if (line.includes(".map(")) {
      let block = "";
      for (let j = idx; j < Math.min(idx + 20, lines.length); j++) {
        block += lines[j] + "\n";
      }
      
      // If it contains JSX tags
      if (block.includes("</") || block.includes("<div") || block.includes("<tr") || block.includes("<li")) {
        // And if the map function returns the JSX
        if (!block.includes("key=")) {
          console.log(`POTENTIALLY MISSING KEY: ${file}:${idx+1} -> ${line.trim()}`);
        }
      }
    }
  });
});
