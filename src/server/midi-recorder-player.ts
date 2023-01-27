import fs from "fs"
import config from "./configuration"
import log4js from "log4js"
import MidiPlayer from "./midi-player"
import MidiRecorder from "./midi-recorder"
import MIDIFile from "midifile"
import MIDIEvents from "midievents"

const logger = log4js.getLogger()

export default class MidiRecorderPlayer {
  private midiRecorder: MidiRecorder | null = null
  private midiPlayer: MidiPlayer | null = null
  private currentFilename: string | null = null
  private currentMidiData: MIDIFile | null = null

  public async init() {
  }

  public isRecording() { return this.midiRecorder != null }
  public isPlaying() { return this.midiRecorder == null && this.midiPlayer != null }
  public isProcessing() { return this.midiRecorder != null || this.midiPlayer != null }

  public async startRecording(appendFilename: string | null): Promise<boolean> {
    if (this.isProcessing()) return false

    if (appendFilename != null) {
      this.currentMidiData = await this.loadFile(appendFilename)
      const appendMatch = appendFilename.match(/^(.*)-append-(\d+)\.mid$/)
      let baseName: string
      let appendNum: number
      if (appendMatch) {
        baseName = appendMatch[1]
        appendNum = Number(appendMatch[2]) + 1
      } else {
        baseName = appendFilename.slice(0, appendFilename.length - 4)
        appendNum = 1
      }
      while (true) {
        this.currentFilename = `${baseName}-append-${appendNum}.mid`
        if (this.fileExists(this.currentFilename)) appendNum++
        else break
      }
    } else {
      this.currentMidiData = this.createEmptyMidiData()
      this.currentFilename = this.getDefaultFilename()
    }
    this.savePlaceholderFile(this.currentFilename)

    this.midiPlayer = new MidiPlayer(this.currentMidiData, true)
    this.midiRecorder = new MidiRecorder(this.currentMidiData)
    this.midiPlayer.start()
    this.midiRecorder.start()
    return true
  }

  public async stopRecording(): Promise<string | null> {
    if (!this.isRecording()) return null
    if (this.midiRecorder == null) return null

    this.midiPlayer?.stop()
    this.midiRecorder.stop()
    this.midiRecorder.write()
    this.midiPlayer = null
    this.midiRecorder = null
    const filename = this.currentFilename!
    const midiData = this.currentMidiData!
    this.currentFilename = null
    this.currentMidiData = null
    await this.saveFile(filename, midiData)
    return filename
  }

  public async startPlaying(filename: string): Promise<boolean> {
    if (this.midiRecorder != null) return false
    if (this.midiPlayer != null) await this.stopPlaying()

    const data = await this.loadFile(filename)

    this.midiPlayer = new MidiPlayer(data, true)
    this.midiPlayer.start()
    return true
  }

  public async stopPlaying() {
    if (this.midiPlayer == null) return

    this.midiPlayer.stop()
    this.midiPlayer = null
    this.currentFilename = null
    this.currentMidiData = null
  }

  private createEmptyMidiData() {
    const result = new MIDIFile()
    result.header.setFormat(1)
    result.header.setTicksPerBeat(480)

    const conductorTrackEvents: any[] = []
    conductorTrackEvents.push({ delta: 0, type: MIDIEvents.EVENT_META, subtype: MIDIEvents.EVENT_META_SET_TEMPO, length: 3, tempo: 1000000 }) // 60BPM
    conductorTrackEvents.push({ delta: 0, type: MIDIEvents.EVENT_META, subtype: MIDIEvents.EVENT_META_END_OF_TRACK, length: 0 })
    result.setTrackEvents(0, conductorTrackEvents)

    return result
  }

  private fileExists(filename: string) {
    const inPath = config.midiDataDir + "/" + filename
    return fs.existsSync(inPath)
  }

  private async loadFile(filename: string) {
    logger.info(`Reading MIDI file from: ${filename}`)
    const inPath = config.midiDataDir + "/" + filename
    const file = await fs.promises.readFile(inPath)
    return new MIDIFile(file)
  }

  private async savePlaceholderFile(filename: string) {
    const outPath = config.midiDataDir + "/" + filename
    await fs.promises.writeFile(outPath, new Uint8Array(0))
    logger.info(`Placeholder MIDI file written to: ${filename}`)
  }

  private async saveFile(filename: string, data: MIDIFile) {
    const outPath = config.midiDataDir + "/" + filename
    await fs.promises.writeFile(outPath, new Uint8Array(data.getContent()))
    logger.info(`MIDI file written to: ${filename}`)
  }

  private getDefaultFilename() {
    const date = new Date()
    const year = date.getFullYear()
    const month = (date.getMonth() + 1)
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}-${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}${String(second).padStart(2, "0")}.mid`
  }

  public async listFiles(): Promise<string[]> {
    const files = await fs.promises.readdir("data/midi/")
    return files.filter(e => e.endsWith(".mid"))
  }
}