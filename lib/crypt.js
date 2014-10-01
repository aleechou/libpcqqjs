var Long = require('./goog.math.Long');

var op = new Long(0xffffffff)


function xor(a, b){
    var a1 = a.readUInt32BE(0)
    var a2 = a.readUInt32BE(4)

    var b1 = b.readUInt32BE(0)
    var b2 = b.readUInt32BE(4)

    var r = new Buffer(8)
    r.writeInt32BE(( a1 ^ b1) & op,0)
    r.writeInt32BE(( a2 ^ b2) & op,4)
    return r
}

function encipher(v, k){
    /*
    TEA encipher encrypt 64 bits value, by 128 bits key,
    QQ do 16 round TEA.
    To see:
    http://www.ftp.cl.cam.ac.uk/ftp/papers/djw-rmn/djw-rmn-tea.html .
    TEA 加密,  64比特明码, 128比特密钥, qq的TEA算法使用16轮迭代
    具体参看
    http://www.ftp.cl.cam.ac.uk/ftp/papers/djw-rmn/djw-rmn-tea.html
    >>> c = encipher('abcdefgh', 'aaaabbbbccccdddd')
    >>> b2a_hex(c)
    'a557272c538d3e96'
    */
    var n=16 
    var delta = Long.fromInt(0x9E3779B9)

    var k = [
        Long.fromInt(k.readUInt32BE(0))
        , Long.fromInt(k.readUInt32BE(4))
        , Long.fromInt(k.readUInt32BE(8))
        , Long.fromInt(k.readUInt32BE(12))
    ]
    var y = Long.fromInt(v.readUInt32BE(0))
    var z = Long.fromInt(v.readUInt32BE(4))

    var s = new Long(0)

    for(var i=0;i<n;i++){
        s = s.add(delta)

        //y += (op &(z << 4))+ k[0] ^ z+ s ^ (op&(z >> 5)) + k[1]
        //y &= op
        y = y.add(
                op.and(z.shiftLeft(4)).add(k[0])
                .xor( z.add(s) )
                .xor( op.and(z.shiftRight(5)).add(k[1]) )
            )
            .and(op)

        //z += (op &(y << 4))+ k[2] ^ y+ s ^ (op&(y >> 5)) + k[3]
        //z &= op
        z = z.add(
                op.and(y.shiftLeft(4)).add(k[2])
                    .xor(y.add(s))
                    .xor(op.and(y.shiftRight(5)).add(k[3]))
            )
            .and(op)
    }

    var r = new Buffer(8)
    r.writeUInt32BE(y.toNumber(),0)
    r.writeUInt32BE(z.toNumber(),4)
    return r
}


function safemod(v,m){
    // 负数取模，先转换为 uint 正数
    if(v<0){
        v = 0xffffffff + v + 1
    }
    return v%m
}

var END_CHARS = new Buffer([0,0,0,0,0,0,0])
exports.encrypt = function (v, k){
    /*
    Encrypt Message follow QQ's rule.
    用QQ的规则加密消息
    参数 v 是被加密的明文, k是密钥
    >>> en = encrypt('', b2a_hex('b537a06cf3bcb33206237d7149c27bc3'))
    >>> decrypt(en,  b2a_hex('b537a06cf3bcb33206237d7149c27bc3'))
    */
    // END_CHAR = '\0'
    FILL_N_OR = 0xF8

    var vl = v.length
    var filln = safemod(8-(vl+2),8) + 2

    var fills = new Buffer(filln)
    for(var i=0;i<filln;i++){
        fills.writeUInt8( Math.floor(Math.random()*256), i )
    }

    v = Buffer.concat([
        new Buffer([(filln -2)|FILL_N_OR])
        , fills
        , v
        , END_CHARS
    ])
    var tr = new Buffer([0,0,0,0, 0,0,0,0])
    var to = new Buffer([0,0,0,0, 0,0,0,0])

    r = new Buffer(0)
    for(var i=0;i<v.length;i+=8){
        var o = xor(v.slice(i,i+8), tr)
        tr = xor( encipher(o, k), to)
        to = o
        r = Buffer.concat([r,tr])
    }
    return r
}


function decipher(v, k){

    var n = 16

    var y = Long.fromInt(v.readUInt32BE(0))
    var z = Long.fromInt(v.readUInt32BE(4))

    var a = Long.fromInt(k.readUInt32BE(0))
    var b = Long.fromInt(k.readUInt32BE(4))
    var c = Long.fromInt(k.readUInt32BE(8))
    var d = Long.fromInt(k.readUInt32BE(12))

    var delta = Long.fromInt(0x9E3779B9)

    var s = delta.shiftLeft(4).and(op)
    for(var i=0;i<n;i++){

        // z -= ((y << 4) + c) ^ (y + s) ^ ((y >> 5) + d)
        // z &= op
        z = z.subtract( 
                y.shiftLeft(4).add(c)
                    .xor( y.add(s) )
                    .xor( y.shiftRight(5).add(d) )
            )
            .and(op)

        //y -= ((z << 4) + a) ^ (z + s) ^ ((z >> 5) + b)
        //y &= op
        y = y.subtract(
                z.shiftLeft(4).add(a)
                    .xor(z.add(s))
                    .xor(z.shiftRight(5).add(b))
            )
            .and(op)

        s = s.subtract(delta)
    }
    var r = new Buffer(8)
    r.writeUInt32BE(y.toNumber(),0)
    r.writeUInt32BE(z.toNumber(),4)
    return r
}



exports.decrypt = function(v, k){

    var l = v.length
    if(l%8){
        throw new Error("v 必须是8的倍数")
    }
    var prePlain = decipher(v,k)

    var pos = (prePlain[0] & 0x07) +2
    var r = prePlain
    var preCrypt = v.slice(0,8)

    for(var i=8;i<l;i+=8){

        var h = xor(v.slice(i,i+8), prePlain)
        var x = xor(decipher(h,k), preCrypt)
        prePlain = xor(x, preCrypt)
        preCrypt = v.slice(i,i+8)
        r = Buffer.concat([r,x])
        // r += x
    }

    // 后7位为 00
    for(var i=1;i<=7;i++){
        if( r.readUInt8(r.length-i) != 0x00 ){
            return null
        }
    }
    return r.slice(pos+1,r.length-7)
}

