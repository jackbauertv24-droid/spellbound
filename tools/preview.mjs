#!/usr/bin/env node
/**
 * Spellbound art preview — zero dependencies, Node only.
 *
 *   node tools/preview.mjs
 *
 * Writes two images into review/ so the art can be judged with eyes, not just
 * measured by the validator:
 *
 *   review/contact.png  every sprite at 6x on a dark ground, in labelled rows
 *   review/room.png     an assembled 9x7 dungeon with hero, goblin, key, door,
 *                       torches and the exit stair — the real readability test
 *
 * Run this after tools/validate-assets.mjs passes, then LOOK at room.png.
 * A tileset can satisfy every numeric gate and still read badly in a room.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
const D = new URL('../assets/sprites/', import.meta.url).pathname;
const crcT=[...Array(256)].map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=0xffffffff;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(t,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t,'ascii'),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);};
function enc(w,h,px){const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
  const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;for(let x=0;x<w*4;x++)raw[y*(w*4+1)+1+x]=px[y*w*4+x];}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const pae=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
function dec(buf){let pos=8;const idat=[];let ih;
  while(pos<buf.length){const len=buf.readUInt32BE(pos),t=buf.toString('ascii',pos+4,pos+8),d=buf.subarray(pos+8,pos+8+len);
    if(t==='IHDR')ih={w:d.readUInt32BE(0),h:d.readUInt32BE(4)};else if(t==='IDAT')idat.push(d);else if(t==='IEND')break;pos+=12+len;}
  const raw=inflateSync(Buffer.concat(idat)),{w,h}=ih,st=w*4,out=Buffer.alloc(h*st);
  for(let y=0;y<h;y++){const f=raw[y*(st+1)],ln=raw.subarray(y*(st+1)+1,y*(st+1)+1+st);
    for(let x=0;x<st;x++){const a=x>=4?out[y*st+x-4]:0,b=y>0?out[(y-1)*st+x]:0,c=x>=4&&y>0?out[(y-1)*st+x-4]:0;let v=ln[x];
      if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4)v+=pae(a,b,c);out[y*st+x]=v&255;}}
  return {w,h,px:out};}
const load=n=>dec(readFileSync(`${D}/${n}.png`));
function blit(dst,dw,src,dx,dy,sc){for(let y=0;y<src.h;y++)for(let x=0;x<src.w;x++){const s=(y*src.w+x)*4;if(src.px[s+3]===0)continue;
  for(let j=0;j<sc;j++)for(let i=0;i<sc;i++){const d=((dy+y*sc+j)*dw+dx+x*sc+i)*4;
    dst[d]=src.px[s];dst[d+1]=src.px[s+1];dst[d+2]=src.px[s+2];dst[d+3]=255;}}}

// ---------- contact sheet ----------
const names=['tile_floor_a','tile_floor_b','tile_floor_c','tile_floor_cracked','tile_wall','tile_wall_torch_0','tile_wall_torch_1','tile_door_closed',
'tile_door_open','tile_stairs_down','item_key','item_potion','item_scroll','ui_torch','ui_heart','hero_hurt',
'hero_walk_south_0','hero_walk_south_1','hero_walk_north_0','hero_walk_north_1','hero_walk_east_0','hero_walk_east_1','hero_walk_west_0','hero_walk_west_1',
'hero_attack_south','hero_attack_north','hero_attack_east','hero_attack_west','fx_slash_0','fx_slash_1','fx_slash_2','goblin_walk_south_0',
'goblin_walk_south_1','goblin_walk_north_0','goblin_walk_north_1','goblin_walk_east_0','goblin_walk_east_1','goblin_walk_west_0','goblin_walk_west_1','goblin_attack_south',
'goblin_attack_north','goblin_attack_east','goblin_attack_west'];
const SC=6,CELL=16*SC,GAP=8,COLS=8,ROWS=Math.ceil(names.length/COLS);
const W=COLS*(CELL+GAP)+GAP,H=ROWS*(CELL+GAP)+GAP;
const sheet=new Uint8Array(W*H*4);
for(let i=0;i<W*H;i++){sheet[i*4]=0x1a;sheet[i*4+1]=0x18;sheet[i*4+2]=0x24;sheet[i*4+3]=255;}
names.forEach((n,i)=>{const c=i%COLS,r=(i/COLS)|0;blit(sheet,W,load(n),GAP+c*(CELL+GAP),GAP+r*(CELL+GAP),SC);});
writeFileSync(new URL('../review/contact.png', import.meta.url).pathname,enc(W,H,sheet));
names.forEach((n,i)=>{if(i%COLS===0)process.stdout.write(`\nrow ${(i/COLS|0)+1}: `);process.stdout.write(`${n}  `);});

// ---------- assembled room ----------
const map=['#########','#..k....#','#.###.#g#','#.#>#..D#','#.#####.#','#h....g.#','#########'];
const RS=4,MW=9,MH=7,RW=MW*16*RS,RH=MH*16*RS;
const room=new Uint8Array(RW*RH*4);
const floors=[load('tile_floor_a'),load('tile_floor_b'),load('tile_floor_c'),load('tile_floor_cracked')];
const wall=load('tile_wall'),torch=load('tile_wall_torch_0'),door=load('tile_door_closed'),stair=load('tile_stairs_down');
let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const ch=map[y][x];const px=x*16*RS,py=y*16*RS;
  if(ch==='#'){blit(room,RW,(x===4&&y===0)||(x===0&&y===3)?torch:wall,px,py,RS);continue;}
  blit(room,RW,floors[(rnd()*4)|0],px,py,RS);
  if(ch==='>')blit(room,RW,stair,px,py,RS);
  if(ch==='D')blit(room,RW,door,px,py,RS);
  if(ch==='k')blit(room,RW,load('item_key'),px,py,RS);
  if(ch==='h')blit(room,RW,load('hero_walk_south_0'),px,py,RS);
  if(ch==='g')blit(room,RW,load('goblin_walk_south_0'),px,py,RS);}
writeFileSync(new URL('../review/room.png', import.meta.url).pathname,enc(RW,RH,room));
console.log('\n\nwrote review/contact.png (all sprites) and review/room.png (assembled dungeon)');
