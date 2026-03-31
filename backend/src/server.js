import express from "express"
import http from "http"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

process.on("uncaughtException", (err) => {
  console.error("💥 UNCAUGHT EXCEPTION")
  console.error(err.stack || err)
})

process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED REJECTION")
  console.error(reason)
})

process.on("exit", (code) => {
  console.log("🚪 Process exited with code:", code)
})
import { createApolloServer } from "./configs/apollo.js"
import { expressMiddleware } from "@as-integrations/express5"
import bulkPlayersRouter from "./routes/bulkPlayers.js"

import connectDB from "./configs/mongodb.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootEnvPath = path.resolve(__dirname, "../../.env")
dotenv.config({ path: rootEnvPath })


const app = express()
const httpServer = http.createServer(app)
const PORT = process.env.PORT || 4000
const host = process.env.IP_ADDRESS || "0.0.0.0"
const publicHost = process.env.IP_ADDRESS || "localhost"
const frontendOrigin = process.env.FRONTEND_ORIGIN || `http://${publicHost}:5173`
const configuredOrigins = frontendOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
const localNetworkOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/

const isAllowedOrigin = (origin) => {
  if (!origin) {
    // Allow non-browser clients (curl, server-to-server requests)
    return true
  }

  if (configuredOrigins.includes(origin)) {
    return true
  }

  return localNetworkOriginPattern.test(origin)
}

const start = async () => {
  await connectDB()

const server = createApolloServer(httpServer)
  await server.start()

  app.use(
    "/",
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true)
          return
        }

        callback(new Error(`Not allowed by CORS: ${origin}`))
      },
      credentials: true,
    }),
    express.json(),
    cookieParser(),
  )

  // REST API routes
  app.use('/api/players', bulkPlayersRouter)

  // GraphQL route
  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req, res }) => ({
        req,
        res,
      }),
    }),
  )

  httpServer.listen(PORT, host, () => {
    console.log(`🚀 GraphQL ready at http://${publicHost}:${PORT}/graphql`)
  })
}

start().catch((err) => {
  console.error("💥 Startup failed:", err)
  process.exit(1)
})