// A session launcher: credentials arrive through stdin, never arguments or files.
import { createInterface } from "node:readline";
import { main } from "./import-threads.mjs";

if (process.stdin.isTTY) process.stdin.setRawMode(true);
const input = createInterface({ input: process.stdin, terminal: false });
process.stdout.write("Ready for private agent session JSON on stdin.\n");
for await (const line of input) {
  try {
    const config = JSON.parse(line);
    if (
      !config ||
      Object.keys(config).sort().join() !== "editor_token,port,reader_token" ||
      ![config.editor_token, config.reader_token].every(
        (v) => typeof v === "string" && v.length >= 32,
      ) ||
      config.editor_token === config.reader_token ||
      !Number.isInteger(config.port) ||
      config.port < 1024 ||
      config.port > 65535
    )
      throw Error("Invalid session configuration.");
    process.env.NXTGO_AGENT_TOKEN = config.editor_token;
    process.env.NXTGO_AGENT_READ_TOKEN = config.reader_token;
    input.close();
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    process.exitCode = await main(["--multi-source", "--port", String(config.port)]);
  } catch {
    process.stderr.write("Unable to start authorized local agent session.\n");
    process.exitCode = 1;
  }
  break;
}
