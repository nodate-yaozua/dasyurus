import log4js from "log4js"
import midi from "midi"
import MIDIFile from "midifile"
import MIDIEvents from "midievents"
import Timer from "./timer"

const logger = log4js.getLogger()

export default class MidiPlayer {
  private midiEvents: any[] | null = null
  private midiOutput: midi.Output | null = null
  private stopRequested = false
  private cursor = 0

  constructor(private data: MIDIFile, private timer: Timer, private restrictEvents: boolean) {
  }

  public start() {
    if (this.data == null) return

    this.midiEvents = this.data.getMidiEvents()
    this.midiOutput = new midi.Output()
    this.midiOutput.openPort(1)

    const loop = () => {
      if (this.stopRequested) return
      this.tick()
      setImmediate(loop)
    }
    loop()

    logger.info(`MIDI playing started`)
  }

  public stop() {
    this.stopRequested = true
    this.midiOutput?.sendMessage([0xb0, 0x79, 0x00])
    this.midiOutput?.sendMessage([0xb0, 0x7b, 0x00])
    this.midiOutput?.sendMessage([0xb1, 0x79, 0x00])
    this.midiOutput?.sendMessage([0xb1, 0x7b, 0x00])
    this.midiOutput?.sendMessage([0xb2, 0x79, 0x00])
    this.midiOutput?.sendMessage([0xb2, 0x7b, 0x00])
    this.midiOutput?.closePort()

    logger.info("MIDI playing stopped")
  }

  private tick() {
    if (this.midiOutput == null) return
    if (this.midiEvents == null) return

    const time = this.timer.next()
    while (this.cursor < this.midiEvents.length) {
      const event = this.midiEvents[this.cursor]
      if (event.playTime > time) break
      let shouldSend = true
      if (this.restrictEvents) {
        if (event.subtype != MIDIEvents.EVENT_MIDI_NOTE_ON && event.subtype != MIDIEvents.EVENT_MIDI_NOTE_OFF && event.subtype != MIDIEvents.EVENT_MIDI_CONTROLLER) shouldSend = false
        if (event.subtype == MIDIEvents.EVENT_MIDI_CONTROLLER && (event.param1 != 0x40 && event.param1 != 0x42 && event.param1 != 0x43)) shouldSend = false
      }
      if (shouldSend) {
        const m0 = (event.subtype << 4) | event.channel
        const m1 = event.param1
        const m2 = event.param2
        this.midiOutput.sendMessage([m0, m1, m2])
      }
      this.cursor++
    }
  }
}