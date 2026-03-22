#!/usr/bin/env node
/**
 * Setup automático - executa sem perguntas.
 * Uso: node scripts/setup.mjs
 */
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: root,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, CI: "1", npm_config_yes: "true" },
      ...opts,
    })
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))))
  })
}

async function main() {
  console.log("\n[1/3] Sincronizando banco...")
  await run("npx", ["prisma", "db", "push"])
  console.log("\n[2/3] Populando dados iniciais...")
  await run("npx", ["tsx", "prisma/seed.ts"])
  console.log("\n[3/3] Iniciando servidor...")
  await run("npx", ["next", "dev"])
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
