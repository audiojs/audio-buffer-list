/**
 * AudioBufferList class
 */

import util from 'audio-buffer-utils'

export default AudioBufferList

// @constructor
function AudioBufferList(arg, options) {
  if (arg?.constructor === Object && !options) options = arg, arg = null

  if (!(this instanceof AudioBufferList)) return new AudioBufferList(arg, options)

  if (typeof options === 'number') {
    options = {channels: options}
  }
  if (options && options.channels != null) options.numberOfChannels = options.channels

  Object.assign(this, options)

  this.buffers = []
  this.length = 0
  this.duration = 0

  this.append(arg)
}


//AudioBuffer interface
AudioBufferList.prototype.numberOfChannels = 1
AudioBufferList.prototype.sampleRate = null


//copy from channel into destination array
AudioBufferList.prototype.copyFromChannel = function (destination, channel, from, to) {
  if (from == null) from = 0
  if (to == null) to = this.length
  from = nidx(from, this.length)
  to = nidx(to, this.length)

  var fromOffset = this.offset(from)
  var bufOffset = from - fromOffset[1]
  var initialOffset = from
  var toOffset = this.offset(to)

  if (fromOffset[0] === toOffset[0]) {
    var buf = this.buffers[fromOffset[0]]
    var data = buf.getChannelData(channel).subarray(fromOffset[1], toOffset[1])
    destination.set(data)
    return this
  }

  for (var i = fromOffset[0], l = toOffset[0]; i < l; i++) {
    var buf = this.buffers[i]
    var data = buf.getChannelData(channel)
    if (from > bufOffset) data = data.subarray(from - bufOffset)
    if (channel < buf.numberOfChannels) {
      destination.set(data, Math.max(0, -initialOffset + bufOffset))
    }
    bufOffset += buf.length
  }

  var lastBuf = this.buffers[toOffset[0]]
  if (toOffset[1]) {
    destination.set(lastBuf.getChannelData(channel).subarray(0, toOffset[1]), Math.max(0, bufOffset - initialOffset))
  }

  return this
}

//put data from array to channel
AudioBufferList.prototype.copyToChannel = function (source, channel, from) {
  if (from == null) from = 0
  from = nidx(from, this.length)

  var offsets = this.offset(from)
  var bufOffset = from - offsets[1]

  source = source.subarray(0, this.length - from)

  for (var i = offsets[0], l = this.buffers.length; i < l; i++) {
    var buf = this.buffers[i]
    var channelData = buf.getChannelData(channel)
    if (channel < buf.numberOfChannels) {
      var chunk = source.subarray(Math.max(0, bufOffset - from), bufOffset - from + buf.length)
      channelData.set(chunk, from > bufOffset ? from : 0);
    }
    bufOffset += buf.length
  }

  return this
}


// append buffer to list
AudioBufferList.prototype.append = function (buf) {
  if (!buf) return this

  //FIXME: we may want to do resampling/channel mapping here or something
  var i = 0

  const appendBuffer = (buf) => {
    //update channels count
    this.numberOfChannels = !this.buffers.length ? buf.numberOfChannels : Math.max(this.numberOfChannels, buf.numberOfChannels)
    this.duration += buf.duration
    if (!this.sampleRate) this.sampleRate = buf.sampleRate

    //push buffer
    this.buffers.push(buf)
    this.length += buf.length
  }

  // unwrap argument into individual BufferLists
  if (buf instanceof AudioBufferList) {
    this.append(buf.buffers)
  }
  else if (buf.numberOfChannels && buf.length) {
    appendBuffer(buf)
  }
  else if (Array.isArray(buf) && typeof buf[0] !== 'number') {
    for (var l = buf.length; i < l; i++) {
      this.append(buf[i])
    }
  }
  //create AudioBuffer from (possibly num) arg
  else if (buf) {
    buf = util.create(buf, this.numberOfChannels, this.sampleRate)
    appendBuffer(buf)
  }

  return this
}

// get offset from ...
AudioBufferList.prototype.offset = function (offset) {
  var tot = 0, i = 0, _t
  if (offset === 0) return [ 0, 0 ]
  for (; i < this.buffers.length; i++) {
    _t = tot + this.buffers[i].length
    if (offset < _t || i == this.buffers.length - 1)
      return [ i, offset - tot ]
    tot = _t
  }
}



