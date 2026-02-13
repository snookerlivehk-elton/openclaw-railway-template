import express from "express"
import fs from "fs"
import path from "path"
import process from "process"
const app = express()
app.use(express.json({ limit: "2mb" }))
app.use(express.static(path.join(process.cwd(), "public")))
const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH || null
const memoryPath =
  process.env.MEMORY_PATH ||
  (volumePath ? path.join(volumePath, "memory.json") : path.join(path.resolve(path.join(process.cwd(), "data")), "memory.json"))
const ensureDir = (p) => {
  const dir = path.dirname(p)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
const loadMemory = () => {
  try {
    if (fs.existsSync(memoryPath)) {
      const raw = fs.readFileSync(memoryPath, "utf-8")
      return raw ? JSON.parse(raw) : {}
    }
    return {}
  } catch {
    return {}
  }
}
const saveMemory = (obj) => {
  ensureDir(memoryPath)
  fs.writeFileSync(memoryPath, JSON.stringify(obj), "utf-8")
}
const bootstrapMemory = async () => {
  if (fs.existsSync(memoryPath)) return
  ensureDir(memoryPath)
  const src = process.env.OLD_MEMORY_URL || ""
  if (src) {
    try {
      const res = await fetch(src)
      if (res.ok) {
        const text = await res.text()
        const obj = JSON.parse(text)
        saveMemory(obj)
        return
      }
    } catch {}
  }
  saveMemory({})
}
app.get("/health", (_, res) => {
  res.status(200).send("ok")
})
app.get("/favicon.ico", (_, res) => {
  res.status(204).end()
})
app.get("/", (_, res) => {
  res
    .status(200)
    .send(
      [
        "OpenClaw Railway Template",
        "",
        "Endpoints:",
        "GET  /health",
        "GET  /memory",
        "POST /memory",
        "POST /memory/import",
        "POST /chat"
      ].join("\n")
    )
})
app.get("/memory", (_, res) => {
  const m = loadMemory()
  res.status(200).json(m)
})
app.post("/memory", (req, res) => {
  const body = req.body || {}
  saveMemory(body)
  res.status(200).json({ ok: true })
})
app.post("/memory/import", async (req, res) => {
  const url = (req.body && req.body.url) || ""
  if (!url) {
    res.status(400).json({ error: "url missing" })
    return
  }
  try {
    const r = await fetch(url)
    if (!r.ok) {
      const t = await r.text()
      res.status(r.status).json({ error: t })
      return
    }
    const txt = await r.text()
    const obj = JSON.parse(txt)
    saveMemory(obj)
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})
app.post("/chat", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY || ""
  if (!apiKey) {
    res.status(400).json({ error: "OPENROUTER_API_KEY missing" })
    return
  }
  const model = process.env.OPENROUTER_MODEL || "openrouter/anthropic/claude-3.5-sonnet"
  const body = req.body || {}
  const messages = Array.isArray(body.messages) ? body.messages : []
  const mem = loadMemory()
  const systemPrefix = body.system || ""
  const system = `${systemPrefix}` + (Object.keys(mem).length ? ` Memory: ${JSON.stringify(mem)}` : "")
  const finalMessages = system ? [{ role: "system", content: system }, ...messages] : messages
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "OpenClaw Railway Template"
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 1024
      })
    })
    if (!r.ok) {
      const t = await r.text()
      res.status(r.status).json({ error: t })
      return
    }
    const data = await r.json()
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})
const port = Number(process.env.PORT || 3000)
bootstrapMemory().then(() => {
  app.listen(port, () => {})
})
