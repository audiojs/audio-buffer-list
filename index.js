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
var extend = require('object-assign')
var nidx = require('negative-index')

module.exports = AudioBufferList


inherit(AudioBufferList, BufferList)


function AudioBufferList(callback, options) {
  if (!(this instanceof AudioBufferList)) return new AudioBufferList(callback, options)

  extend(this, options)

  this._bufs  = []
  this.length = 0
  this.duration = 0

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


//AudioBuffer interface
AudioBufferList.prototype.numberOfChannels = 0
AudioBufferList.prototype.sampleRate = null

//copy from channel into destination array
AudioBufferList.prototype.copyFromChannel = function (destination, channel, startInChannel) {
  if (startInChannel == null) startInChannel = 0
  var offsets = this._offset(startInChannel)
  var offset = startInChannel - offsets[1]
  var initialOffset = offsets[1]
  for (var i = offsets[0], l = this._bufs.length; i < l; i++) {
    var buf = this._bufs[i]
    var data = buf.getChannelData(channel)
    if (startInChannel > offset) data = data.subarray(startInChannel)
    if (channel < buf.numberOfChannels) {
      destination.set(data, Math.max(0, offset - initialOffset))
    }
    offset += buf.length
  }
}

//put data from array to channel
AudioBufferList.prototype.copyToChannel = function (source, channel, startInChannel) {
  if (startInChannel == null) startInChannel = 0
  var offsets = this._offset(startInChannel)
  var offset = startInChannel - offsets[1]
  for (var i = offsets[0], l = this._bufs.length; i < l; i++) {
    var buf = this._bufs[i]
    var data = buf.getChannelData(channel)
    if (channel < buf.numberOfChannels) {
      data.set(source.subarray(Math.max(offset, startInChannel), offset + data.length), Math.max(0, startInChannel - offset));
    }
    offset += buf.length
  }
}

//return float array with channel data
AudioBufferList.prototype.getChannelData = function (channel, from, to) {
  if (from == null) from = 0
  if (to == null) to = this.length
  from = nidx(from, this.length)
  to = nidx(to, this.length)

  if (!this._bufs.length || from === to) return new Float32Array()

  //shortcut single buffer preserving subarraying
  if (this._bufs.length === 1) {
    return this._bufs[0].getChannelData(channel).subarray(from, to)
  }

  var floatArray = this._bufs[0].getChannelData(0).constructor
  var data = new floatArray(to - from)
  var fromOffset = this._offset(from)
  var toOffset = this._offset(to)

  var firstBuf = this._bufs[fromOffset[0]]
  data.set(firstBuf.getChannelData(channel).subarray(fromOffset[1]))

  var offset = -fromOffset[1] + firstBuf.length
  for (var i = fromOffset[0] + 1, l = toOffset[0]; i < l; i++) {
    var buf = this._bufs[i]
    data.set(buf.getChannelData(channel), offset);
    offset += buf.length
  }
  var lastBuf = this._bufs[toOffset[0]]
  data.set(lastBuf.getChannelData(channel).subarray(0, toOffset[1]), offset)

  return data
}


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
		buf = new AudioBuffer(this.numberOfChannels, buf)
		this._appendBuffer(buf)
	}

	return this
}

AudioBufferList.prototype._appendBuffer = function (buf) {
  // if (buf.sampleRate != this.sampleRate) throw Error('Required sample rate is ' + this.sampleRate + ', passed ' + buf.sampleRate)

  BufferList.prototype._appendBuffer.call(this, buf)

  // if (buf.numberOfChannels != this.numberOfChannels) throw Error('Required number of channels is ' + this.numberOfChannels + ', passed ' + buf.numberOfChannels)
  //update channels count
  this.numberOfChannels = Math.max(this.numberOfChannels, buf.numberOfChannels)
  this.duration += buf.duration

  //init sampleRate
  if (!this.sampleRate) this.sampleRate = buf.sampleRate

  return this
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
		return dst || new AudioBuffer(this.numberOfChannels, 0)
	if (srcEnd <= 0)
		return dst || new AudioBuffer(this.numberOfChannels, 0)

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
        ? util.slice(this._bufs[0])
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
      : util.slice(this._bufs[off[0]], start, start + bytes)
  }

  if (!copy) // a slice, we need something to copy in to
    dst = new AudioBuffer(this.numberOfChannels, len)

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
  end = end == null ? this.length : end

  if (start < 0)
    start += this.length
  if (end < 0)
    end += this.length

  if (start == end) {
    let res = new AudioBufferList([])
    return res
  }

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
      //util.subbuffer would remain buffer in memory though it is faster
      this._bufs[0] = util.subbuffer(this._bufs[0], bytes)
      this.length -= bytes
      break
    }
  }
  this.duration = this.length / this.sampleRate
  return this
}

