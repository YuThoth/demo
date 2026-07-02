import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function createJsonStore(filePath) {
  return {
    read() {
      try {
        return JSON.parse(readFileSync(filePath, "utf8"));
      } catch {
        return {};
      }
    },
    write(data) {
      mkdirSync(dirname(filePath), { recursive: true });
      const tempPath = `${filePath}.tmp`;
      writeFileSync(tempPath, JSON.stringify(data, null, 2));
      renameSync(tempPath, filePath);
    }
  };
}
