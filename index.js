var crypt = require('./lib/crypt.js');


var dgram = require('dgram')

// var message = new Buffer("Some bytes");
var account = new Buffer([0x04,0x8F,0x9A,0x47])
var pkgstart = new Buffer([2])
var pkgversion = new Buffer([0x35,0x3B])	 // 2014
var pkgcmd_touch = new Buffer([0x08,0x25])
var pkgpad = crypt.buffFromText("03 00 00 00 01 01 01 00 00 67 1D 00 00 00 00")
var key = crypt.buffFromText("B9 49 1B 13 18 B0 A0 97 8E 8A A0 2E 47 23 C7 1F")



var client = dgram.createSocket("udp4")
client.send(message, 0, message.length, 8000, "sz2.tencent.com", function(err, bytes) {
	client.close();
})