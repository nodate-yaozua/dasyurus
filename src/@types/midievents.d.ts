/** Declaration file generated by dts-gen */

declare module "midievents" {
    export = midievents;
}

declare function midievents(): void;

declare namespace midievents {
    const EVENT_DIVSYSEX: number;

    const EVENT_META: number;

    const EVENT_META_COPYRIGHT_NOTICE: number;

    const EVENT_META_CUE_POINT: number;

    const EVENT_META_END_OF_TRACK: number;

    const EVENT_META_INSTRUMENT_NAME: number;

    const EVENT_META_KEY_SIGNATURE: number;

    const EVENT_META_LYRICS: number;

    const EVENT_META_MARKER: number;

    const EVENT_META_MIDI_CHANNEL_PREFIX: number;

    const EVENT_META_SEQUENCER_SPECIFIC: number;

    const EVENT_META_SEQUENCE_NUMBER: number;

    const EVENT_META_SET_TEMPO: number;

    const EVENT_META_SMTPE_OFFSET: number;

    const EVENT_META_TEXT: number;

    const EVENT_META_TIME_SIGNATURE: number;

    const EVENT_META_TRACK_NAME: number;

    const EVENT_MIDI: number;

    const EVENT_MIDI_CHANNEL_AFTERTOUCH: number;

    const EVENT_MIDI_CONTROLLER: number;

    const EVENT_MIDI_NOTE_AFTERTOUCH: number;

    const EVENT_MIDI_NOTE_OFF: number;

    const EVENT_MIDI_NOTE_ON: number;

    const EVENT_MIDI_PITCH_BEND: number;

    const EVENT_MIDI_PROGRAM_CHANGE: number;

    const EVENT_SYSEX: number;

    const MIDI_1PARAM_EVENTS: number[];

    const MIDI_2PARAMS_EVENTS: number[];

    function createParser(stream: any, startAt: any, strictMode: any): any;

    function getRequiredBufferLength(events: any): any;

    function writeToTrack(events: any, destination: any, strictMode: any): void;

}
