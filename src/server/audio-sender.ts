import AudioSenderServer from "./audio-sender-server"

export default class AudioSender {
  server: AudioSenderServer = new AudioSenderServer()

  public async init() {
    await this.server.start()
  }
}