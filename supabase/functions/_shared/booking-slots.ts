export function timeMinutes(time:string):number {const [h,m]=time.split(':').map(Number);return h*60+m;}
export function slotMinutes(date:string,time:string):number{return Date.parse(date+'T00:00:00Z')/60000+timeMinutes(time);}
export function serviceDuration(details:Record<string,{duration?:number;buffer?:number}>|undefined,service:string){
  const value=details?.[service];
  const bounded=(n:unknown,fallback:number,min:number,max:number)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Math.round(Number(n)))):fallback;
  return {duration:bounded(value?.duration ?? 30,30,5,720),buffer:bounded(value?.buffer ?? 0,0,0,180)};
}
export function overlaps(start:number,duration:number,otherStart:number,otherDuration:number){return start<otherStart+otherDuration && otherStart<start+duration;}
export function calendarEvent(id:string,date:string,time:string,duration:number,zone:string,title:string){
  const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const start=new Date(date+'T'+time+':00Z');
  const end=new Date(start.getTime()+duration*60000);
  const local=(d:Date)=>d.toISOString().slice(0,19).replace(/[-:]/g,'');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MosaOS//Zeitfenster//DE','BEGIN:VEVENT',
    'UID:'+id+'@termine.mosaos.ch','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
    'DTSTART;TZID='+zone+':'+local(start),'DTEND;TZID='+zone+':'+local(end),'SUMMARY:'+escape(title),
    'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
