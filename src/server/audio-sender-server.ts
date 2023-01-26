import { PA_SAMPLE_FORMAT, PulseAudio, RecordStream } from "pulseaudio.js"
import log4js from "log4js"
import { WebSocketServer } from "ws"
import config from "./configuration"

const logger = log4js.getLogger()

export default class AudioSenderServer {
  private server!: WebSocketServer
  private pulseAudio: PulseAudio | null = null
  private recordStream: RecordStream | null = null

  constructor() {
  }

  public async start() {
    this.server = new WebSocketServer({ port: config.audioServerPort })
    logger.info(`Audio Sender server started. Port ${config.audioServerPort}`)
    this.server.on("connection", (socket, request) => {
      logger.info(`New connection to Audio Sender server: ${request.socket.remoteAddress}`)
      this.updateState()
      socket.on("close", _ => {
        logger.info(`Closed connection to Audio Sender server: ${request.socket.remoteAddress}`)
        this.updateState()
      })
    })
  }
  
  // TODO: 処理中に新しく来た場合
  private async updateState() {
    if (this.server.clients.size > 0 && this.pulseAudio == null)
    {
      this.pulseAudio = new PulseAudio("Dasyurus")
      await this.pulseAudio.connect()

      this.recordStream = await this.pulseAudio.createRecordStream({ 
        sampleSpec: { rate: 44100, format: PA_SAMPLE_FORMAT.S16LE, channels: 2 },
        fragmentSize: 16384,
        adjustLatency: true,
      })
      this.recordStream.on("data", ev => {
        this.server.clients.forEach(client => client.send(ev))
      })
      logger.info("Audio sender started")
    }
    if (this.server.clients.size == 0 && this.pulseAudio != null) {
      this.recordStream!.destroy()
      this.recordStream = null
      await this.pulseAudio.disconnect()
      this.pulseAudio = null
      logger.info("Audio sender stopped")
    }
  }
}