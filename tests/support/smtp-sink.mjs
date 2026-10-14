// A tiny fake SMTP server for tests: accepts every message over TLS and
// appends it to a file, so end-to-end tests can read one-time codes without
// sending real email. Never use outside tests.
//
// Usage: node tests/support/smtp-sink.mjs <port> <outFile>
// Then run the app with SMTP_HOST=127.0.0.1 SMTP_PORT=<port> SMTP_USER=t SMTP_PASS=t
// and NODE_TLS_REJECT_UNAUTHORIZED=0 (the sink uses a throwaway self-signed certificate).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import { execFileSync } from "node:child_process";

const port = Number(process.argv[2] ?? 2465);
const outFile = process.argv[3] ?? path.join(os.tmpdir(), "smtp-sink.log");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smtp-sink-"));
const key = path.join(dir, "key.pem");
const cert = path.join(dir, "cert.pem");
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=localhost"], { stdio: "ignore" });

const server = tls.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (socket) => {
  let buffer = "";
  let inData = false;
  let message = "";
  const reply = (line) => socket.write(`${line}\r\n`);
  reply("220 smtp-sink ready");
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let index;
    while ((index = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (inData) {
        if (line === ".") {
          inData = false;
          fs.appendFileSync(outFile, `${message}\n=====END=====\n`);
          message = "";
          reply("250 queued");
        } else {
          message += (line.startsWith("..") ? line.slice(1) : line) + "\n";
        }
        continue;
      }
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === "EHLO" || cmd === "HELO") socket.write("250-smtp-sink\r\n250 AUTH PLAIN LOGIN\r\n");
      else if (cmd === "AUTH") reply(line.toUpperCase().includes("LOGIN") && line.split(" ").length < 3 ? "334 VXNlcm5hbWU6" : "235 ok");
      else if (cmd === "MAIL" || cmd === "RCPT" || cmd === "RSET" || cmd === "NOOP") reply("250 ok");
      else if (cmd === "DATA") { inData = true; reply("354 go ahead"); }
      else if (cmd === "QUIT") { reply("221 bye"); socket.end(); }
      else if (/^[A-Za-z0-9+/=]+$/.test(line)) reply(line.length > 0 ? "235 ok" : "334 UGFzc3dvcmQ6");
      else reply("250 ok");
    }
  });
  socket.on("error", () => {});
});
server.listen(port, "127.0.0.1", () => console.log(`smtp-sink listening on ${port}, writing to ${outFile}`));