//clone with preserving data
AudioBufferList.prototype.duplicate = function duplicate () {
  var i = 0, copy = new AudioBufferList()

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



// Additional methods

//repeat contents N times
AudioBufferList.prototype.repeat = function (times) {
  times = Math.floor(times)
  if (!times && times !== 0 || !Number.isFinite(times)) throw RangeError('Repeat count must be non-negative number.')

  if (!times) {
    this.consume(this.length)
    return this
  }

  if (times === 1) return this

  var data = this
  for (var i = 1; i < times; i++) {
    data = data.slice()
    this.append(data)
  }

  return this
}

//insert new buffer/buffers at the offset
AudioBufferList.prototype.insert = function (source, offset) {
  if (offset == null) return this.append(source)

  offset = nidx(offset, this.length)

  var offsets = this._offset(offset)
  var leftBuf = offsets[1] ? util.subbuffer(this._bufs[offsets[0]], 0, offsets[1]) : null
  var rightBuf = offsets[1] !== this._bufs[offsets[0]].length ? util.subbuffer(this._bufs[offsets[0]], offsets[1]) : null

  //convert any type of source to audio buffer list
  source = new AudioBufferList(source)

  //form new list
  let bufs = this._bufs.slice(0, offsets[0])
  if (leftBuf) bufs.push(leftBuf)
  bufs = bufs.concat(source._bufs)
  if (rightBuf) bufs.push(rightBuf)
  bufs = bufs.concat(this._bufs.slice(offsets[0] + 1))

  this._bufs = bufs

  //update params
  this.length += source.length
  this.duration += source.duration

  return this
}

//delete N samples from any position
AudioBufferList.prototype.delete = function (count, offset) {
  if (offset == null) offset = 0
  if (!count) return this

  if (count < 0) {
    count = -count
    offset -= count
  }

  offset = nidx(offset, this.length)

  var offsetsLeft = this._offset(offset)
  var offsetsRight = this._offset(offset + count)

  //same segment slice
  var leftBuf = offsetsLeft[1] ? util.subbuffer(this._bufs[offsetsLeft[0]], 0, offsetsLeft[1]) : null;
  var rightBuf = this._bufs[offsetsRight[0]].length !== offsetsRight[1] ? util.subbuffer(this._bufs[offsetsRight[0]], offsetsRight[1]) : null;

  //delete buffers
  this._bufs.splice(offsetsLeft[0], offsetsRight[0] - offsetsLeft[0] + 1)

  //insert buffers
  if (rightBuf) this._bufs.splice(offsetsLeft[0], 0, rightBuf)
  if (leftBuf) this._bufs.splice(offsetsLeft[0], 0, leftBuf)

  this.length -= count
  this.duration = this.length / this.sampleRate

  return this
}

//return new list via applying fn to each buffer from the indicated range
AudioBufferList.prototype.map = function map (fn, from, to) {
  if (from == null) from = 0
  if (to == null) to = this.length
  from = nidx(from, this.length)
  to = nidx(to, this.length)

  let fromOffset = this._offset(from)
  let toOffset = this._offset(to)

  let maxChannels = 0, offset = from - fromOffset[1]
  let before = this._bufs.slice(0, fromOffset[0])
  let after = this._bufs.slice(toOffset[0] + 1)
  let middle = this._bufs.slice(fromOffset[0], toOffset[1] + 1)

  middle = middle.map((buf, idx) => {
    let result = fn.call(this, buf, idx, offset, this._bufs, this)
    if (result === undefined || result === true) result = buf
    //ignore removed buffers
    if (!result) {
      return null;
    }

    //track offset
    offset += result.length

    return result
  })
  .filter((buf) => {
    return buf ? !!buf.length : false
  })

  return new AudioBufferList(before.concat(middle).concat(after))
}

//apply fn to every buffer for the indicated range
AudioBufferList.prototype.each = function each (fn, from, to) {

}
