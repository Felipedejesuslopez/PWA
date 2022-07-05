export class Visualizer {
  constructor(player, canvasEl) {
    this.player = player;
    this.canvasEl = canvasEl;
    this.ctx = this.canvasEl.getContext('2d');
    this.drawLoop = null;
  }

  reinit() {
    this.stop();

    // Create the audio context.
    // This context will not have any destination, only a source and an analyser.
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Set the source to the player audio stream.
    // Note that this will fail for cross-origin audio.
    let source = null;
    try {
      const stream = this.player.audio.captureStream();
      source = audioCtx.createMediaStreamSource(stream);
    } catch (e) {
      console.log('Could not create audio stream');
    }

    // Attach an analyser node.
    this.analyser = audioCtx.createAnalyser();
    this.analyser.fftSize = 256;

    source.connect(this.analyser);
  }

  start() {
    this.frameIndex = 0;
    this.reinit();

    this.resize();
    this.draw();

    addEventListener('resize', this.start.bind(this), { once: true });
  }

  resize() {
    this.canvasEl.width = window.innerWidth;
    this.canvasEl.height = window.innerHeight;
  }

  stop() {
    cancelAnimationFrame(this.drawLoop);
  }

  draw(ms = 0) {
    this.drawLoop = requestAnimationFrame(this.draw.bind(this));
    this.frameIndex++;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const W = this.canvasEl.width;
    const H = this.canvasEl.height;

    // Draw a trail.
    const moveOffset = 10;
    this.ctx.drawImage(this.canvasEl, 0, 0, W, H, 0, moveOffset, W, H);

    // Don't entirely clear the screen to get some motion blur.
    this.ctx.fillStyle = '#00000011';
    this.ctx.fillRect(0, 0, W, H);

    if ((this.frameIndex % 2) !== 0) {
      return;
    }

    // Draw the new line.
    this.ctx.save();
    this.ctx.translate(W / 2, -H / 2);

    this.ctx.strokeStyle = `hsl(${ms / 300}, 90%, 70%)`;
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();

    const length = dataArray.length;
    let lastY = 0;
    let lastX = 0;

    for (let i = 0; i < length; i += 2) {
      // Mirror image.
      const index = i < length / 2 ? i : length - 1 - i;

      const x = (i / length - .5) * W;
      const y = (1 - dataArray[index] / 256) * H;
      const cX = (lastX + x) / 2;
      const cY = (lastY + y) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.quadraticCurveTo(lastX, lastY, cX, cY);
      }

      lastX = x;
      lastY = y;
    }

    this.ctx.stroke();
    this.ctx.restore();
  }
}