//copy data to destination audio buffer
AudioBufferList.prototype.copy = function copy (dst, dstStart, srcStart, srcEnd) {
  if (typeof dst === 'number') {
    srcEnd = srcStart;
    srcStart = dstStart
    dstStart = dst;
    dst = null;
  }
  if (srcEnd == null && srcStart != null) {
    srcEnd = srcStart
    srcStart = dstStart
    dstStart = 0
  }

  if (typeof srcStart != 'number' || srcStart < 0) srcStart = 0
  if (typeof srcEnd != 'number' || srcEnd > this.length) srcEnd = this.length
  if (srcStart >= this.length) return dst || util.create({length: 0,sampleRate:this.sampleRate})
  if (srcEnd <= 0) return dst || util.create({length: 0,sampleRate:this.sampleRate})

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
    dst = util.create(len, this.numberOfChannels)

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

//create a new list with the same data
AudioBufferList.prototype.clone = function clone (start, end) {
  var i = 0, copy = new AudioBufferList(0, this.numberOfChannels), sublist = this.slice(start, end)

  for (; i < sublist.buffers.length; i++)
    copy.append(util.clone(sublist.buffers[i]))

  return copy
}

//do superficial handle
AudioBufferList.prototype.slice = function slice (start, end) {
  start = start || 0
  end = end == null ? this.length : end

  start = nidx(start, this.length)
  end = nidx(end, this.length)

  if (start == end) {
    return new AudioBufferList(0, this.numberOfChannels)
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

  return new AudioBufferList(buffers, this.numberOfChannels)
}


//clean up
AudioBufferList.prototype.destroy = function destroy () {
  this.buffers.length = 0
  this.length = 0
  this.buffers = null
}


//repeat contents N times
AudioBufferList.prototype.repeat = function (times) {
  times = Math.floor(times)
  if (!times && times !== 0 || !Number.isFinite(times)) throw RangeError('Repeat count must be non-negative number.')

  if (!times) {
    this.remove(0, this.length)
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
AudioBufferList.prototype.insert = function (offset, source) {
  if (source == null) {
    source = offset
    offset = 0
  }

  offset = nidx(offset, this.length)

  this.split(offset)

  offset = this.offset(offset)

  //convert any type of source to audio buffer list
  source = new AudioBufferList(source)

  this.buffers.splice.apply(this.buffers, [offset[0] + (offset[1] ? 1 : 0), 0].concat(source.buffers))

  //update params
  this.length += source.length
  this.duration += source.duration
  this.numberOfChannels = Math.max(source.numberOfChannels, this.numberOfChannels)

  return this
}

//delete N samples from any position
AudioBufferList.prototype.remove = function (offset, count) {
  if (!this.length) return null

  if (count == null) {
    count = offset
    offset = 0
  }
  if (!count) return this

  if (count < 0) {
    count = -count
    offset -= count
  }

  offset = nidx(offset, this.length)
  count = Math.min(this.length - offset, count)

  this.split(offset, offset + count)

  var offsetLeft = this.offset(offset)
  var offsetRight = this.offset(offset + count)

  if (offsetRight[1] === this.buffers[offsetRight[0]].length) {
    offsetRight[0] += 1
  }

  let deleted = this.buffers.splice(offsetLeft[0], offsetRight[0] - offsetLeft[0])
  deleted = new AudioBufferList(deleted, this.numberOfChannels)

  this.length -= deleted.length
  this.duration = this.length / this.sampleRate

  return deleted
}

//return new list via applying fn to each buffer from the indicated range
AudioBufferList.prototype.map = function map (fn, from, to) {
  if (typeof from != 'number') from = 0
  if (typeof to != 'number') to = this.length
  from = nidx(from, this.length)
  to = nidx(to, this.length)

  this.split(from, to)

  let fromOffset = this.offset(from)
  let toOffset = this.offset(to)

  if (toOffset[1]) {
    toOffset[0] += 1
    toOffset[1] = 0
  }
  let offset = from - fromOffset[1]
  for (let i = fromOffset[0], l = toOffset[0]; i < l; i++) {
    let buf = this.buffers[i]
    let res = fn.call(this, buf, i, offset, this.buffers, this)
    if (res === false) break
    if (res !== undefined) {
      this.buffers[i] = res
    }
    offset += buf.length
  }

  this.normalize();

  return this
}

// runs map from tail
AudioBufferList.prototype.reverseMap = function (fn, from, to) {
  if (typeof from != 'number') from = 0
  if (typeof to != 'number') to = this.length
  from = nidx(from, this.length)
  to = nidx(to, this.length)

  this.split(from, to)

  let fromOffset = this.offset(from)
  let toOffset = this.offset(to)

  let offset = to - toOffset[1]
  for (let i = toOffset[0], l = fromOffset[0]; i >= l; i--) {
    let buf = this.buffers[i]
    let res = fn.call(this, buf, i, offset, this.buffers, this)
    if (res === false) break
    if (res !== undefined) this.buffers[i] = res
    offset -= buf.length
  }
}

// remove empty buffers, normalize number of channels, length, duration
AudioBufferList.prototype.normalize = function () {
  this.buffers = this.buffers.filter(buf => {
    return buf ? !!buf.length : false
  })

  let l = 0
  for (let i = 0; i < this.buffers.length; i++) {
    this.numberOfChannels = Math.max(this.buffers[i].numberOfChannels, this.numberOfChannels)
    l += this.buffers[i].length
  }
  this.length = l
  this.duration = this.length / this.sampleRate

}


//split at the indicated indexes
AudioBufferList.prototype.split = function split () {
  let args = arguments;

  for (let i = 0; i < args.length; i++ ) {
    let arg = args[i]
    if (Array.isArray(arg)) {
      this.split.apply(this, arg)
    }
    else if (typeof arg === 'number') {
      let offset = this.offset(arg)
      let buf = this.buffers[offset[0]]

      if (offset[1] > 0 && offset[1] < buf.length) {
        let left = util.subbuffer(buf, 0, offset[1])
        let right = util.subbuffer(buf, offset[1])

        this.buffers.splice(offset[0], 1, left, right)
      }
    }
  }

  return this
}


//join buffers within the subrange
AudioBufferList.prototype.join = function join (from, to) {
  if (from == null) from = 0
  if (to == null) to = this.length

  from = nidx(from, this.length)
  to = nidx(to, this.length)

  let fromOffset = this.offset(from)
  let toOffset = this.offset(to)

  if (toOffset[1]) {
    toOffset[0] += 1
    toOffset[1] = 0
  }

  let bufs = this.buffers.slice(fromOffset[0], toOffset[0])

  let buf = util.concat(bufs)

  this.buffers.splice.apply(this.buffers, [fromOffset[0], toOffset[0] - fromOffset[0] + (toOffset[1] ? 1 : 0)].concat(buf))

  return buf
}

// negative-index package (no need to store as dep)
function nidx (idx, length) {
	return idx == null ? 0 :
		idx < 0 ? Math.max(idx + length, 0) :
		idx > 0 ? Math.min(length, idx) :
		Object.is(idx, -0) ? length : 0
}