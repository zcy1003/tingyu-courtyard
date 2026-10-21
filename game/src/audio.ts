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
      const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 950;
      wind.connect(filter); filter.connect(this.gain); wind.start();
      const rainBuffer=this.context.createBuffer(1,length,this.context.sampleRate),rainData=rainBuffer.getChannelData(0);
      for(let i=0;i<length;i++)rainData[i]=(Math.random()*2-1)*.10;
      const rain=this.context.createBufferSource();rain.buffer=rainBuffer;rain.loop=true;
      const highpass=this.context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=650;rain.connect(highpass);highpass.connect(this.gain);rain.start();
      this.interval = setInterval(() => { if (this.enabled && !document.hidden) this.drip(); }, 1700);
    }
    await this.context.resume(); this.enabled = !this.enabled;
    this.gain!.gain.setTargetAtTime(this.enabled ? .35 : 0, this.context.currentTime, .3);
    return this.enabled;
  }
  drip(){
    const c=this.context!,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
    o.frequency.setValueAtTime(850+Math.random()*500,t);o.frequency.exponentialRampToValueAtTime(360,t+.10);
    g.gain.setValueAtTime(.028,t);g.gain.exponentialRampToValueAtTime(.0001,t+.14);o.connect(g);g.connect(this.gain!);o.start(t);o.stop(t+.16);
  }
  dispose() { if (this.interval) clearInterval(this.interval); void this.context?.close(); }
}
