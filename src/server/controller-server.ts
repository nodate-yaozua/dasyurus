import log4js from "log4js"
import { WebSocketServer } from "ws"
import config from "./configuration"
import { ControllerInterface } from "./controller"

const logger = log4js.getLogger()

export default class ControllerServer {
  private server!: WebSocketServer
  constructor(private controllerInterface: ControllerInterface) {
  }

  public start() {
    this.server = new WebSocketServer({ port: config.controllerServerPort })
    logger.info(`Controller server started. Port ${config.controllerServerPort}`)
    this.server.on("connection", (socket, request) => {
      logger.info(`New connection to Controller server: ${request.socket.remoteAddress}`)
      socket.on("close", _ => {
        logger.info(`Closed connection to Controller server: ${request.socket.remoteAddress}`)
        if (this.server.clients.size == 0) {
          this.controllerInterface.flushActions()
        }
      })

      const send = (data: object) => socket.send(JSON.stringify(data))

      socket.on("message", async (data, isBinary) => {
        if (isBinary) return
        let parsedData: any
        try { parsedData = JSON.parse(data.toString()) } catch { return }
        logger.debug(parsedData)

        switch (parsedData.type) {
          case "list-connected-bluetooth-devices":
            send({ type: "list-connected-bluetooth-devices", result: await this.controllerInterface.listConnectedBluetoothDevices() })
            break
          case "list-midi-files":
            send({ type: "list-midi-files", result: await this.controllerInterface.listMidiFiles() })
            break
          case "start-midi-recording":
            send({ type: "start-midi-recording", result: await this.controllerInterface.startMidiRecording(parsedData.params?.appendFilename) })
            break
          case "stop-midi-recording":
            send({ type: "stop-midi-recording", result: await this.controllerInterface.stopMidiRecording() })
            break
          case "start-midi-playing":
            send({ type: "start-midi-playing", result: await this.controllerInterface.startMidiPlaying(parsedData.params?.filename) })
            break
          case "stop-midi-playing":
            send({ type: "stop-midi-playing", result: await this.controllerInterface.stopMidiPlaying() })
            break
        }
      })
    })
  }
}