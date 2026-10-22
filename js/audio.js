// Retro sound effects synthesised with the Web Audio API (no audio files needed).
// Browsers only allow audio after a user gesture, so unlock() is called on the first key press.

const Sfx = (() => {
  let ac = null;
  let muted = false;
  let rainNode = null;
  let out = null, volume = 1; // every effect goes through `out`, so the Options volume applies to all

  function unlock() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      out = ac.createGain();
      out.gain.value = volume;
      out.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function tone(freq, dur, { type = 'square', vol = 0.08, slide = null, delay = 0 } = {}) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, { vol = 0.15, delay = 0, freq = 1800 } = {}) {
    if (!ac || muted) return;
    const t0 = ac.currentTime + delay;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1.5;
    const gain = ac.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(out);
    src.start(t0);
  }

  return {
    unlock,
    toggleMute() { muted = !muted; if (rainNode) rainNode.gain.gain.value = muted ? 0 : 0.05; return muted; },
    get muted() { return muted; },
    get context() { return ac; },
    setVolume(v) { volume = v; if (out) out.gain.value = v; },

    start()    { tone(440, 0.08); tone(660, 0.08, { delay: 0.08 }); tone(880, 0.12, { delay: 0.16 }); },
    // Each snack in a combo plays a little higher
    pickup(combo = 1) { const k = 2 ** (Math.min(combo - 1, 10) * 2 / 12); tone(660 * k, 0.07); tone(990 * k, 0.1, { delay: 0.06 }); },
    comboBreak() { tone(500, 0.18, { slide: 220, type: 'triangle', vol: 0.07 }); },
    thud()     { tone(140, 0.12, { slide: 60, type: 'sine', vol: 0.2 }); noise(0.06, { freq: 600, vol: 0.12 }); },
    heartbeat(){ tone(70, 0.1, { type: 'sine', vol: 0.18 }); tone(62, 0.12, { type: 'sine', vol: 0.13, delay: 0.16 }); },
    crash()    { noise(0.35, { freq: 900, vol: 0.22 }); noise(0.2, { freq: 3200, vol: 0.1, delay: 0.05 }); tone(110, 0.2, { slide: 50, type: 'sine', vol: 0.18 }); [0.12, 0.2, 0.31].forEach(d => tone(1800 + Math.random() * 900, 0.04, { delay: d, vol: 0.04, type: 'triangle' })); },
    rummage()  { noise(0.09, { freq: 1300 + Math.random() * 900, vol: 0.07 }); },
    stir()     { tone(180, 0.35, { slide: 140, type: 'triangle', vol: 0.1 }); tone(150, 0.4, { slide: 120, type: 'triangle', vol: 0.08, delay: 0.35 }); noise(0.3, { freq: 600, vol: 0.05, delay: 0.1 }); }, // the owner mumbling and rolling over
    rustle()   { noise(0.06, { freq: 2200 + Math.random() * 800, vol: 0.035 }); }, // trotting through a knocked-over mess
    naughty()  { [784, 659, 988].forEach((f, i) => tone(f, 0.09, { delay: i * 0.08, type: 'square', vol: 0.06 })); }, // a cheeky little riff
    quack()    { [0, 0.18, 0.4].forEach(d => tone(520 + Math.random() * 60, 0.1, { delay: d, slide: 380, type: 'sawtooth', vol: 0.08 })); },
    slurp()    { noise(0.06, { freq: 900, vol: 0.06 }); tone(300, 0.06, { slide: 500, type: 'sine', vol: 0.05, delay: 0.03 }); },
    howl()     { tone(420, 0.5, { slide: 720, type: 'triangle', vol: 0.1 }); tone(720, 0.8, { slide: 520, type: 'triangle', vol: 0.09, delay: 0.5 }); },
    count()    { tone(1500, 0.02, { vol: 0.03, type: 'triangle' }); },
    golden()   { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.07, type: 'triangle', vol: 0.12 })); },
    sniff()    { noise(0.08); noise(0.08, { delay: 0.14 }); noise(0.1, { delay: 0.28 }); },
    bark()     { tone(520, 0.12, { slide: 260, vol: 0.1, type: 'sawtooth' }); tone(560, 0.14, { slide: 280, delay: 0.18, vol: 0.1, type: 'sawtooth' }); },
    tick()     { tone(1200, 0.03, { vol: 0.04 }); },
    zoomies()  { [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.06, { delay: i * 0.04, vol: 0.07 })); },
    hiss()     { noise(0.35, { freq: 4200, vol: 0.25 }); },
    distract() { tone(400, 0.15, { slide: 900, type: 'triangle', vol: 0.1 }); tone(900, 0.1, { delay: 0.16, type: 'triangle', vol: 0.1 }); },
    whistle()  { tone(1400, 0.15, { type: 'sine', vol: 0.08 }); tone(1100, 0.35, { delay: 0.18, slide: 1700, type: 'sine', vol: 0.08 }); },
    call()     { tone(660, 0.18, { type: 'triangle', vol: 0.12 }); tone(520, 0.32, { delay: 0.2, slide: 480, type: 'triangle', vol: 0.12 }); },
    woof()     { tone(480 + Math.random() * 80, 0.09, { slide: 240, vol: 0.09, type: 'sawtooth' }); noise(0.05, { freq: 900, vol: 0.08 }); },
    whimper()  { tone(950, 0.25, { slide: 650, type: 'sine', vol: 0.07 }); tone(900, 0.3, { delay: 0.3, slide: 560, type: 'sine', vol: 0.06 }); },
    splash()   { noise(0.3, { freq: 700, vol: 0.18 }); noise(0.2, { delay: 0.08, freq: 1600, vol: 0.08 }); },
    menu()     { tone(880, 0.04, { vol: 0.05, type: 'triangle' }); },
    squeak()   { tone(1400, 0.08, { slide: 2200, type: 'sine', vol: 0.08 }); tone(2000, 0.06, { delay: 0.09, slide: 1300, type: 'sine', vol: 0.06 }); },
    plop()     { tone(300, 0.12, { slide: 120, type: 'sine', vol: 0.12 }); },
    squelch()  { noise(0.18, { freq: 500, vol: 0.18 }); tone(160, 0.12, { slide: 90, type: 'sine', vol: 0.06 }); },
    chomp()    { noise(0.08, { freq: 2500, vol: 0.2 }); tone(200, 0.15, { slide: 80, type: 'square', vol: 0.08, delay: 0.05 }); },
    yelp()     { tone(1200, 0.18, { slide: 700, type: 'sawtooth', vol: 0.08 }); },
    poof()     { noise(0.25, { freq: 3000, vol: 0.08 }); [1047, 1319, 1568].forEach((f, i) => tone(f, 0.1, { delay: 0.05 + i * 0.05, type: 'triangle', vol: 0.06 })); },
    flutter()  { for (let i = 0; i < 4; i++) noise(0.03, { delay: i * 0.05, freq: 1800, vol: 0.05 }); },
    sprinkler(){ noise(0.9, { freq: 5000, vol: 0.05 }); },
    shake()    { for (let i = 0; i < 5; i++) noise(0.04, { delay: i * 0.06, freq: 2600, vol: 0.06 }); },
    brave()    { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, { delay: i * 0.09, type: 'triangle', vol: 0.11 })); },
    sting()    { tone(1800, 0.06, { vol: 0.1 }); this.yelp(); },
    buzz(vol = 0.03) { tone(220 + Math.random() * 20, 0.2, { type: 'sawtooth', vol }); },
    snakeHiss(){ noise(0.6, { freq: 6000, vol: 0.12 }); },
    // Rain: a soft looping wash of filtered noise
    startRain() {
      if (!ac || rainNode) return;
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1400;
      const gain = ac.createGain(); gain.gain.value = muted ? 0 : 0.05;
      src.connect(filter).connect(gain).connect(out); src.start();
      rainNode = { src, gain };
    },
    stopRain() { if (rainNode) { rainNode.src.stop(); rainNode = null; } },
    deny()     { tone(180, 0.15, { vol: 0.08 }); },
    happy()    { this.bark();[784, 988, 1175].forEach((f, i) => tone(f, 0.1, { delay: 0.4 + i * 0.08, type: 'triangle', vol: 0.08 })); },
  };
})();

