import zlib,struct
def read(path):
    d=open(path,'rb').read(); pos=8; idat=b''
    while pos<len(d):
        n,t=struct.unpack('>I4s',d[pos:pos+8]); body=d[pos+8:pos+8+n]; pos+=12+n
        if t==b'IHDR': W,H,bd,ct=struct.unpack('>IIBB',body[:10])
        elif t==b'IDAT': idat+=body
    bpp={6:4,2:3,0:1,4:2}[ct]; raw=zlib.decompress(idat); st=W*bpp; out=[]; prev=bytearray(st); i=0
    for y in range(H):
        f=raw[i]; line=bytearray(raw[i+1:i+1+st]); i+=1+st
        for x in range(st):
            a=line[x-bpp] if x>=bpp else 0; b=prev[x]; c=prev[x-bpp] if x>=bpp else 0
            if f==1: line[x]=(line[x]+a)&255
            elif f==2: line[x]=(line[x]+b)&255
            elif f==3: line[x]=(line[x]+(a+b)//2)&255
            elif f==4:
                p=a+b-c; pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
                line[x]=(line[x]+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
        prev=line
        row=[]
        for x in range(W):
            px=tuple(line[x*bpp:(x+1)*bpp])
            if bpp==3: px=px+(255,)
            elif bpp==1: px=(px[0],)*3+(255,)
            elif bpp==2: px=(px[0],)*3+(px[1],)
            row.append(px)
        out.append(row)
    return W,H,out
def write(path,px):
    H=len(px); W=len(px[0]); raw=bytearray()
    for r in px:
        raw.append(0)
        for p in r: raw+=bytes(p)
    ch=lambda t,d: struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    open(path,'wb').write(b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',W,H,8,6,0,0,0))+ch(b'IDAT',zlib.compress(bytes(raw)))+ch(b'IEND',b''))
