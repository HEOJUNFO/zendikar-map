// GPU readback executes the exact shared production vertex-deformation WGSL.
// It compares every actual bind vertex against an independent JS DQS reference.
export async function runAct1SkinChecks({rootPaletteUrl}={}){
 const root='/game/gameplay/content/creatures/act1/runtime/'
 const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw Error('WebGPU adapter missing')
 const device=await adapter.requestDevice();const errors=[];device.addEventListener('uncapturederror',e=>errors.push(String(e.error)))
 const text=await(await fetch('/game/engine/render/wgsl/include/surface_skin_math.wgsl')).text()
 const module=device.createShaderModule({code:text+`
 struct Input { position:vec4<f32>,normal:vec4<f32>,j0:vec4<f32>,w0:vec4<f32>,j1:vec4<f32>,w1:vec4<f32>, }
 struct Output { position:vec4<f32>,normal:vec4<f32>, }
 @group(0) @binding(0) var<storage,read> source:array<Input>;
 @group(0) @binding(1) var<storage,read_write> deformed:array<Output>;
 @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>){
  if(id.x>=arrayLength(&source)){return;}
  let v=source[id.x];let j=array<f32,8>(v.j0.x,v.j0.y,v.j0.z,v.j0.w,v.j1.x,v.j1.y,v.j1.z,v.j1.w);let w=array<f32,8>(v.w0.x,v.w0.y,v.w0.z,v.w0.w,v.w1.x,v.w1.y,v.w1.z,v.w1.w);
  let result=skin_deform_mixed(v.position.xyz,v.normal.xyz,j,w);deformed[id.x]=Output(vec4<f32>(result.position,1),vec4<f32>(result.normal,0));
 }`})
 const info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw Error(info.messages.map(m=>m.message).join('\n'))
 const pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}})
 const make=(size,usage)=>device.createBuffer({size,usage})
 const bytes=async name=>{const r=await fetch(root+name);if(!r.ok)throw Error(name+' unavailable');return r.arrayBuffer()}
 const manifest=await(await fetch(root+'models.json')).json();const reports=[];
 const nativeRoots=rootPaletteUrl ? await(await fetch(rootPaletteUrl)).json() : {cases:[]};
 const rotate=(v,yaw)=>{const c=Math.cos(yaw),s=Math.sin(yaw);return [c*v[0]-s*v[2],v[1],s*v[0]+c*v[2],c*v[3]-s*v[5],v[4],s*v[3]+c*v[5]]};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
 const reference=(p,n,j,w,palette)=>{
  let max=0;for(let i=1;i<8;i++)if(w[i]>w[max])max=i
  const anchor=palette.subarray(j[max]*8,j[max]*8+4),r=[0,0,0,0],d=[0,0,0,0]
  for(let i=0;i<8;i++){
   const q=palette.subarray(j[i]*8,j[i]*8+8);let alignment=0;for(let c=0;c<4;c++)alignment+=q[c]*anchor[c]
   const weight=w[i]*(alignment<0?-1:1);for(let c=0;c<4;c++){r[c]+=q[c]*weight;d[c]+=q[c+4]*weight}
  }
  const length=Math.hypot(...r);for(let c=0;c<4;c++){r[c]/=length;d[c]/=length}const parallel=r.reduce((s,x,i)=>s+x*d[i],0);for(let c=0;c<4;c++)d[c]-=r[c]*parallel
  const rotate=v=>{const inner=cross(r,v).map((x,i)=>x+r[3]*v[i]);const delta=cross(r,inner);return v.map((x,i)=>x+2*delta[i])}
  const trans=cross(r,d).map((x,i)=>2*(x+r[3]*d[i]-d[3]*r[i]));const point=rotate(p).map((x,i)=>x+trans[i]);const normal=rotate(n);const norm=Math.hypot(...normal)
  return [...point,...normal.map(x=>x/norm)]
 }
 try{for(const model of manifest.models){
  const [meshBytes,skinBytes,animBytes]=await Promise.all(['zkmodel','skin','anim'].map(ext=>bytes(model.name+'.'+ext)))
  const mesh=new DataView(meshBytes),skin=new DataView(skinBytes),anim=new DataView(animBytes),count=mesh.getUint32(4,true),bones=skin.getUint32(12,true),input=new Float32Array(count*24)
  for(let i=0;i<count;i++){
   for(let c=0;c<3;c++){input[i*24+c]=mesh.getFloat32(16+i*36+c*4,true);input[i*24+4+c]=mesh.getFloat32(28+i*36+c*4,true)}
   for(let c=0;c<8;c++){input[i*24+(c<4?8:16)+c%4]=skin.getUint32(16+i*64+c*4,true);input[i*24+(c<4?12:20)+c%4]=skin.getFloat32(48+i*64+c*4,true)}
  }
  const source=make(input.byteLength,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),target=make(count*32,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC),readback=make(count*32,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ),uniform=make(36944,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST)
  device.queue.writeBuffer(source,0,input);const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:source}},{binding:1,resource:{buffer:target}},{binding:7,resource:{buffer:uniform}}]})
  let offset=16;const clips=[],cases=[],tracks=new Map()
  for(let c=0;c<anim.getUint32(12,true);c++){
   const name=new TextDecoder().decode(new Uint8Array(animBytes,offset,32)).replace(/\0.*$/s,''),samples=anim.getUint32(offset+32,true),rate=anim.getUint32(offset+48,true)/60,frames=(samples-1)/rate+1,impact=anim.getUint32(offset+40,true);offset+=56
   tracks.set(name,{offset,frames,rate});const tick=c===0?0:c===1?25:c===2||c>=5?impact:c===3?6:frames-1
   cases.push({name,tick,palette:new Float32Array(animBytes,offset+tick*rate*bones*32,bones*8),fraction:1});offset+=samples*bones*32
  }
  const move=tracks.get('move'),previous=new Float32Array(animBytes,move.offset+(57%(move.frames-1))*move.rate*bones*32,bones*8)
  for(const name of ['attack','hit','death'])for(const fraction of [.25,.75]){const track=tracks.get(name),tick=name==='death'?4:6;cases.push({name:name+' transition',tick,palette:new Float32Array(animBytes,track.offset+tick*track.rate*bones*32,bones*8),previous,fraction})}
  const at=(name,tick)=>{const t=tracks.get(name);return new Float32Array(animBytes,t.offset+(tick%(t.frames-1))*t.rate*bones*32,bones*8)};
  cases.push({name:'interrupted three-pose mixture',tick:4,palettes:[at('idle',11),at('move',24),at('hit',2)],weights:[.5,.1875,.3125]});
  cases.push({name:'maximum nine-pose mixture',tick:9,palettes:Array.from({length:9},(_,i)=>at(['idle','move','attack','hit','death'][i%5],i*3)),weights:Array(9).fill(1/9)});
  for(const fixture of nativeRoots.cases.filter(c=>manifest.models[c.species]?.name===model.name)){
    if(fixture.bones!==bones || fixture.palettes.length>9 || fixture.palettes.some(p=>p.length!==bones*8))throw Error('native root fixture layout mismatch');
    cases.push({name:'native root turn '+fixture.case,tick:4,palettes:fixture.palettes.map(p=>new Float32Array(p)),weights:fixture.weights,root:fixture.root,referencePalettes:fixture.referencePalettes.map(p=>new Float32Array(p)),actorYaw:fixture.actorYaw,expectedYaw:fixture.expectedYaw,native:true});
  }
  for(const {name,tick,palette,previous,fraction,palettes,weights,root:rootRotation=[1,0,0,0],referencePalettes,actorYaw=0,expectedYaw=0,native=false} of cases){
    const poses=palettes??(previous?[previous,palette]:[palette]),mix=weights??(previous?[1-fraction,fraction]:[1]);
    for(let i=0;i<poses.length;i++)device.queue.writeBuffer(uniform,i*bones*32,poses[i]);
    const w=new Float32Array(12);w.set(mix);device.queue.writeBuffer(uniform,36864,w);device.queue.writeBuffer(uniform,36912,new Uint32Array([poses.length,bones,0,0]));device.queue.writeBuffer(uniform,36928,new Float32Array(rootRotation));
    const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(Math.ceil(count/64));pass.end();encoder.copyBufferToBuffer(target,0,readback,0,count*32);device.queue.submit([encoder.finish()]);await readback.mapAsync(GPUMapMode.READ)
    const actual=new Float32Array(readback.getMappedRange());let positionError=0,normalError=0,minimumY=Infinity;let ax=0,az=0,rx=0,rz=0,ar2=0,rr2=0
    for(let i=0;i<count;i++){
     const at=i*24,p=input.subarray(at,at+3),n=input.subarray(at+4,at+7),j=[...input.subarray(at+8,at+12),...input.subarray(at+16,at+20)],w=[...input.subarray(at+12,at+16),...input.subarray(at+20,at+24)];let expected=Array(6).fill(0);
     for(let pose=0;pose<poses.length;pose++){const value=reference(p,n,j,w,(referencePalettes??poses)[pose]);for(let c=0;c<6;c++)expected[c]+=value[c]*mix[pose]}
     expected=rotate(expected,expectedYaw);
     const normalLength=Math.hypot(...expected.slice(3));for(let k=3;k<6;k++)expected[k]/=normalLength
     const result=rotate([...actual.subarray(i*8,i*8+3),...actual.subarray(i*8+4,i*8+7)],actorYaw);
     ax+=result[0];az+=result[2];ar2+=result[0]**2+result[2]**2;rx+=expected[0];rz+=expected[2];rr2+=expected[0]**2+expected[2]**2;
     minimumY=Math.min(minimumY,actual[i*8+1])
     positionError=Math.max(positionError,Math.hypot(...expected.slice(0,3).map((v,k)=>v-result[k])));normalError=Math.max(normalError,Math.hypot(...expected.slice(3).map((v,k)=>v-result[k+3])))
    }
    readback.unmap();if(![positionError,normalError,minimumY].every(Number.isFinite))throw Error(model.name+'/'+name+' non-finite GPU/reference result');if(positionError>.00003||normalError>.00003)throw Error(model.name+'/'+name+' GPU skin mismatch '+positionError+'/'+normalError)
    if(minimumY<-.00005)throw Error(model.name+'/'+name+' actual GPU surface penetrates floor '+minimumY)
    const horizontalRadiusRatio=Math.sqrt((ar2-(ax*ax+az*az)/count)/(rr2-(rx*rx+rz*rz)/count));
    if(native && Math.abs(horizontalRadiusRatio-1)>.0001)throw Error(model.name+'/'+name+' actual GPU root turn changes horizontal size '+horizontalRadiusRatio);
    clips.push({name,tick,fraction,native,poses:poses.length,horizontalRadiusRatio,vertices:count,positionErrorMetres:positionError,normalError,minimumYMetres:minimumY})
  }
  for(const buffer of [source,target,readback,uniform])buffer.destroy();reports.push({name:model.name,bones,clips})
 }}finally{device.destroy()}
 if(errors.length)throw Error(errors.join('\n'));return {ok:true,scope:'actual production WGSL deformation function GPU readback, independent JS reference, actual five source meshes/weights/palettes',models:reports}
}
