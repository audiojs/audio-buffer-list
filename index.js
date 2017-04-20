/**
 * AudioBuffer class
 *
 * @module audio-buffer/buffer
 *
 */
'use strict'

var isAudioBuffer = require('is-audio-buffer')
var inherit = require('inherits')
var util = require('audio-buffer-utils')
var AudioBuffer = require('audio-buffer')
var extend = require('object-assign')
var nidx = require('negative-index')
var isPlainObj = require('is-plain-obj')
var Emitter = require('events')

module.exports = AudioBufferList


inherit(AudioBufferList, Emitter)


function AudioBufferList(arg, options) {
  if (!(this instanceof AudioBufferList)) return new AudioBufferList(arg, options)

  extend(this, options)

  this.buffers = []
  this.length = 0
  this.duration = 0

  this.append(arg)
}


//AudioBuffer interface
AudioBufferList.prototype.numberOfChannels = 0
AudioBufferList.prototype.sampleRate = null

//copy from channel into destination array
AudioBufferList.prototype.copyFromChannel = function (destination, channel, startInChannel) {
  if (startInChannel == null) startInChannel = 0
  var offsets = this.offset(startInChannel)
  var offset = startInChannel - offsets[1]
  var initialOffset = offsets[1]
  for (var i = offsets[0], l = this.buffers.length; i < l; i++) {
    var buf = this.buffers[i]
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
  var offsets = this.offset(startInChannel)
  var offset = startInChannel - offsets[1]
  for (var i = offsets[0], l = this.buffers.length; i < l; i++) {
    var buf = this.buffers[i]
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

  if (!this.buffers.length || from === to) return new Float32Array()

  //shortcut single buffer preserving subarraying
  if (this.buffers.length === 1) {
    return this.buffers[0].getChannelData(channel).subarray(from, to)
  }

  var floatArray = this.buffers[0].getChannelData(0).constructor
  var data = new floatArray(to - from)
  var fromOffset = this.offset(from)
  var toOffset = this.offset(to)

  var firstBuf = this.buffers[fromOffset[0]]
  data.set(firstBuf.getChannelData(channel).subarray(fromOffset[1]))

  var offset = -fromOffset[1] + firstBuf.length
  for (var i = fromOffset[0] + 1, l = toOffset[0]; i < l; i++) {
    var buf = this.buffers[i]
    data.set(buf.getChannelData(channel), offset);
    offset += buf.length
  }
  var lastBuf = this.buffers[toOffset[0]]
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
    for (; i < buf.buffers.length; i++)
      this.append(buf.buffers[i])
  }
  //create AudioBuffer from arg
  else if (buf != null) {
		buf = new AudioBuffer(this.numberOfChannels || 2, buf)
		this._appendBuffer(buf)
	}

	return this
}


AudioBufferList.prototype._offset =
AudioBufferList.prototype.offset = function _offset (offset) {
  var tot = 0, i = 0, _t
  if (offset === 0) return [ 0, 0 ]
  for (; i < this.buffers.length; i++) {
    _t = tot + this.buffers[i].length
    if (offset < _t || i == this.buffers.length - 1)
      return [ i, offset - tot ]
    tot = _t
  }
}


AudioBufferList.prototype._appendBuffer = function (buf) {
  // if (buf.sampleRate != this.sampleRate) throw Error('Required sample rate is ' + this.sampleRate + ', passed ' + buf.sampleRate)
  this.buffers.push(buf)
  this.length += buf.length

  // if (buf.numberOfChannels != this.numberOfChannels) throw Error('Required number of channels is ' + this.numberOfChannels + ', passed ' + buf.numberOfChannels)
  //update channels count
  this.numberOfChannels = Math.max(this.numberOfChannels, buf.numberOfChannels)
  this.duration += buf.duration

  //init sampleRate
  if (!this.sampleRate) this.sampleRate = buf.sampleRate

  return this
}

//return single audiobuffer with data
AudioBufferList.prototype.get = function get (start, end) {
  if (start == null) start = 0
  if (end == null) end = this.length
  start = nidx(start, this.length)
  end = nidx(end, this.length)

  return this.copy(null, 0, start, end)
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
    , off    = this.offset(srcStart)
    , len    = srcEnd - srcStart
    , bytes  = len
    , bufoff = (copy && dstStart) || 0
    , start  = off[1]
    , l
    , i

  // copy/slice everything
  if (srcStart === 0 && srcEnd == this.length) {
    if (!copy) { // slice, but full concat if multiple buffers
      return this.buffers.length === 1
        ? util.slice(this.buffers[0])
        : util.concat(this.buffers)
    }
    // copy, need to copy individual buffers
    for (i = 0; i < this.buffers.length; i++) {
      util.copy(this.buffers[i], dst, bufoff)
      bufoff += this.buffers[i].length
    }

    return dst
  }

  // easy, cheap case where it's a subset of one of the buffers
  if (bytes <= this.buffers[off[0]].length - start) {
    return copy
      ? util.copy(util.subbuffer(this.buffers[off[0]], start, start + bytes), dst, dstStart)
      : util.slice(this.buffers[off[0]], start, start + bytes)
  }

  if (!copy) // a slice, we need something to copy in to
    dst = new AudioBuffer(this.numberOfChannels, len)

  for (i = off[0]; i < this.buffers.length; i++) {
    l = this.buffers[i].length - start

    if (bytes > l) {
      util.copy(util.subbuffer(this.buffers[i], start), dst, bufoff)
    } else {
      util.copy(util.subbuffer(this.buffers[i], start, start + bytes), dst, bufoff)
      break
    }

    bufoff += l
    bytes -= l

    if (start)
      start = 0
  }

  return dst
}

//do superficial handle
AudioBufferList.prototype.slice =
AudioBufferList.prototype.shallowSlice =
function slice (start, end) {
  start = start || 0
  end = end == null ? this.length : end

  start = nidx(start, this.length)
  end = nidx(end, this.length)

  if (start == end) {
    return new AudioBufferList()
  }

  var startOffset = this.offset(start)
    , endOffset = this.offset(end)
    , buffers = this.buffers.slice(startOffset[0], endOffset[0] + 1)

  if (endOffset[1] == 0) {
    buffers.pop()
  }
  else {
    buffers[buffers.length-1] = util.subbuffer(buffers[buffers.length-1], 0, endOffset[1])
  }

  if (startOffset[1] != 0) {
    buffers[0] = util.subbuffer(buffers[0], startOffset[1])
  }

  return new AudioBufferList(buffers)
}

AudioBufferList.prototype.consume = function consume (bytes) {
  while (this.buffers.length) {
    if (bytes >= this.buffers[0].length) {
      bytes -= this.buffers[0].length
      this.length -= this.buffers[0].length
      this.buffers.shift()
    } else {
      //util.subbuffer would remain buffer in memory though it is faster
      this.buffers[0] = util.subbuffer(this.buffers[0], bytes)
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

  for (; i < this.buffers.length; i++)
    copy.append(this.buffers[i])

  return copy
}

//clone with copying the data
AudioBufferList.prototype.clone = function clone () {
  var i = 0, copy = new AudioBufferList()

  for (; i < this.buffers.length; i++)
    copy.append(utils.clone(this.buffers[i]))

  return copy
}

//clean up
AudioBufferList.prototype.destroy = function destroy () {
  this.buffers.length = 0
  this.length = 0
}


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
    data = new AudioBufferList(data.copy())
    this.append(data)
  }

  return this
}

//insert new buffer/buffers at the offset
AudioBufferList.prototype.insert = function (source, offset) {
  if (offset == null) return this.append(source)

  offset = nidx(offset, this.length)

  var offsets = this.offset(offset)
  var leftBuf = offsets[1] ? util.subbuffer(this.buffers[offsets[0]], 0, offsets[1]) : null
  var rightBuf = offsets[1] !== this.buffers[offsets[0]].length ? util.subbuffer(this.buffers[offsets[0]], offsets[1]) : null

  //convert any type of source to audio buffer list
  source = new AudioBufferList(source)

  //form new list
  let bufs = this.buffers.slice(0, offsets[0])
  if (leftBuf) bufs.push(leftBuf)
  bufs = bufs.concat(source.buffers)
  if (rightBuf) bufs.push(rightBuf)
  bufs = bufs.concat(this.buffers.slice(offsets[0] + 1))

  this.buffers = bufs

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

  var offsetsLeft = this.offset(offset)
  var offsetsRight = this.offset(offset + count)

  //same segment slice
  var leftBuf = offsetsLeft[1] ? util.subbuffer(this.buffers[offsetsLeft[0]], 0, offsetsLeft[1]) : null;
  var rightBuf = this.buffers[offsetsRight[0]].length !== offsetsRight[1] ? util.subbuffer(this.buffers[offsetsRight[0]], offsetsRight[1]) : null;

  //delete buffers
  let deleted = this.buffers.splice(offsetsLeft[0], offsetsRight[0] - offsetsLeft[0] + 1)

  //insert buffers
  if (rightBuf) this.buffers.splice(offsetsLeft[0], 0, rightBuf)
  if (leftBuf) this.buffers.splice(offsetsLeft[0], 0, leftBuf)

  this.length -= count
  this.duration = this.length / this.sampleRate

  return deleted
}

//return new list via applying fn to each buffer from the indicated range
AudioBufferList.prototype.map = function map (fn, from, to) {
  if (from == null) from = 0
  if (to == null) to = this.length
  from = nidx(from, this.length)
  to = nidx(to, this.length)

  let fromOffset = this.offset(from)
  let toOffset = this.offset(to)

  let offset = from - fromOffset[1]
  let before = this.buffers.slice(0, fromOffset[0])
  let after = this.buffers.slice(toOffset[0] + 1)
  let middle = this.buffers.slice(fromOffset[0], toOffset[0] + 1)

  middle = middle.map((buf, idx) => {
    let result = fn.call(this, buf, idx, offset, this.buffers, this)
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
AudioBufferList.prototype.each = function each (fn, from, to, reversed) {
  let options = arguments[arguments.length - 1]
  if (!isPlainObj(options)) options = {reversed: false}

  if (typeof from != 'number') from = 0
  if (typeof to != 'number') to = this.length
  from = nidx(from, this.length)
  to = nidx(to, this.length)

  let fromOffset = this.offset(from)
  let toOffset = this.offset(to)

  let middle = this.buffers.slice(fromOffset[0], toOffset[0] + 1)

  if (options.reversed) {
    let offset = to - toOffset[1]
    for (let i = toOffset[0], l = fromOffset[0]; i >= l; i--) {
      let buf = this.buffers[i]
      let res = fn.call(this, buf, i, offset, this.buffers, this)
      if (res === false) break
      offset -= buf.length
    }
  }
  else {
    let offset = from - fromOffset[1]
    for (let i = fromOffset[0], l = toOffset[0]+1; i < l; i++) {
      let buf = this.buffers[i]
      let res = fn.call(this, buf, i, offset, this.buffers, this)
      if (res === false) break
      offset += buf.length
    }
  }

  return this;
}


