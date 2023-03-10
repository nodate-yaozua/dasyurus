/** Declaration file generated by dts-gen */

declare module "midifile" {
    export = midifile;
}

declare class midifile {
    header: midifile.Header
    tracks: midifile.Track[]

    constructor(buffer?: any, strictMode?: any);

    addTrack(index: any): void;

    deleteTrack(index: any): void;

    getContent(): any;

    getEvents(type: any, subtype: any): any;

    getLyrics(): any;

    getMidiEvents(): any;

    getTrackEvents(index: any): any;

    setTrackEvents(index: any, events: any): void;

}

declare namespace midifile {
    class Header {
        constructor(buffer: any);

        getFormat(): any;

        getSMPTEFrames(): any;

        getTickResolution(tempo?: any): any;

        getTicksPerBeat(): any;

        getTicksPerFrame(): any;

        getTimeDivision(): any;

        getTracksCount(): any;

        setFormat(format: any): void;

        setSMTPEDivision(smpteFrames: any, ticksPerFrame: any): void;

        setTicksPerBeat(ticksPerBeat: any): void;

        setTracksCount(n: any): any;

        static FRAMES_PER_SECONDS: number;

        static HEADER_LENGTH: number;

        static TICKS_PER_BEAT: number;

    }

    class Track {
        constructor(buffer: any, start: any);

        getTrackContent(): any;

        getTrackLength(): any;

        setTrackContent(dataView: any): void;

        setTrackLength(trackLength: any): any;

        static HDR_LENGTH: number;

    }

}