// ---- Music: a little chiptune sequencer (lead, bass, arpeggio and noise drums) ----
// Each tune is a loop of 8-step bars (eighth notes). Notes are scheduled slightly ahead on the
// AudioContext clock so timing stays steady; switching tunes crossfades over about a second.
// N toggles the music on and off (remembered); M mutes everything.
const Music = (() => {
  const TUNES = {
    // Sunny outdoors: C major, bouncy
    sunny: { bpm: 120, lead: ['square', 0.035], bass: ['triangle', 0.09], arp: 0.012, drums: 'k h s h k h s h', bars: [
      ['E5 . G5 E5 C5 . D5 E5', 'C3 . G3 . C3 . G3 .', 'C4 E4 G4'],
      ['C5 . E5 C5 A4 . B4 C5', 'A2 . E3 . A2 . E3 .', 'A3 C4 E4'],
      ['A4 . C5 F5 E5 . D5 C5', 'F2 . C3 . F2 . C3 .', 'F3 A3 C4'],
      ['B4 . D5 G5 F5 E5 D5 .', 'G2 . D3 . G2 . B2 .', 'G3 B3 D4'],
      ['E5 G5 C6 . B5 G5 E5 .', 'C3 . G3 . C3 . G3 .', 'C4 E4 G4'],
      ['A5 . G5 E5 C5 . E5 .', 'A2 . E3 . A2 . E3 .', 'A3 C4 E4'],
      ['F5 E5 D5 C5 A4 . C5 D5', 'F2 . C3 . F2 . C3 .', 'F3 A3 C4'],
      ['B4 D5 G5 . G5 . . .', 'G2 . D3 . G2 . G2 .', 'G3 B3 D4'],
    ] },
    // Rainy: A minor, slower and wistful
    rain: { bpm: 84, lead: ['triangle', 0.06], bass: ['triangle', 0.08], arp: 0.01, drums: 'k . . . . . h .', bars: [
      ['A4 . . C5 E5 . . D5', 'A2 . . . E2 . . .', 'A3 C4 E4'],
      ['C5 . . A4 F4 . . .', 'F2 . . . C3 . . .', 'F3 A3 C4'],
      ['G4 . . C5 E5 . D5 C5', 'C3 . . . G2 . . .', 'C4 E4 G4'],
      ['B4 . . . G#4 . . .', 'E2 . . . B2 . . .', 'E3 G#3 B3'],
      ['E5 . . D5 C5 . . B4', 'A2 . . . E2 . . .', 'A3 C4 E4'],
      ['A4 . . C5 F5 . E5 .', 'F2 . . . C3 . . .', 'F3 A3 C4'],
      ['D5 . . F5 A4 . . .', 'D2 . . . A2 . . .', 'D3 F3 A3'],
      ['B4 . . G#4 E4 . . .', 'E2 . . . E2 . . .', 'E3 G#3 B3'],
    ] },
    // The dark garage: a low drone, creeping semitones and the odd eerie bell
    spooky: { bpm: 70, lead: ['sine', 0.05], bass: ['sawtooth', 0.025], arp: 0, drums: 'k . k . . . . .', creep: true, bars: [
      ['D6 . . . . . . .', 'D2 . . . D2 . . .', 'D3 . Eb3 . D3 . C#3 .'],
      ['. . . . Ab5 . . .', 'D2 . . . D2 . . .', 'D3 . Eb3 . D3 . C#3 .'],
      ['. . F5 . . . . .', 'Ab1 . . . Ab1 . . .', 'Ab2 . A2 . Ab2 . G2 .'],
      ['. . . . . . C#6 .', 'D2 . . . D2 . . .', 'D3 . Eb3 . E3 . Eb3 .'],
    ] },
    // Indoors (house, vet): cosy and a bit jazzy, F major sevenths with a walking bass
    cosy: { bpm: 100, lead: ['triangle', 0.055], bass: ['triangle', 0.085], arp: 0, comp: 0.018, drums: '. h . h . h . h', bars: [
      ['A4 . C5 . E5 . C5 .', 'F2 . A2 . C3 . E3 .', 'F3 A3 C4 E4'],
      ['F5 . E5 D5 C5 . A4 .', 'D2 . F2 . A2 . C3 .', 'D3 F3 A3 C4'],
      ['Bb4 . D5 . F5 . D5 C5', 'G2 . Bb2 . D3 . F3 .', 'G3 Bb3 D4 F4'],
      ['E5 . . G5 . E5 C5 .', 'C2 . E2 . G2 . Bb2 .', 'C3 E3 G3 Bb3'],
      ['C5 . A4 . C5 E5 F5 .', 'F2 . A2 . C3 . E3 .', 'F3 A3 C4 E4'],
      ['A5 . G5 F5 D5 . . .', 'D2 . F2 . A2 . C3 .', 'D3 F3 A3 C4'],
      ['G4 Bb4 D5 F5 E5 D5 C5 .', 'G2 . Bb2 . C3 . E3 .', 'G3 Bb3 D4 F4'],
      ['C5 . . . . . . .', 'F2 . C3 . F2 . . .', 'F3 A3 C4 E4'],
    ] },
    // Title and menus: G major, upbeat
    menu: { bpm: 132, lead: ['square', 0.03], bass: ['triangle', 0.08], arp: 0.01, drums: 'k h s h k k s h', bars: [
      ['B4 D5 G5 D5 B4 D5 G5 A5', 'G2 G3 G2 G3 G2 G3 G2 G3', 'G3 B3 D4'],
      ['B5 . A5 G5 E5 . G5 .', 'E2 E3 E2 E3 E2 E3 E2 E3', 'E3 G3 B3'],
      ['E5 G5 C6 G5 E5 G5 C6 B5', 'C3 C4 C3 C4 C3 C4 C3 C4', 'C4 E4 G4'],
      ['A5 . F#5 . D5 . A5 .', 'D3 D4 D3 D4 D3 D4 D3 D4', 'D4 F#4 A4'],
      ['B4 D5 G5 D5 B4 D5 G5 A5', 'G2 G3 G2 G3 G2 G3 G2 G3', 'G3 B3 D4'],
      ['B5 . D6 . B5 A5 G5 .', 'E2 E3 E2 E3 E2 E3 E2 E3', 'E3 G3 B3'],
      ['E5 G5 C6 . B5 . A5 G5', 'C3 C4 C3 C4 C3 C4 C3 C4', 'C4 E4 G4'],
      ['F#5 A5 D5 . G5 . . .', 'D3 D4 D3 D4 G2 . . .', 'D4 F#4 A4'],
    ] },
    // The ending (bedtime by the fire): the menu tune slowed right down into a music-box lullaby
    lullaby: { bpm: 58, lead: ['sine', 0.05], bass: ['triangle', 0.045], arp: 0, drums: '. . . . . . . .', bars: [
      ['B4 . D5 . G5 . D5 .', 'G2 . . . D3 . . .', 'G3 B3 D4'],
      ['B5 . . A5 G5 . E5 .', 'E2 . . . B2 . . .', 'E3 G3 B3'],
      ['E5 . G5 . C6 . B5 .', 'C3 . . . G3 . . .', 'C4 E4 G4'],
      ['A5 . . F#5 D5 . . .', 'D3 . . . A2 . . .', 'D4 F#4 A4'],
      ['B4 . D5 . G5 . A5 .', 'G2 . . . D3 . . .', 'G3 B3 D4'],
      ['B5 . D6 . B5 A5 G5 .', 'E2 . . . B2 . . .', 'E3 G3 B3'],
      ['E5 . C6 . B5 . A5 .', 'C3 . . . D3 . . .', 'C4 E4 G4'],
      ['G5 . . . . . . .', 'G2 . . . . . . .', 'G3 B3 D4'],
    ] },
    // The house at night: a hushed music-box lullaby, so you tiptoe
    night: { bpm: 66, lead: ['sine', 0.045], bass: ['triangle', 0.05], arp: 0, drums: '. . . . . . . .', bars: [
      ['E5 . G5 . B5 . G5 .', 'A2 . . . E3 . . .', 'A3 C4 E4'],
      ['A5 . . G5 E5 . . .', 'F2 . . . C3 . . .', 'F3 A3 C4'],
      ['D5 . F5 . A5 . F5 .', 'D2 . . . A2 . . .', 'D3 F3 A3'],
      ['G#5 . . . E5 . . .', 'E2 . . . B2 . . .', 'E3 G#3 B3'],
      ['C6 . B5 . A5 . E5 .', 'A2 . . . E3 . . .', 'A3 C4 E4'],
      ['F5 . E5 . D5 . C5 .', 'F2 . . . C3 . . .', 'F3 A3 C4'],
      ['B4 . D5 . G#5 . . .', 'E2 . . . E2 . . .', 'E3 G#3 B3'],
      ['A5 . . . . . . .', 'A2 . . . . . . .', 'A3 C4 E4'],
    ] },
    // Menace Run: high-BPM chiptune chaos, E minor, a pumping octave bass and a racing lead
    menace: { bpm: 176, lead: ['square', 0.032], bass: ['square', 0.04], arp: 0.014, drums: 'k h s h k k s k', bars: [
      ['E5 G5 B5 G5 E5 G5 B5 E6', 'E2 E3 E2 E3 E2 E3 E2 E3', 'E4 G4 B4'],
      ['D6 B5 G5 B5 D6 . B5 .', 'G2 G3 G2 G3 G2 G3 G2 G3', 'G4 B4 D5'],
      ['C6 . A5 E5 A5 C6 E6 C6', 'C3 C4 C3 C4 C3 C4 C3 C4', 'C4 E4 G4'],
      ['B5 . F#5 D#5 F#5 . B5 .', 'B2 B3 B2 B3 B2 B3 B2 B3', 'B3 D#4 F#4'],
      ['E5 E5 G5 E5 B5 E5 G5 E5', 'E2 E3 E2 E3 E2 E3 E2 E3', 'E4 G4 B4'],
      ['A5 . G5 . F#5 . G5 A5', 'A2 A3 A2 A3 A2 A3 A2 A3', 'A3 C4 E4'],
      ['G5 B5 D6 B5 G5 B5 D6 G6', 'C3 C4 C3 C4 D3 D4 D3 D4', 'C4 E4 G4'],
      ['F#6 . D#6 . B5 . . .', 'B2 B3 B2 B3 B2 . B1 .', 'B3 D#4 F#4'],
    ] },
    // Mini-games: a tense, driving loop
    tense: { bpm: 150, lead: ['square', 0.02], bass: ['square', 0.03], arp: 0.014, drums: 'k h s h k k s h', bars: [
      ['. . . . . . . .', 'A2 A2 A3 A2 A2 A2 A3 A2', 'E5 A5 C6'],
      ['. . . . . . . .', 'A2 A2 A3 A2 G2 G2 G3 G2', 'E5 A5 C6'],
      ['. . . . . . . .', 'F2 F2 F3 F2 F2 F2 F3 F2', 'F5 A5 C6'],
      ['. . . . . . . .', 'E2 E2 E3 E2 E2 E2 G#2 B2', 'E5 G#5 B5'],
    ] },
  };
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const freq = n => { const m = n.match(/^([A-G][#b]?)(\d)$/); return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
  TUNES.menaceFast = { ...TUNES.menace, bpm: 200 }; // the last few seconds of a Menace Run: faster still
  // Pre-split every bar into step arrays
  for (const tune of Object.values(TUNES)) tune.steps = tune.bars.map(([lead, bass, chord]) => ({ lead: lead.split(' '), bass: bass.split(' '), chord: chord.split(' ') }));

  let enabled = true;
  try { enabled = localStorage.getItem('schmoopQuest.music') !== 'off'; } catch (e) { /* storage unavailable */ }
  let muted = false, current = null, master = null, timer = null, ducked = false, volume = 1;

  const ctx = () => Sfx.context;
  // One playing tune: its own gain node (so two can crossfade), a step counter and the next note time
  function startTune(name) {
    const ac = ctx(), tune = TUNES[name];
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, ac.currentTime + 1);
    gain.connect(master);
    return { name, tune, gain, step: 0, next: ac.currentTime + 0.1 };
  }
  function stopTune(p) {
    if (!p) return;
    const ac = ctx();
    p.gain.gain.cancelScheduledValues(ac.currentTime);
    p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), ac.currentTime);
    p.gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.9);
    setTimeout(() => p.gain.disconnect(), 1200);
  }
  function voice(p, type, f, t0, dur, vol) {
    const ac = ctx(), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type; osc.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(p.gain);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  let noiseBuf = null;
  function drum(p, kind, t0) {
    const ac = ctx();
    if (kind === 'k') { // kick: a quick falling sine
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.frequency.setValueAtTime(150, t0); osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
      g.gain.setValueAtTime(0.12, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      osc.connect(g).connect(p.gain); osc.start(t0); osc.stop(t0 + 0.16);
      return;
    }
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf;
    f.type = kind === 'h' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'h' ? 7000 : 1800;
    const len = kind === 'h' ? 0.03 : 0.1;
    g.gain.setValueAtTime(kind === 'h' ? 0.025 : 0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    src.connect(f).connect(g).connect(p.gain); src.start(t0); src.stop(t0 + len + 0.02);
  }
  // How many steps a note lasts: itself plus the rests that follow it (up to 4)
  const holdOf = (row, i) => { let n = 1; while (n < 4 && row[(i + n) % row.length] === '.') n++; return n; };
  function schedule(p) {
    const ac = ctx(), tune = p.tune, stepDur = 60 / tune.bpm / 2;
    while (p.next < ac.currentTime + 0.2) {
      const bar = tune.steps[Math.floor(p.step / 8) % tune.steps.length], i = p.step % 8, t0 = p.next;
      const L = bar.lead[i], B = bar.bass[i];
      if (L && L !== '.') voice(p, tune.lead[0], freq(L), t0, stepDur * holdOf(bar.lead, i) * 0.95, tune.lead[1]);
      if (B && B !== '.') voice(p, tune.bass[0], freq(B), t0, stepDur * holdOf(bar.bass, i) * 0.9, tune.bass[1]);
      if (tune.creep) { const c = bar.chord[i]; if (c && c !== '.') voice(p, 'triangle', freq(c), t0, stepDur * 1.8, 0.03); }
      else if (tune.arp) voice(p, 'square', freq(bar.chord[i % bar.chord.length]) * 2, t0, stepDur * 0.7, tune.arp);
      if (tune.comp && (i === 3 || i === 7)) for (const c of bar.chord) voice(p, 'triangle', freq(c) * 2, t0, stepDur * 0.9, tune.comp);
      const d = tune.drums.split(' ')[i];
      if (d && d !== '.') drum(p, d, t0);
      p.step++;
      p.next += stepDur;
    }
  }
  function tick() { if (current) schedule(current); }
  function applyLevel() {
    const ac = ctx();
    if (!master || !ac) return;
    const v = !enabled || muted || volume <= 0 ? 0.0001 : (ducked ? 0.18 : 0.5) * volume;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(v, ac.currentTime, 0.15);
  }

  return {
    unlock() {
      const ac = ctx();
      if (!ac || master) return;
      master = ac.createGain();
      master.gain.value = 0.0001;
      master.connect(ac.destination);
      applyLevel();
      timer = setInterval(tick, 50);
    },
    // Plays a tune (does nothing if it's already playing); null stops the music
    play(name) {
      if (!master || (current && current.name === name) || (!current && !name)) return;
      stopTune(current);
      current = name ? startTune(name) : null;
    },
    duck(on) { if (on !== ducked) { ducked = on; applyLevel(); } },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem('schmoopQuest.music', enabled ? 'on' : 'off'); } catch (e) { /* storage unavailable */ }
      applyLevel();
      return enabled;
    },
    setMuted(m) { muted = m; applyLevel(); },
    setVolume(v) { volume = v; applyLevel(); },
    get enabled() { return enabled; },
  };
})();
