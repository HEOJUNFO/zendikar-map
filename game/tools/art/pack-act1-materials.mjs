import sharp from 'sharp'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
const dir=new URL('../../gameplay/content/creatures/act1/runtime/',import.meta.url)
const manifest=JSON.parse(readFileSync(new URL('models.json',dir)))
for(const {name} of manifest.models){
 const file=ext=>fileURLToPath(new URL(`${name}.${ext}`,dir))
 const resize=path=>sharp(path).resize(2048,2048,{kernel:'lanczos3'}).removeAlpha()
 const normal=await resize(file('normal.png')).raw().toBuffer()
 const orm=await resize(file('orm.png')).raw().toBuffer()
 const nar=Buffer.alloc(2048*2048*3),metal=Buffer.alloc(2048*2048)
 for(let i=0;i<metal.length;i++){nar[i*3]=normal[i*3];nar[i*3+1]=normal[i*3+1];nar[i*3+2]=orm[i*3+1];metal[i]=orm[i*3+2]}
 await resize(file('base.png')).jpeg({quality:94,chromaSubsampling:'4:4:4'}).toFile(file('jpg'))
 await sharp(nar,{raw:{width:2048,height:2048,channels:3}}).jpeg({quality:96,chromaSubsampling:'4:4:4'}).toFile(file('nar.jpg'))
 await sharp(metal,{raw:{width:2048,height:2048,channels:1}}).jpeg({quality:96}).toFile(file('metal.jpg'))
 console.log('PBR',name,'actual normal/roughness/metallic retained')
}
