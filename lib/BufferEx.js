
var readFuncs = {
	"unsigned": {
		"BE": {
			8: Buffer.prototype.readUInt8
			, 16: Buffer.prototype.readUInt16BE
			, 32: Buffer.prototype.readUInt32BE
		}
		, "LE": {
			8: Buffer.prototype.readUInt8
			, 16: Buffer.prototype.readUInt16LE
			, 32: Buffer.prototype.readUInt32LE
		}
	}
	, "signed": {
		"BE": {
			8: Buffer.prototype.readInt8
			, 16: Buffer.prototype.readInt16BE
			, 32: Buffer.prototype.readInt32BE
		}
		, "LE": {
			8: Buffer.prototype.readInt8
			, 16: Buffer.prototype.readInt16LE
			, 32: Buffer.prototype.readInt32LE
		}
	}
}
var writeFuncs = {
	"unsigned": {
		"BE": {
			8: Buffer.prototype.writeUInt8
			, 16: Buffer.prototype.writeUInt16BE
			, 32: Buffer.prototype.writeUInt32BE
		}
		, "LE": {
			8: Buffer.prototype.writeUInt8
			, 16: Buffer.prototype.writeUInt16LE
			, 32: Buffer.prototype.writeUInt32LE
		}
	}
	, "signed": {
		"BE": {
			8: Buffer.prototype.writeInt8
			, 16: Buffer.prototype.writeInt16BE
			, 32: Buffer.prototype.writeInt32BE
		}
		, "LE": {
			8: Buffer.prototype.writeInt8
			, 16: Buffer.prototype.writeInt16LE
			, 32: Buffer.prototype.writeInt32LE
		}
	}
}

function mkconstructor (bytes){
	return function(value,signed,littleEndian){
		var func = writeFuncs
			[signed? "signed": "unsigned"]
			[littleEndian? "LE": "BE"]
			[bytes*8]

		var buff = new Buffer(bytes)
		func.call(buff,value,0)
		return buff
	}
}
Buffer.from8 = mkconstructor(1)
Buffer.from16 = mkconstructor(2)
Buffer.from32 = mkconstructor(4)

Buffer.fromText = function (text){
    text = text.replace(/\s+/mg,"")
    var arr = []
    for(var i=0;i<text.length;i+=2){
        var slice = text.substr(i,2)
        arr.push(parseInt(slice,16))
    }
    return new Buffer(arr)
}
Buffer.prototype.toText = function (){
    return this.toJSON().reduce(function(str,byte){
        return str + (byte<16?"0":"") + byte.toString(16).toLowerCase() + " "
    },"").trim()
}
Buffer.prototype.compare = function(other){
    if(this.length!=other.length)
        return false
    for(var i=0;i<this.length;i++){
        if(this[i]!=other[i]){
            return false
        }
    }
    return true
}


Buffer.prototype.reset = function(){
	this.__seek = 0
	return this
}
Buffer.prototype.forward = function(bytes){
	if(!this.__seek) this.__seek = 0
	this.__seek+= bytes
	return this
}

function mkseekablefunc (bytes){
	return function(signed,littleEndian){
		var func = readFuncs
			[signed? "signed": "unsigned"]
			[littleEndian? "LE": "BE"]
			[bytes*8]

		if(!this.__seek) this.__seek = 0
		var ret = func.call(this,this.__seek)
		this.__seek+= bytes
		return ret
	}
}
Buffer.prototype.r = function(length){
	if(typeof length!="number"){
		throw new Error("length must be a number, input:",length)
	}
	if(!this.__seek) this.__seek = 0
	var start = this.__seek
	if(length>0){
		this.__seek = start + length
	}
	else{
		this.__seek = this.length + length
	}
	return this.slice(start,this.__seek)
}
Buffer.prototype.r8 = mkseekablefunc(1)
Buffer.prototype.r16 = mkseekablefunc(2)
Buffer.prototype.r32 = mkseekablefunc(4)
