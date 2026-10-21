export class Ambience {
  context?: AudioContext;
  gain?: GainNode;
  rainGain?: GainNode;
  windGain?: GainNode;
  rainAmount = .58;
  windAmount = .45;
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
      this.windGain=this.context.createGain();this.windGain.gain.value=.45+this.windAmount*.55;
      wind.connect(filter); filter.connect(this.windGain);this.windGain.connect(this.gain); wind.start();
      const rainBuffer=this.context.createBuffer(1,length,this.context.sampleRate),rainData=rainBuffer.getChannelData(0);
      for(let i=0;i<length;i++)rainData[i]=(Math.random()*2-1)*.10;
      const rain=this.context.createBufferSource();rain.buffer=rainBuffer;rain.loop=true;
      this.rainGain=this.context.createGain();this.rainGain.gain.value=this.rainAmount;
      const highpass=this.context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=650;rain.connect(highpass);highpass.connect(this.rainGain);this.rainGain.connect(this.gain);rain.start();
      this.interval = setInterval(() => { if (this.enabled && !document.hidden && this.rainAmount>.02) this.drip(); }, 1700);
    }
    await this.context.resume(); this.enabled = !this.enabled;
    this.gain!.gain.setTargetAtTime(this.enabled ? .35 : 0, this.context.currentTime, .3);
    return this.enabled;
  }
  drip(){
    const c=this.context!,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;
    o.frequency.setValueAtTime(850+Math.random()*500,t);o.frequency.exponentialRampToValueAtTime(360,t+.10);
    g.gain.setValueAtTime(.028*this.rainAmount,t);g.gain.exponentialRampToValueAtTime(.0001,t+.14);o.connect(g);g.connect(this.gain!);o.start(t);o.stop(t+.16);
  }
  setWeather(rain:number,wind:number){
    if(Math.abs(rain-this.rainAmount)>.002){this.rainAmount=rain;this.rainGain?.gain.setTargetAtTime(rain,this.context!.currentTime,.15);}
    if(Math.abs(wind-this.windAmount)>.002){this.windAmount=wind;this.windGain?.gain.setTargetAtTime(.45+wind*.55,this.context!.currentTime,.15);}
  }
  dispose() { if (this.interval) clearInterval(this.interval); void this.context?.close(); }
}
