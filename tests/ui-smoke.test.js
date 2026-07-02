import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("UI contains all first-version navigation sections", () => {
  const html = readFileSync("public/index.html", "utf8");
  for (const label of ["仪表盘", "设备", "流量", "域名", "安全", "策略", "报表", "设置"]) {
    assert.ok(html.includes(label), `missing ${label}`);
  }
});
