import express, { Express } from "express"
import log4js from "log4js"
import config from "./configuration"

const logger = log4js.getLogger()

export default class PageServer {
  private server!: Express

  constructor() {
  }

  public async start() {
    this.server = express()
    this.server.use(express.static("dist/client"))
    this.server.use((req, res, next) => {
      logger.log(`Page request: ${req.method} ${req.url} -> ${res.statusCode}`)
      next()
    })
    this.server.listen(config.pageServerPort)
    logger.info(`Page server started. Port ${config.pageServerPort}`)
  }
}