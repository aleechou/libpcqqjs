require('./lib/BufferEx.js')
var crypt = require('./lib/crypt.js')

var dgram = require('dgram')

// var message = new Buffer("Some bytes");
var account = Buffer.from32(12345678)
var pkgstart = Buffer.from8(2)
var pkgend = Buffer.from8(3)
var pkgversion = new Buffer([0x35,0x3B])	 	// 2014
var pkgcmd_touch = new Buffer([0x08,0x25])
var pkg_id = Buffer.from16( Math.floor(Math.random()*65535)+1 )
var pkgpad = Buffer.fromText("03 00 00 00 01 01 01 00 00 67 1D 00 00 00 00")
var key = Buffer.fromText("B9 49 1B 13 18 B0 A0 97 8E 8A A0 2E 47 23 C7 1F")

var pkg_token1 = Buffer.fromText("00 18 00 16 00 01")
var pkg_token2 = Buffer.fromText("00 00 04 45 00 00 00 01 00 00 14 EF")

var fill = Buffer.concat([
	Buffer.fromText("00 00 00 00 03 09 00 08 00 01 B7 3C 31 BF 00 02 00 36 00 12 00 02 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 01 14 00 1D 01 02")
	, Buffer.fromText("00 19") // 后面 19（25）个字节随机
	, Buffer.fromText("03 46 21 02 14 B2 04 B5 44 7B 6A F8 06 39 FC 77 39 47 F0 A5 47 1D A5 DD 7A")
])
var body = Buffer.concat([
	pkg_token1
	, pkg_token2
	, account
	, fill
])

// console.log(Buffer.fromText("000000000114001D0102001902EE875A9FC9E61DDD794D47CF27D4EC85FE07742E7C01851E").length,fill.length,body.length)
var body = crypt.encrypt(body,key)

   
var message = Buffer.concat([
	pkgstart
	, pkgversion
	, pkgcmd_touch
	, pkg_id
	, account
	, pkgpad
	, key
	, body
	, pkgend
])
 

var client = dgram.createSocket("udp4")
client.send(message, 0, message.length, 8000, "sz2.tencent.com", function(err, bytes) {
	// client.close()
	console.log(bytes)
})

client.on("message", function(message, rinfo) {
	client.close()
    console.log("received: ",rinfo)
    // console.log(crypt.buffToText(message))

    // 头字节 02
    if( message.r8()!=2 ){
    	console.log("接收到无效的包")
    	return
    }

    var pkgver = message.r16()
    var pkgcmd = message.r16()
    var pkgid = message.r16()
    var account = message.r32()

    // 3个 0字节作为分隔符
    if( message.r8()!=0 || message.r8()!=0 || message.r8()!=0 ) {
    	console.log("接收到无效的包")
    	return
    }

    var body = message.r(-1)

    // 尾字节 03
    if( message.r8()!=3 ){
    	console.log("接收到无效的包")
    	return
    }

    body = crypt.decrypt(body,key)
    if(!body){
    	console.log("无法解密数据包的body")
    	return
    }

	var forward = body.r8()
	if(forward){
		console.log("需要跳转",forward)
		console.log(body.toText())
		// todo ...
	}

	if( body.r8()!=0x01 || body.r8()!=0x12 ){
		console.log("接收到无效的包")
    	return
	}

	var stashlen = body.r16()
	//console.log(stashlen)
	// stashlen+5,
	body.r(stashlen)

	// 固定字节 00 17 00 0E 00 01
	if( !body.r(6).compare(Buffer.fromText("00 17 00 0E 00 01")) ){
		console.log("无效的包")
		return
	}

	var time = body.r32()
	var ip = [body.r8(),body.r8(),body.r8(),body.r8()]
	console.log("time",time)
	console.log("ip",ip.join("."))
})


/*
00

01 12

00 38

c0 b5 1f 41 7f 5a 84 f1 5f 59 e3 2d 71 5d 44 81 99 08 da b2 64 46 b3 b3 2b a0 7b eb 58 08 21 a3 20 4f 0b 0b 64 66 e6 83 05 d6 be 56 a3 5c 58 e5 c0 9e af 97 84 22 e4 55

00 17 00 0e 00 01

54 2c 4c 8b

de 5d 1b 50

72 63 00 00

03 10 00 04 b7 3c 38 0e
*/
