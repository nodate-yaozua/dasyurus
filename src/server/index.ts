import log4js from "log4js"
import AudioReceiver from "./audio-receiver"
import AudioSender from "./audio-sender"
import Controller from "./controller"
import MidiRecorderPlayer from "./midi-recorder-player"
import Page from "./page"

log4js.configure({
  appenders: {
    stdout: { type: "stdout" },
    file: { type: "file", filename: "log.log" },
  },
  categories: {
    default: { appenders: ["stdout", "file"], level: "info" }
  }
});

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
