import * as T from 'three';
import { makeSky } from './atmosphere';
import type { Town } from './world';
import type { Ambience } from './audio';

export const TIMES = {
  dawn: { label: '清晨', hour: 6 }, day: { label: '白天', hour: 12 },
  sunset: { label: '夕阳', hour: 18 }, night: { label: '夜晚', hour: 22 },
} as const;
export const WEATHERS = {
  clear: { label: '晴朗', rain: 0, clouds: .15, wet: 0, sun: 1, wind: .25, note: '云开天朗，石板上的水光渐渐收起。' },
  cloudy: { label: '多云', rain: 0, clouds: .78, wet: .16, sun: .55, wind: .5, note: '云影压低了天光，巷子里多了一层柔和的灰蓝。' },
  drizzle: { label: '细雨', rain: .58, clouds: .85, wet: 1, sun: .65, wind: .45, note: '细雨落在屋檐与溪水上，灯火映进青石。' },
  rain: { label: '大雨', rain: 1, clouds: 1, wet: 1, sun: .40, wind: 1, note: '雨势渐密，风拂竹梢，水面漾起更密的涟漪。' },
} as const;
export type TimeOfDay = keyof typeof TIMES;
export type Weather = keyof typeof WEATHERS;
const STORAGE_KEY = 'tingyu-climate-v1';

type Palette = {
  top: string; horizon: string; cloud: string; fog: string;
  sun: string; power: number; ambient: string; ground: string; fill: number;
  rim: string; rimPower: number; direction: [number, number, number]; lamp: number; daylight: number;
};
const NIGHT: Palette = { top:'#203044', horizon:'#2b4052', cloud:'#526572', fog:'#172332', sun:'#a9d1ff',power:1.15,ambient:'#b9d2f1',ground:'#424652',fill:.68,rim:'#7bafc9',rimPower:.65,direction:[-16,32,20],lamp:1,daylight:0 };
const DAWN: Palette = { top:'#718eaf', horizon:'#ead7be', cloud:'#c0bdc7', fog:'#a2b2bb', sun:'#ffddba',power:1.45,ambient:'#b7d0e3',ground:'#626e70',fill:.80,rim:'#a9c3d9',rimPower:.4,direction:[-28,11,-15],lamp:.45,daylight:.65 };
const DAY: Palette = { top:'#5084af', horizon:'#c6dce2', cloud:'#edf1e9', fog:'#b6cdd4', sun:'#fff0d2',power:2.65,ambient:'#c5dfed',ground:'#68776c',fill:1.02,rim:'#a2c4d3',rimPower:.32,direction:[-16,32,20],lamp:.06,daylight:1 };
const SUNSET: Palette = { top:'#637d9f', horizon:'#edbb94', cloud:'#d3a6a0', fog:'#b59d99', sun:'#ffb36e',power:2.20,ambient:'#aebed7',ground:'#635c67',fill:.84,rim:'#bba3bc',rimPower:.38,direction:[-32,8,15],lamp:.65,daylight:.58 };
const KEYS = [{hour:0,palette:NIGHT},{hour:4.5,palette:NIGHT},{hour:6,palette:DAWN},{hour:10,palette:DAY},{hour:15,palette:DAY},{hour:18,palette:SUNSET},{hour:20.5,palette:NIGHT},{hour:24,palette:NIGHT}];

/** One environment state drives lighting, rain, reflections, materials and sound. */
export class Climate {
  hour = 22;
  weather: Weather = 'drizzle';
  automatic = false;
  sunOffset = new T.Vector3(-16,32,20);
  sky = makeSky();
  ambient = new T.HemisphereLight();
  rim = new T.DirectionalLight();
  rain = WEATHERS.drizzle.rain as number;
  wetness = 1;
  lampStrength = 1;
  transitioning = false;
  private displayHour = 22;
  private clouds = .85;
  private sunScale = .65;
  private wind = .45;
  private town?: Town;
  private otherSunOffset = new T.Vector3();
  private temp = new T.Color();

