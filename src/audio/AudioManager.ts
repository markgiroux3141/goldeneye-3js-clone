export class AudioManager {
  private context: AudioContext;
  private buffers = new Map<string, AudioBuffer>();
  private gainNode: GainNode;

  constructor() {
    this.context = new AudioContext();
    this.gainNode = this.context.createGain();
    this.gainNode.connect(this.context.destination);
  }

  async loadSound(url: string): Promise<void> {
    if (this.buffers.has(url)) return;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.buffers.set(url, audioBuffer);
  }

  play(url: string, volume = 1.0): void {
    // Resume context if suspended (browser autoplay policy)
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    const buffer = this.buffers.get(url);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.gainNode);

    source.start();
  }

  dispose(): void {
    this.context.close();
  }
}
