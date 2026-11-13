import unittest,struct,json,zlib,sys,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from lossless import pack,unpack,optimize,verify,recompress_png,png_signature
class LosslessTests(unittest.TestCase):
 def model(self):
  payload=struct.pack('<3f',1,2,3)
  j={'asset':{'version':'2.0','copyright':'preserve me'},'buffers':[{'byteLength':32}], 'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':12},{'buffer':0,'byteOffset':16,'byteLength':12}], 'accessors':[{'bufferView':0,'componentType':5126,'count':1,'type':'VEC3'},{'bufferView':1,'componentType':5126,'count':1,'type':'VEC3'}], 'nodes':[{'name':'hidden-but-required','translation':[1,2,3]}],'extras':{'license':'original'}}
  return pack(j,payload+b'xxxx'+payload+b'junk')
 def test_dedup_preserves_semantics_and_unused_nodes(self):
  a=self.model();b,stats=optimize(a);self.assertTrue(verify(a,b));self.assertLess(len(b),len(a));self.assertEqual(stats['deduplicatedBytes'],12);self.assertEqual(unpack(b)[0]['nodes'],unpack(a)[0]['nodes'])
 def test_idempotent(self):
  b,_=optimize(self.model());c,_=optimize(b);self.assertEqual(b,c)
 def test_corruption_rejected(self):
  b,_=optimize(self.model());c=bytearray(b);c[-1]^=1
  with self.assertRaises(ValueError):verify(self.model(),bytes(c))
 def test_unknown_extensions_preserved_by_rejection(self):
  j,b=unpack(self.model());j['extensionsUsed']=['VENDOR_offsets']
  with self.assertRaises(ValueError):optimize(pack(j,b))
 def test_meshopt_is_not_silently_repacked(self):
  j,b=unpack(self.model());j['bufferViews'][0]['extensions']={'EXT_meshopt_compression':{'byteOffset':0}}
  with self.assertRaises(ValueError):optimize(pack(j,b))
 def test_png_keeps_samples_and_color_metadata(self):
  def c(k,v):return struct.pack('>I',len(v))+k+v+struct.pack('>I',zlib.crc32(k+v))
  p=b'\x89PNG\r\n\x1a\n'+c(b'IHDR',struct.pack('>IIBBBBB',8,8,8,6,0,0,0))+c(b'gAMA',struct.pack('>I',45455))+c(b'IDAT',zlib.compress((b'\0'+bytes([255,10,20,80])*8)*8,0))+c(b'IEND',b'')
  q=recompress_png(p+b'\0\0');self.assertEqual(png_signature(p),png_signature(q));self.assertLess(len(q),len(p))
if __name__=='__main__':unittest.main()
