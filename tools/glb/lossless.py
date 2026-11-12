"""Conservative GLB repacker: exact buffer payloads, optional lossless PNG DEFLATE.
Never removes nodes, accessors, animation channels, metadata, or changes topology.
Unknown binary layouts/extensions are rejected rather than guessed.
"""
import argparse,copy,hashlib,json,pathlib,struct,zlib
SAFE={'EXT_texture_webp','KHR_materials_emissive_strength','KHR_materials_specular','KHR_materials_volume','KHR_materials_ior','FB_ngon_encoding','KHR_materials_unlit','KHR_materials_transmission','KHR_materials_clearcoat','KHR_texture_transform','KHR_materials_pbrSpecularGlossiness','KHR_mesh_quantization','KHR_draco_mesh_compression'}

def unpack(data):
    magic,version,length=struct.unpack_from('<4sII',data)
    if magic!=b'glTF' or version!=2 or length!=len(data):raise ValueError('Invalid GLB header')
    chunks=[];at=12
    while at<len(data):
        n,kind=struct.unpack_from('<II',data,at);at+=8
        if n%4 or at+n>len(data):raise ValueError('Invalid chunk')
        chunks.append((kind,data[at:at+n]));at+=n
    if [k for k,_ in chunks] not in [[0x4e4f534a],[0x4e4f534a,0x004e4942]]:raise ValueError('Unsupported chunks')
    return json.loads(chunks[0][1]),chunks[1][1] if len(chunks)>1 else b''

def png_parts(b):
    if not b.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('Not PNG')
    parts=[];at=8
    while at<len(b):
        if at+12>len(b):raise ValueError('Truncated PNG chunk')
        n=struct.unpack_from('>I',b,at)[0];kind=b[at+4:at+8];payload=b[at+8:at+8+n]
        crc=struct.unpack_from('>I',b,at+8+n)[0]
        if zlib.crc32(kind+payload)!=crc:raise ValueError('PNG CRC mismatch')
        parts.append((kind,payload));at+=n+12
        if kind==b'IEND':
            if b[at:] not in (b'',b'\0',b'\0\0',b'\0\0\0'):raise ValueError('Unexpected PNG trailer')
            at=len(b);break
    if at!=len(b) or parts[-1][0]!=b'IEND':raise ValueError('Invalid PNG length')
    return parts

def png_signature(b):
    parts=png_parts(b)
    # Exact filtered scanline bytes + every non-IDAT chunk, including ICC/gamma/alpha metadata.
    return [(k,v) for k,v in parts if k!=b'IDAT'],zlib.decompress(b''.join(v for k,v in parts if k==b'IDAT'))

def recompress_png(b):
    parts=png_parts(b)
    if any(k in (b'acTL',b'fcTL',b'fdAT') for k,_ in parts):return b
    raw=zlib.decompress(b''.join(v for k,v in parts if k==b'IDAT'))
    compressed=zlib.compress(raw,9);out=bytearray(b[:8]);inserted=False
    for k,v in parts:
        if k==b'IDAT':
            if inserted:continue
            v=compressed;inserted=True
        out.extend(struct.pack('>I',len(v))+k+v+struct.pack('>I',zlib.crc32(k+v)))
    result=bytes(out)
    assert png_signature(result)==png_signature(b)
    return result if len(result)<len(b) else b

