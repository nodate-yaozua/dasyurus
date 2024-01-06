import log4js from "log4js"
import fs from "fs"
import AudioReceiver from "./audio-receiver"
import AudioSender from "./audio-sender"
import Controller from "./controller"
import MidiRecorderPlayer from "./midi-recorder-player"
import Page from "./page"
import config from "./configuration"

log4js.configure({
  appenders: {
    stdout: { type: "stdout" },
  },
  categories: {
    default: { appenders: ["stdout"], level: "info" }
  }
});

const logger = log4js.getLogger()
try {
  fs.accessSync(config.dataDir, fs.constants.R_OK | fs.constants.W_OK)
} catch (e) {
  logger.error(`Cannot access data directory: ${e}`)
  process.exit()
}

(async () => {
  const audioReceiver = new AudioReceiver()
  await audioReceiver.init()

  const audioSender = new AudioSender()
  await audioSender.init()

  const midiRecorderPlayer = new MidiRecorderPlayer()
  await midiRecorderPlayer.init()
  
  const controller = new Controller(audioReceiver, audioSender, midiRecorderPlayer)
  await controller.init()

  const page = new Page()
  await page.init()
})()
