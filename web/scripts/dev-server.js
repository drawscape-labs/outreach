#!/usr/bin/env node

const { spawn } = require("node:child_process");
const net = require("node:net");

const DEFAULT_BASE_PORT = 4200;
const MAX_PORT_ATTEMPTS = 100;

function readPort(value) {
  const rawValue = String(value);

  if (!/^\d+$/.test(rawValue)) {
    return null;
  }

  const port = Number.parseInt(rawValue, 10);

  if (Number.isInteger(port) && port > 0 && port < 65536) {
    return port;
  }

  return null;
}

function takeFlag(args, names) {
  const nextArgs = [];
  let value;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    let matched = false;

    for (const name of names) {
      if (arg === name) {
        value = args[index + 1];
        index += 1;
        matched = true;
        break;
      }

      if (arg.startsWith(`${name}=`)) {
        value = arg.slice(name.length + 1);
        matched = true;
        break;
      }
    }

    if (!matched) {
      nextArgs.push(arg);
    }
  }

  return { args: nextArgs, value };
}

function canUsePort(port, hostname) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    const options = hostname ? { port, host: hostname } : { port };
    server.listen(options);
  });
}

async function findAvailablePort(basePort, hostname) {
  const lastPort = Math.min(basePort + MAX_PORT_ATTEMPTS - 1, 65535);

  for (let port = basePort; port <= lastPort; port += 1) {
    if (await canUsePort(port, hostname)) {
      return port;
    }
  }

  throw new Error(`No available ports found between ${basePort} and ${lastPort}.`);
}

async function main() {
  let nextArgs = process.argv.slice(2);
  const portFlag = takeFlag(nextArgs, ["--port", "-p"]);
  nextArgs = portFlag.args;

  const hostnameFlag = takeFlag(nextArgs, ["--hostname", "-H"]);
  nextArgs = hostnameFlag.args;

  const hostname = hostnameFlag.value || process.env.DRAWSCAPE_WEB_HOST;
  const rawBasePort =
    portFlag.value || process.env.DRAWSCAPE_WEB_PORT || process.env.PORT || DEFAULT_BASE_PORT;
  const basePort = readPort(rawBasePort);

  if (!basePort) {
    console.error(`Invalid dev server port: ${rawBasePort}`);
    process.exit(1);
  }

  const port = await findAvailablePort(basePort, hostname);
  const displayHost = hostname || "127.0.0.1";

  if (port !== basePort) {
    console.log(`Port ${basePort} is busy; starting on ${port} instead.`);
  }

  console.log(`Starting Drawscape Outreach web at http://${displayHost}:${port}`);

  const command = process.platform === "win32" ? "next.cmd" : "next";
  const child = spawn(
    command,
    ["dev", ...nextArgs, "--port", String(port), ...(hostname ? ["--hostname", hostname] : [])],
    {
      env: { ...process.env, PORT: String(port) },
      stdio: "inherit"
    }
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(`Could not start Next.js dev server: ${error.message}`);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