  constructor(public scene:T.Scene, public sun:T.DirectionalLight, public audio:Ambience) {
    try {
      const raw:unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (raw && typeof raw === 'object') {
        const value = raw as Record<string,unknown>;
        if (typeof value.hour === 'number' && Number.isFinite(value.hour) && value.hour >= 0 && value.hour < 24) this.hour=value.hour;
        if (typeof value.weather === 'string' && Object.hasOwn(WEATHERS,value.weather)) this.weather=value.weather as Weather;
        this.automatic=value.automatic===true;
      }
    } catch { /* Storage may be unavailable; the scene still works. */ }
    this.displayHour=this.hour;
    const weather=WEATHERS[this.weather];this.rain=weather.rain;this.clouds=weather.clouds;this.wetness=weather.wet;this.sunScale=weather.sun;this.wind=weather.wind;
    this.scene.background=new T.Color(NIGHT.fog);this.scene.fog=new T.Fog(NIGHT.fog,65,180);
    this.rim.position.set(10,15,-18);this.scene.add(this.sky,this.ambient,this.rim);
    this.update(0,0,false);
  }
  attach(town:Town){this.town=town;this.applyWorld();}
  selectTime(value:string){
    if(!Object.hasOwn(TIMES,value))return;
    this.hour=TIMES[value as TimeOfDay].hour;this.automatic=false;this.transitioning=true;this.save();this.invalidate();
  }
  selectWeather(value:string){
    if(!Object.hasOwn(WEATHERS,value))return;
    this.weather=value as Weather;this.transitioning=true;this.save();this.invalidate();
  }
  setAutomatic(enabled:boolean){this.automatic=enabled;this.save();}
  private save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({hour:this.hour,weather:this.weather,automatic:this.automatic}));}catch{/* Optional preference storage. */}}
  private invalidate(){this.town?.wet.invalidate();}
  get timeOfDay():TimeOfDay {
    if(this.hour>=5&&this.hour<9)return 'dawn';if(this.hour>=9&&this.hour<16.5)return 'day';if(this.hour>=16.5&&this.hour<20)return 'sunset';return 'night';
  }
  get label(){const h=Math.floor(this.hour),m=Math.floor((this.hour-h)*60);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} · ${WEATHERS[this.weather].label}`;}
  snapshot(){return {hour:this.hour,displayHour:((this.displayHour%24)+24)%24,timeOfDay:this.timeOfDay,weather:this.weather,automatic:this.automatic,transitioning:this.transitioning,rain:this.rain,wetness:this.wetness,lampStrength:this.lampStrength,label:this.label};}
  update(dt:number, elapsed:number, advance:boolean){
    // Eight real minutes per full day; UI, map, pause and hidden tabs stop the clock.
    if(this.automatic&&advance)this.hour=(this.hour+dt/20)%24;
    const gap=T.MathUtils.euclideanModulo(this.hour-this.displayHour+12,24)-12;
    this.displayHour+=gap*(1-Math.exp(-5*dt));
    const weather=WEATHERS[this.weather],blend=1-Math.exp(-4*dt);
    this.rain=T.MathUtils.lerp(this.rain,weather.rain,blend);this.clouds=T.MathUtils.lerp(this.clouds,weather.clouds,blend);
    this.wetness=T.MathUtils.lerp(this.wetness,weather.wet,1-Math.exp(-1.5*dt));
    if(Math.abs(this.rain-weather.rain)<.003)this.rain=weather.rain;
    if(Math.abs(this.wetness-weather.wet)<.01)this.wetness=weather.wet;
    this.sunScale=T.MathUtils.lerp(this.sunScale,weather.sun,blend);this.wind=T.MathUtils.lerp(this.wind,weather.wind,blend);
    const hour=T.MathUtils.euclideanModulo(this.displayHour,24);
    let i=1;while(i<KEYS.length-1&&hour>KEYS[i]!.hour)i++;
    const a=KEYS[i-1]!,b=KEYS[i]!,t=T.MathUtils.smoothstep(hour,a.hour,b.hour),pa=a.palette,pb=b.palette;
    const number=(key:'power'|'fill'|'rimPower'|'lamp'|'daylight')=>T.MathUtils.lerp(pa[key],pb[key],t);
    const color=(target:T.Color,key:'top'|'horizon'|'cloud'|'fog'|'sun'|'ambient'|'ground'|'rim')=>target.set(pa[key]).lerp(this.temp.set(pb[key]),t);
    color(this.sun.color,'sun');this.sun.intensity=number('power')*T.MathUtils.lerp(1,this.sunScale,number('daylight'));
    color(this.ambient.color,'ambient');color(this.ambient.groundColor,'ground');this.ambient.intensity=number('fill')*(1+this.clouds*.06);
    color(this.rim.color,'rim');this.rim.intensity=number('rimPower');
    this.sunOffset.set(...pa.direction).lerp(this.otherSunOffset.set(...pb.direction),t);
    const grazing=1-Math.min(1,this.sunOffset.y/30);
    this.sun.shadow.normalBias=T.MathUtils.lerp(.025,.08,grazing);
    this.sun.shadow.bias=-T.MathUtils.lerp(.00015,.0015,grazing);
    this.lampStrength=number('lamp');
    const material=this.sky.material,u=material.uniforms;
    color(u.top!.value,'top');color(u.horizon!.value,'horizon');color(u.cloudColor!.value,'cloud');
    const darkness=1-this.clouds*.20;
    (u.top!.value as T.Color).multiplyScalar(darkness);(u.horizon!.value as T.Color).multiplyScalar(darkness);
    u.cloudCover!.value=this.clouds;u.sunDirection!.value.copy(this.sunOffset).normalize();u.sunColor!.value.copy(this.sun.color);
    u.sunVisibility!.value=(1-this.clouds*.85)*number('daylight');u.daylight!.value=number('daylight');u.time!.value=elapsed;
    const fog=this.scene.fog as T.Fog;color(fog.color,'fog');(this.scene.background as T.Color).copy(fog.color);
    fog.near=80-this.rain*24-Math.max(0,this.rain-.6)*60;fog.far=T.MathUtils.lerp(190,110,this.rain);
    this.transitioning=Math.abs(gap)>.01||Math.abs(this.rain-weather.rain)>.004||Math.abs(this.wetness-weather.wet)>.01;
    this.applyWorld();
  }
  private applyWorld(){
    if(!this.town)return;
    this.town.setClimate(this.rain,this.wetness,this.lampStrength,this.wind);
    this.audio.setWeather(this.rain,this.wind);
  }
}
