import WebServer from "./page-server"

export default class Page {
  server: WebServer = new WebServer()

  public async init() {
    await this.server.start()
  }
}