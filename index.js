/**
 * AudioBuffer class
 *
 * @module audio-buffer/buffer
 *
 */
'use strict'

var isAudioBuffer = require('is-audio-buffer')
var inherit = require('inherits')
var BufferList = require('bl')
var util = require('audio-buffer-utils')
var AudioBuffer = require('audio-buffer')
var DuplexStream = require('readable-stream/duplex')

module.exports = AudioBufferList


inherit(AudioBufferList, BufferList)


function AudioBufferList(callback) {
  if (!(this instanceof AudioBufferList)) return new AudioBufferList(callback)

  this._bufs  = []
  this.length = 0

  if (typeof callback == 'function') {
    this._callback = callback

    var piper = function piper (err) {
      if (this._callback) {
        this._callback(err)
        this._callback = null
      }
    }.bind(this)

    this.on('pipe', function onPipe (src) {
      src.on('error', piper)
    })
    this.on('unpipe', function onUnpipe (src) {
      src.removeListener('error', piper)
    })
  } else {
    this.append(callback)
  }

  //single line different from bl
  DuplexStream.call(this, {objectMode: true})
}

//track max channels
AudioBufferList.prototype.channels = 1



//patch BufferList methods

AudioBufferList.prototype.append = function (buf) {
	//FIXME: we may want to do resampling/channel mapping here or something
	var i = 0

	if (isAudioBuffer(buf)) {
		this._appendBuffer(buf)
	}
	else if (Array.isArray(buf)) {
		for (; i < buf.length; i++) {
			this.append(buf[i])
		}
	}
	// unwrap argument into individual BufferLists
	else if (buf instanceof AudioBufferList) {
		for (; i < buf._bufs.length; i++)
			this.append(buf._bufs[i])
	}
	//create AudioBuffer from arg
	else if (buf != null) {
    if (typeof buf == 'number') {
      buf = [buf]
    }
		buf = new AudioBuffer(this.channels, buf)
		this._appendBuffer(buf)
	}

	return this
}

AudioBufferList.prototype._appendBuffer = function (buf) {
  BufferList.prototype._appendBuffer.call(this, buf)

  //update channels count
	this.channels = Math.max(this.channels, buf.numberOfChannels)
}

//get method here returns audio buffer with single sample if it makes any sense
AudioBufferList.prototype.get = function get (index, channel) {
  return this.slice(index, index + 1).getChannelData(channel || 0)[0]
}

//copy data to destination audio buffer
AudioBufferList.prototype.copy = function copy (dst, dstStart, srcStart, srcEnd) {
	if (typeof srcStart != 'number' || srcStart < 0)
		srcStart = 0
	if (typeof srcEnd != 'number' || srcEnd > this.length)
		srcEnd = this.length
	if (srcStart >= this.length)
		return dst || new AudioBuffer(this.channels, 1)
	if (srcEnd <= 0)
		return dst || new AudioBuffer(this.channels, 1)

  var copy   = !!dst
    , off    = this._offset(srcStart)
    , len    = srcEnd - srcStart
    , bytes  = len
    , bufoff = (copy && dstStart) || 0
    , start  = off[1]
    , l
    , i

  // copy/slice everything
  if (srcStart === 0 && srcEnd == this.length) {
    if (!copy) { // slice, but full concat if multiple buffers
      return this._bufs.length === 1
        ? this._bufs[0]
        : util.concat(this._bufs)
    }

    // copy, need to copy individual buffers
    for (i = 0; i < this._bufs.length; i++) {
      util.copy(this._bufs[i], dst, bufoff)
      bufoff += this._bufs[i].length
    }

    return dst
  }

  // easy, cheap case where it's a subset of one of the buffers
  if (bytes <= this._bufs[off[0]].length - start) {
    return copy
      ? util.copy(util.subbuffer(this._bufs[off[0]], start, start + bytes), dst, dstStart)
      : util.subbuffer(this._bufs[off[0]], start, start + bytes)
  }

  if (!copy) // a slice, we need something to copy in to
    dst = new AudioBuffer(len)

  for (i = off[0]; i < this._bufs.length; i++) {
    l = this._bufs[i].length - start

    if (bytes > l) {
      util.copy(util.subbuffer(this._bufs[i], start), dst, bufoff)
    } else {
      util.copy(util.subbuffer(this._bufs[i], start, start + bytes), dst, bufoff)
      break
    }

    bufoff += l
    bytes -= l

    if (start)
      start = 0
  }

  return dst
}

AudioBufferList.prototype.shallowSlice = function shallowSlice (start, end) {
  start = start || 0
  end = end || this.length

  if (start < 0)
    start += this.length
  if (end < 0)
    end += this.length

  var startOffset = this._offset(start)
    , endOffset = this._offset(end)
    , buffers = this._bufs.slice(startOffset[0], endOffset[0] + 1)

  if (startOffset[1] != 0)
    buffers[0] = util.subbuffer(buffers[0], startOffset[1])

  if (endOffset[1] == 0)
    buffers.pop()
  else
    buffers[buffers.length-1] = util.subbuffer(buffers[buffers.length-1], 0, endOffset[1])

  return new AudioBufferList(buffers)
}

AudioBufferList.prototype.consume = function consume (bytes) {
  while (this._bufs.length) {
    if (bytes >= this._bufs[0].length) {
      bytes -= this._bufs[0].length
      this.length -= this._bufs[0].length
      this._bufs.shift()
    } else {
      this._bufs[0] = util.slice(this._bufs[0], bytes)
      this.length -= bytes
      break
    }
  }
  return this
}

AudioBufferList.prototype.duplicate = function duplicate () {
  var i = 0
    , copy = new AudioBufferList()

  for (; i < this._bufs.length; i++)
    copy.append(this._bufs[i])

  return copy
}


;(function () {
  var methods = {
      'readDoubleBE' : 8
    , 'readDoubleLE' : 8
    , 'readFloatBE'  : 4
    , 'readFloatLE'  : 4
    , 'readInt32BE'  : 4
    , 'readInt32LE'  : 4
    , 'readUInt32BE' : 4
    , 'readUInt32LE' : 4
    , 'readInt16BE'  : 2
    , 'readInt16LE'  : 2
    , 'readUInt16BE' : 2
    , 'readUInt16LE' : 2
    , 'readInt8'     : 1
    , 'readUInt8'    : 1
  }

  for (var m in methods) {
    (function (m) {
      AudioBufferList.prototype[m] = function (offset) {
        throw Error('AudioBufferList does not support byte methods')
      }
    }(m))
  }
}())



// AudioBuffer properties & methods
AudioBufferList.prototype.duration
AudioBufferList.prototype.numberOfChannels
AudioBufferList.prototype.sampleRate
AudioBufferList.prototype.copyFromChannel
AudioBufferList.prototype.copyToChannel
AudioBufferList.prototype.getChannelData

// Remove buffer dep

// Additional methods


// AudioBufferList.prototype.insert = function (what, start) {

// }

// AudioBufferList.prototype.delete = function (from, duration) {

// }

// AudioBufferList.prototype.splice = function (from, del, insert) {

// }

// AudioBufferList.prototype.slice = function (start, end) {

// }

// AudioBufferList.prototype.copy = function (dest, destStart, start, end) {

// }

//TODO: shallowSlice or handle or subarray - return pointer
