import { createServer } from "node:http";
import { createApp } from "./app/createApp.js";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4780);
const simulatorEnabled = process.env.SIMULATOR !== "0";

const server = createServer(createApp({ dataDir: "data", simulatorEnabled }));

server.listen(port, host, () => {
  console.log(`LAN Gateway Traffic Analyzer listening at http://${host}:${port}`);
});
