import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const outDirPath = resolve(import.meta.dirname, "build");

mkdirSync(outDirPath, { recursive: true });
writeFileSync(
  resolve(outDirPath, "index.html"),
  `
<!DOCTYPE html>
<html>
<head>
  <title>It's working!</title>
</head>
<body>
  <h1>It's working!</h1>
</body>
</html>
`,
);
