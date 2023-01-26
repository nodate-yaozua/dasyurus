import log4js from "log4js"
import midi from "midi"
import MIDIFile from "midifile"
import MIDIEvents from "midievents"

const logger = log4js.getLogger()

export default class MidiRecorder {
  private startTime = 0
  private rawTrackEvents: any[] = []
  private input!: midi.Input

  constructor(private data: MIDIFile) {
  }

  public start() {
    this.input = new midi.Input()

    this.input.on("message", (_, message) => {
      const time = performance.now() - this.startTime
      if (time < 0) return

      if (message[0] != 0x80 && message[0] != 0x90 && message[0] != 0xb0) return
      if (message[0] == 0xb0 && (message[1] != 0x40 && message[1] != 0x42 && message[1] != 0x43)) return // only pedals
      const type = MIDIEvents.EVENT_MIDI
      const subtype = message[0] >> 4
      const channel = 0
      const param1 = message[1]
      const param2 = message[2]
      this.rawTrackEvents.push({ playTime: time, type, subtype, channel, param1, param2 })
    })
    this.startTime = performance.now() + 100
    this.input.openPort(1)

    logger.info("MIDI recording started")
  }

  public stop() {
    this.input.closePort()
    logger.info("MIDI recording stopped")
  }

  public write() {
    // note, pedal
    const trackEvents: any[][] = [[], []]

    this.rawTrackEvents.forEach(e => {
      const target = e.subtype == MIDIEvents.EVENT_MIDI_NOTE_ON || e.subtype == MIDIEvents.EVENT_MIDI_NOTE_OFF ? trackEvents[0] : trackEvents[1]
      const lastTick = target.length > 0 ? target[target.length - 1].playTick : 0
      const playTick = Math.floor(e.playTime * 480 / 1000) // TODO
      target.push({ playTick, delta: playTick - lastTick, ...e })
    })
    trackEvents.forEach(e => {
      e.push({ delta: 0, type: MIDIEvents.EVENT_META, subtype: MIDIEvents.EVENT_META_END_OF_TRACK, length: 0 })
      const newTrackIndex = this.data.tracks.length
      this.data.addTrack(newTrackIndex)
      this.data.setTrackEvents(newTrackIndex, e)
    })
  }
}