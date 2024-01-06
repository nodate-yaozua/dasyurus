import log4js from "log4js"
import midi from "@julusian/midi"
import MIDIFile from "midifile"
import MIDIEvents from "midievents"
import Timer from "./timer"
import MidiUtil from "./midi-util"

const logger = log4js.getLogger()

export default class MidiPlayer {
  private midiEvents: any[] | null = null
  private midiOutput: midi.Output | null = null
  private stopRequested = false
  private cursor = 0

  private metronomeEnabled = false
  private timeDivision: number
  private timeSignatureEvents: any[]
  private timeSignatureCursor = -1
  private tempoEvents: any[]
  private tempoCursor = -1
  private nextBeatPlayTick = 0
  private nextBeatPlayTime = 0
  private nextBeatIndex = 0

  constructor(private data: MIDIFile, private timer: Timer, private restrictEvents: boolean) {
    this.timeDivision = this.data.header.getTicksPerBeat()
    this.midiEvents = this.data.getMidiEvents()
    this.timeSignatureEvents = MidiUtil.getEventsEx(this.data, MIDIEvents.EVENT_META, MIDIEvents.EVENT_META_TIME_SIGNATURE)
    this.tempoEvents = MidiUtil.getEventsEx(this.data, MIDIEvents.EVENT_META, MIDIEvents.EVENT_META_SET_TEMPO)
  }

  public start() {
    if (this.data == null) return

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
    while (time >= this.nextBeatPlayTime) this.onBeat()
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

  public setMetronomeEnabled(enabled: boolean) {
    this.metronomeEnabled = enabled
  }

  private onBeat() {
    if (this.metronomeEnabled) {
      if (this.nextBeatIndex == 0) {
        this.midiOutput?.sendMessage([0x90, 0x7f, 0x55])
        this.midiOutput?.sendMessage([0x80, 0x7f, 0x00])
      } else {
        this.midiOutput?.sendMessage([0x90, 0x78, 0x55])
        this.midiOutput?.sendMessage([0x80, 0x78, 0x00])
      }
    }

    // param3: 24, param4: 8
    const currentTimeSignatureEntry = this.timeSignatureCursor == -1 ? { param1: 4, param2: 2 } : this.timeSignatureEvents[this.timeSignatureCursor]
    const nextBeatPlayTick = this.nextBeatPlayTick + Math.floor(Math.pow(2, 2 - currentTimeSignatureEntry.param2) * this.timeDivision)
    const nextTimeSignaturePlayTick = this.timeSignatureCursor <= this.timeSignatureEvents.length - 2 ? this.timeSignatureEvents[this.timeSignatureCursor + 1].playTick : Infinity
    if (nextTimeSignaturePlayTick <= nextBeatPlayTick) {
      // signature change
      this.timeSignatureCursor++
      this.nextBeatPlayTick = nextTimeSignaturePlayTick
      this.nextBeatIndex = 0
    } else {
      this.nextBeatPlayTick = nextBeatPlayTick
      this.nextBeatIndex = (this.nextBeatIndex + 1) % currentTimeSignatureEntry.param1
    }

    // calc playTime
    while (this.tempoCursor + 1 < this.tempoEvents.length) {
      if (this.tempoEvents[this.tempoCursor + 1].playTick > this.nextBeatPlayTick) break
      this.tempoCursor++
    }
    const currentTempoEntry = this.tempoCursor == -1 ? { playTick: 0, playTime: 0, tempo: 500000 } : this.tempoEvents[this.tempoCursor]
    this.nextBeatPlayTime = currentTempoEntry.playTime + (this.nextBeatPlayTick - currentTempoEntry.playTick) / this.timeDivision * currentTempoEntry.tempo / 1000 // [tick] / [tick/beat] * [ns/beat/1000]
  }
}