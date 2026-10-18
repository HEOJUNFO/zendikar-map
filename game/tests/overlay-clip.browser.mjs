// Real GPU raster regression. Run in any local secure page:
// await (await import('/game/tests/overlay-clip.browser.mjs')).overlayClipPixels()
export async function overlayClipPixels() {
  const source=await(await fetch('/game/engine/render/wgsl/overlay.wgsl')).text()
  const adapter=await navigator.gpu?.requestAdapter();if(!adapter)throw new Error('WebGPU adapter missing')
  const device=await adapter.requestDevice()
  const errors=[];device.addEventListener('uncapturederror',event=>errors.push(event.error.message))
  const module=device.createShaderModule({code:source})
  const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs_main',buffers:[
    {arrayStride:12,attributes:[{shaderLocation:0,offset:0,format:'float32x3'}]},
    {arrayStride:96,stepMode:'instance',attributes:[{shaderLocation:1,offset:0,format:'float32x4'},{shaderLocation:2,offset:16,format:'float32x4'},
      {shaderLocation:3,offset:32,format:'float32x4'},{shaderLocation:4,offset:48,format:'float32x4'},{shaderLocation:5,offset:64,format:'float32'},
      {shaderLocation:6,offset:68,format:'float32x2'},{shaderLocation:7,offset:76,format:'float32'},{shaderLocation:8,offset:80,format:'float32x4'}]}]},
    fragment:{module,entryPoint:'fs_main',targets:[{format:'rgba8unorm'}]},primitive:{topology:'triangle-list'}})
  const buffer=(data,usage)=>{const b=device.createBuffer({size:data.byteLength,usage:usage|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(b,0,data);return b}
  const vertices=buffer(new Float32Array([0,0,0,1,0,0,1,1,0,0,0,0,1,1,0,0,1,0]),GPUBufferUsage.VERTEX)
  const uniforms=buffer(new Float32Array([64,64,2,2]),GPUBufferUsage.UNIFORM)
  const instance=device.createBuffer({size:96,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST})
  const atlas=device.createTexture({size:[2,2],format:'r8unorm',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST})
  device.queue.writeTexture({texture:atlas},new Uint8Array([255,255,255,255]),{bytesPerRow:2},[2,2])
  const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniforms}},{binding:1,resource:atlas.createView()},{binding:2,resource:device.createSampler()}]})
  const target=device.createTexture({size:[64,64],format:'rgba8unorm',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC})
  const read=device.createBuffer({size:64*256,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST})
  const results=[]
  try {
    // Unclipped geometry deliberately crosses each boundary. Its centre is
    // outside, while a rotated corner remains inside: culling by centre is wrong.
    for(const [x,y] of [[42,26],[6,26],[26,6],[26,42]])for(const angle of [0,Math.PI/2,Math.PI/4])for(const shape of [0,1,6,7,8]) {
      device.queue.writeBuffer(instance,0,new Float32Array([x,y,16,16,1,1,0,0,1,0,0,1,1,0,0,1,0,shape,0,angle,16,16,48,48]))
      const encoder=device.createCommandEncoder();const pass=encoder.beginRenderPass({colorAttachments:[{view:target.createView(),clearValue:[0,0,0,1],loadOp:'clear',storeOp:'store'}]})
      pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.setVertexBuffer(0,vertices);pass.setVertexBuffer(1,instance);pass.draw(6);pass.end()
      encoder.copyTextureToBuffer({texture:target},{buffer:read,bytesPerRow:256},[64,64]);device.queue.submit([encoder.finish()]);await read.mapAsync(GPUMapMode.READ)
      const data=new Uint8Array(read.getMappedRange());let inside=0,outside=0
      for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(data[y*256+x*4]>0){if(x>=16&&x<48&&y>=16&&y<48)inside++;else outside++}
      read.unmap();if(outside)throw new Error(`rotated shape leaked ${outside} pixels outside fixed viewport`)
      if(!inside)throw new Error(`partially visible rotated shape ${shape}/${angle} was dropped`)
      results.push({x,y,angle,shape,inside,outside})
    }
    if(errors.length)throw new Error(errors.join('\n'))
    return {ok:true,results}
  }finally{device.destroy()}
}
