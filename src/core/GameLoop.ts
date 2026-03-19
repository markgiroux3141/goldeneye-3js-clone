const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.25;

export class GameLoop {
  private rafId = 0;
  private prevTime = 0;
  private accumulator = 0;
  private running = false;

  constructor(
    private fixedUpdate: (dt: number) => void,
    private render: () => void
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.prevTime = performance.now() / 1000;
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now() / 1000;
    let frameTime = now - this.prevTime;
    this.prevTime = now;

    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }

    this.accumulator += frameTime;

    while (this.accumulator >= FIXED_DT) {
      this.fixedUpdate(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.render();

    this.rafId = requestAnimationFrame(this.tick);
  };
}
