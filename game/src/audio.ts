export class Ambience {
  context?: AudioContext;
  gain?: GainNode;
  enabled = false;
  interval?: ReturnType<typeof setInterval>;
  async toggle() {
    if (!this.context) {
      this.context = new AudioContext(); this.gain = this.context.createGain(); this.gain.gain.value = 0;
      this.gain.connect(this.context.destination);
      const length = this.context.sampleRate * 3, buffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = buffer.getChannelData(0); let last = 0;
      for (let i = 0; i < length; i++) { last = (last + (Math.random() * 2 - 1) * .025) / 1.025; data[i] = last; }
      const wind = this.context.createBufferSource(); wind.buffer = buffer; wind.loop = true;
      const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 680;
      wind.connect(filter); filter.connect(this.gain); wind.start();
      this.interval = setInterval(() => { if (this.enabled && !document.hidden) this.bird(); }, 6200);
    }
    await this.context.resume(); this.enabled = !this.enabled;
    this.gain!.gain.setTargetAtTime(this.enabled ? .35 : 0, this.context.currentTime, .3);
    return this.enabled;
  }
  bird() {
    const c = this.context!;
    for (let i = 0; i < 3; i++) {
      const o = c.createOscillator(), g = c.createGain(), start = c.currentTime + i * .19;
      o.type = 'sine'; o.frequency.setValueAtTime(1900 + Math.random() * 500, start); o.frequency.exponentialRampToValueAtTime(3100, start + .07); o.frequency.exponentialRampToValueAtTime(2100, start + .14);
      g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(.012, start + .025); g.gain.exponentialRampToValueAtTime(.0001, start + .17);
      o.connect(g); g.connect(this.gain!); o.start(start); o.stop(start + .2);
    }
  }
  dispose() { if (this.interval) clearInterval(this.interval); void this.context?.close(); }
}