def pack(j,b):
    raw=json.dumps(j,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode();raw+=b' '*((-len(raw))%4)
    out=struct.pack('<II',len(raw),0x4e4f534a)+raw
    if b: b+=b'\0'*((-len(b))%4);out+=struct.pack('<II',len(b),0x004e4942)+b
    return struct.pack('<4sII',b'glTF',2,12+len(out))+out

def canonical(j):
    j=copy.deepcopy(j)
    for buf in j.get('buffers',[]):buf.pop('byteLength',None)
    for view in j.get('bufferViews',[]):view.pop('byteOffset',None);view.pop('byteLength',None)
    return j

def payload(j,b,i):
    v=j['bufferViews'][i];start=v.get('byteOffset',0);return b[start:start+v['byteLength']]

def verify(before,after):
    a,ab=unpack(before);b,bb=unpack(after)
    if canonical(a)!=canonical(b):raise ValueError('GLTF semantics changed')
    png={i['bufferView'] for i in a.get('images',[]) if i.get('mimeType')=='image/png' and 'bufferView' in i}
    for i in range(len(a.get('bufferViews',[]))):
        x,y=payload(a,ab,i),payload(b,bb,i)
        if x!=y and (i not in png or png_signature(x)!=png_signature(y)):raise ValueError(f'Payload changed: bufferView {i}')
    return True

def optimize(data):
    j,bin=unpack(data)
    if set(j.get('extensionsUsed',[]))-SAFE:raise ValueError('Unsupported extension '+str(set(j['extensionsUsed'])-SAFE))
    if len(j.get('buffers',[]))!=1 or 'uri' in j['buffers'][0]:raise ValueError('External/multiple buffers unsupported')
    if any(v.get('buffer',0)!=0 or v.get('extensions') for v in j.get('bufferViews',[])):raise ValueError('Extended bufferView unsupported')
    png={i['bufferView'] for i in j.get('images',[]) if i.get('mimeType')=='image/png' and 'bufferView' in i}
    # A view shared with an accessor must remain byte-identical, even if labeled as a PNG.
    used={a['bufferView'] for a in j.get('accessors',[]) if 'bufferView' in a}
    for a in j.get('accessors',[]):
        for s in a.get('sparse',{}).values():
            if isinstance(s,dict) and 'bufferView' in s:used.add(s['bufferView'])
    new=copy.deepcopy(j);out=bytearray();seen={};dedup=0;pngsaved=0
    for i,v in enumerate(new.get('bufferViews',[])):
        raw=payload(j,bin,i)
        if len(raw)!=v['byteLength']:raise ValueError('Out of range bufferView')
        if i in png-used:
            optimized=recompress_png(raw);pngsaved+=len(raw)-len(optimized);raw=optimized
        # 4-byte boundaries retain all glTF component alignment; never merge partial overlaps.
        key=hashlib.sha256(raw).digest()
        previous=seen.get(key)
        if previous is not None and out[previous:previous+len(raw)]==raw:offset=previous;dedup+=len(raw)
        else:
            out.extend(b'\0'*((-len(out))%4));offset=len(out);out.extend(raw);seen[key]=offset
        v['byteOffset']=offset;v['byteLength']=len(raw)
    new['buffers'][0]['byteLength']=len(out)
    candidate=pack(new,bytes(out));verify(data,candidate)
    return (candidate if len(candidate)<len(data) else data),{'deduplicatedBytes':dedup,'pngBytesSaved':pngsaved}

def inventory(j):
    acc=j.get('accessors',[]);tri=0
    for m in j.get('meshes',[]):
        for p in m['primitives']:
            if p.get('mode',4)==4:tri+=acc[p['indices'] if 'indices' in p else p['attributes']['POSITION']]['count']//3
    return {'triangles':tri,'meshes':len(j.get('meshes',[])),'skins':len(j.get('skins',[])),
        'animations':[{'name':a.get('name',''),'channels':len(a['channels'])} for a in j.get('animations',[])],
        'morphPrimitives':sum(bool(p.get('targets')) for m in j.get('meshes',[]) for p in m['primitives']),
        'extensions':j.get('extensionsUsed',[]),'assetMetadata':j.get('asset',{})}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('source',type=pathlib.Path);ap.add_argument('output',type=pathlib.Path);ap.add_argument('--preserve',action='append',default=[]);ap.add_argument('--min-saving',type=int,default=1024);args=ap.parse_args();args.output.mkdir(parents=True,exist_ok=True);report=[]
    for p in sorted(args.source.glob('*.glb')):
        data=p.read_bytes();item={'file':p.name,'before':len(data),'sha256Before':hashlib.sha256(data).hexdigest(),**inventory(unpack(data)[0])}
        if p.name=='DevoradorLunar.glb' or p.name in args.preserve:result=data;item.update(status='preserved-frozen',reason='Frozen or inactive archived asset; preserve original')
        else:
            try:
                result,details=optimize(data)
                if len(data)-len(result)<args.min_saving:result=data
                item.update(details,status='candidate' if result!=data else 'unchanged')
            except ValueError as e:result=data;item.update(status='rejected',reason=str(e))
        (args.output/p.name).write_bytes(result);item.update(after=len(result),sha256After=hashlib.sha256(result).hexdigest());report.append(item)
    (args.output/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
    print(json.dumps({'files':len(report),'changed':sum(r['status']=='candidate' for r in report),'before':sum(r['before'] for r in report),'after':sum(r['after'] for r in report)}))
if __name__=='__main__':main()
