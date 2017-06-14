'use strict';

const t = require('tape')
const AudioBufferList = require('./')
const AudioBuffer = require('audio-buffer')
const util = require('audio-buffer-utils')
const isAudioBuffer = require('is-audio-buffer')
const fs = require('fs')


function getChannelData(list, channel, from, to) {
  if (from == null) from = 0
  if (to == null) to = list.length
  let arr = new Float32Array(to - from)
  list.copyFromChannel(arr, channel, from, to)
  return arr
}

t('create with options argument', t => {
  var a = new AudioBufferList({channels: 3})

  t.equal(a.length, 0)
  t.equal(a.channels, 3)

  t.end()
})

//new methods
t('repeat', t => {
  var a = new AudioBufferList(util.create(10, 2))
  a.repeat(0)
  t.equal(a.length, 0)

  var b = new AudioBufferList(util.create(10, 2))
  b.repeat(1)
  t.equal(b.length, 10)

  var c = new AudioBufferList(util.create(10, 2))
  c.repeat(2)
  t.equal(c.length, 20)

  let d = AudioBufferList(2, 2).repeat(4)
  t.equal(d.numberOfChannels, 2)
  t.equal(d.length, 8)

	t.end()
})

t('map', t => {

  //full map
  let list = new AudioBufferList([util.fill(util.create(2, 2), 1), util.fill(util.create(2, 2), 0)])

  let dest = list.map((b, idx) => {
    return util.fill(b, idx)
  })

  t.deepEqual(getChannelData(dest, 0), Array(2).fill(0).concat(Array(2).fill(1)))
  t.deepEqual(getChannelData(dest, 1), Array(2).fill(0).concat(Array(2).fill(1)))

  //subset map
  let list2 = new AudioBufferList([util.fill(util.create(4, 2), 0), util.fill(util.create(4, 2), 0)])

  let dest2 = list2.map((b, idx, offset) => {
    return util.fill(b, 1, Math.max(2 - offset, 0), Math.min(6 - offset, b.length))
  }, 2, 6)

  t.deepEqual(getChannelData(dest2, 1), Array(2).fill(0).concat(Array(4).fill(1)).concat(Array(2).fill(0)))

  //subset length
  let list3 = new AudioBufferList(util.create([0,1,0,-1], 1))
  list3 = list3.map((b, idx) => {return b}, 0, 4)
  t.equal(list3.length, 4)

  //upd channels
  let list4 = new AudioBufferList([util.create(1, 1), util.create(1, 2)])
  list4 = list4.map(buf => util.create(1, 3))
  t.equal(list4.numberOfChannels, 3)

  //change itself
  //track offset
  //filter null/zeros
  //recalculates length & duration
  let list5 = AudioBufferList([util.create([1,1]), util.create([.5,.5]), util.create([-1,-1])])

  let list5res = list5.map((buf, idx, offset) => {
    if (idx === 0) t.equal(offset, 0)
    else if (idx === 2) t.equal(offset, 2)

    if (idx === 1) {
      buf.copyToChannel(new Float32Array([0,0]), 0)
      return null
    }
  })
  t.deepEqual(list5.length, 6)
  t.deepEqual(getChannelData(list5, 0), [1,1,0,0,-1,-1])
  t.deepEqual(list5res.length, 4)
  t.deepEqual(getChannelData(list5res, 0), [1,1,-1,-1])
  t.end()
})

t('each', t => {
  //full each
  let list = new AudioBufferList([util.fill(util.create(2, 2), 1), util.fill(util.create(2, 2), 0)])

  list.each((b, idx) => {
    return util.fill(b, idx)
  })

  t.deepEqual(getChannelData(list, 0), Array(2).fill(0).concat(Array(2).fill(1)))
  t.deepEqual(getChannelData(list, 1), Array(2).fill(0).concat(Array(2).fill(1)))

  //subset each
  let list2 = new AudioBufferList([util.fill(util.create(4, 2), 0), util.fill(util.create(4, 2), 0)])

  list2.each((b, idx, offset) => {
    return util.fill(b, 1, Math.max(2 - offset, 0), Math.min(6 - offset, b.length))
  }, 2, 6)

  t.deepEqual(getChannelData(list2, 1), Array(2).fill(0).concat(Array(4).fill(1)).concat(Array(2).fill(0)))

  //change itself
  //track offset
  //filter null/zeros
  //recalculates length & duration
  let list5 = AudioBufferList([util.create([1,1]), util.create([.5,.5]), util.create([-1,-1])])

  list5.each((buf, idx, offset) => {
    if (idx === 0) t.equal(offset, 0)
    else if (idx === 2) t.equal(offset, 4)

    if (idx === 1) {
      buf.copyToChannel(new Float32Array([0,0]), 0)
      return null
    }
  })
  t.deepEqual(list5.length, 6)
  t.deepEqual(getChannelData(list5, 0), [1,1,0,0,-1,-1])

  //break vicious cycle
  let list6 = AudioBufferList(util.create(2)).repeat(4)
  list6.each((buf, idx, offset) => {
    if (idx > 1) return false
      t.ok(idx <= 1)
  })

  //do reversed walking
  let list7 = AudioBufferList(2).repeat(4)
  t.equal(list7.length, 8)
  let arr = []
  list7.each((buf, idx, offset) => {
    arr.push(idx)
  }, {reversed: true})
  t.deepEqual(arr, [3,2,1,0])

  t.end()
})

t('reverse', t => {
  let list = AudioBufferList(util.create([0,1,2, 3,4,5])).split(3)

  list.reverse(1,5)

  t.deepEqual(getChannelData(list, 0), [0,4,3,2,1,5])

  t.end()
})


//AudioBuffer methods/props
t('AudioBuffer properties', t => {
	let bl = new AudioBufferList(util.create([0,1,2,3], 2))

	t.equal(bl.length, 2)
	t.equal(bl.numberOfChannels, 2)
	t.equal(bl.duration, 2/bl.sampleRate)

	bl.append(util.create([4,5,6,7,8,9,10,11,12,13], 3))

	t.equal(bl.length, 5)
	t.equal(bl.numberOfChannels, 3)
	t.ok(Math.abs(bl.duration - 5/bl.sampleRate) < 1e-8)

	t.end()
})

t('getChannelData', function (t) {
  let bl = new AudioBufferList([util.create(2, 2), util.create(2, 2), util.create(2, 2)])

  t.equal(getChannelData(bl, 0).length, 6)
  t.equal(getChannelData(bl, 0, 3).length, 3)
  t.equal(getChannelData(bl, 0, 2, 4).length, 2)

  t.end()
})

t('copyToChannel', function (t) {
	var a = new AudioBufferList(util.create(2, 2)).repeat(2);
	var arr = new Float32Array(4);
	arr.fill(-1);

	a.copyToChannel(arr, 0, 0);
	t.deepEqual(arr, getChannelData(a, 0));

	a.copyToChannel(arr, 1, 1);

	var zeros = new Float32Array(1);
	arr.set(zeros);

	t.deepEqual(arr, getChannelData(a, 1));
	t.end()
})

t('copyFromChannel', function (t) {
	var a = new AudioBufferList(util.fill(util.create(20, 2), (v, idx, channel) => channel ? 1 : -1)).repeat(2);

	var arr = new Float32Array(40)
	a.copyFromChannel(arr, 0);
	t.deepEqual(arr, getChannelData(a, 0));

	a.copyFromChannel(arr, 1, 10);
	var result = Array(30).fill(1).concat(Array(10).fill(-1));
	t.deepEqual(arr, result);

	t.end()
})

t('split/join', t => {
  let a = AudioBufferList(10)

  t.equal(a.length, 10)
  t.equal(a.buffers.length, 1)

  a.split(4)

  t.equal(a.buffers.length, 2)

  a.split(4)

  t.equal(a.buffers.length, 2)

  a.split(5)

  t.equal(a.buffers.length, 3)

  a.split(10)

  t.equal(a.buffers.length, 3)

  a.split(9,8)

  t.equal(a.buffers.length, 5)

  a.split([7,6])

  t.equal(a.buffers.length, 7)

  a.join()

  t.equal(a.buffers.length, 1)

  t.end()
})

t('remove', t => {
  var a = new AudioBufferList([util.fill(util.create(20, 2), (v, idx, channel) => channel), util.fill(util.create(20, 2), (v, idx, channel) => 1 -channel)]);

  a.remove(10)
  t.equal(a.length, 30)
  t.deepEqual(getChannelData(a,0), Array(10).fill(0).concat(Array(20).fill(1)))
  t.deepEqual(getChannelData(a,1), Array(10).fill(1).concat(Array(20).fill(0)))

  a.remove(8, 10)
  t.equal(a.length, 20)
  t.deepEqual(getChannelData(a,0), Array(8).fill(0).concat(Array(12).fill(1)))
  t.deepEqual(getChannelData(a,1), Array(8).fill(1).concat(Array(12).fill(0)))

  a.remove(-12)
  t.equal(a.length, 8)
  t.deepEqual(getChannelData(a,0), Array(8).fill(0))
  t.deepEqual(getChannelData(a,1), Array(8).fill(1))

  var b = AudioBufferList([util.create([0,1,2]), util.create([3,4,5])])

  b.remove(1, 4)
  t.equal(b.length, 2)

  var c = AudioBufferList(3).repeat(2)
  c.remove(5, 3)
  t.equal(c.length, 5)

	t.end()
})

t('insert', t => {
	var a = new AudioBufferList()

	t.equal(a.length, 0)

	a.insert(2, util.fill(util.create(10,2), 2))

	t.equal(a.length, 10)
	t.equal(a.numberOfChannels, 2)
	t.deepEqual(getChannelData(a, 0), Array(10).fill(2))

	a.insert(2, util.fill(util.create(10,2), (v,i,c) => c))

	t.equal(a.length, 20)
	t.deepEqual(getChannelData(a, 0), Array(2).fill(2).concat(Array(10).fill(0)).concat(Array(8).fill(2)))

	a.insert(-5, util.fill(util.create(10, 2), (v,i,c) => 1-c))

	t.equal(a.length, 30)
	t.deepEqual(getChannelData(a, 1), Array(2).fill(2).concat(Array(10).fill(1)).concat(Array(3).fill(2)).concat(Array(10).fill(0)).concat(Array(5).fill(2)))

	t.end()
})



//bl patch methods
t.skip('single bytes from single buffer', function (t) {
  var bl = new AudioBufferList()
  bl.append(util.create([0,1,2,3]))

  t.equal(bl.length, 4)

  t.equal(bl.get(0)[0], 0)
  t.equal(bl.get(1)[0], 1)
  t.equal(bl.get(2)[0], 2)
  t.equal(bl.get(3)[0], 3)

  t.end()
})

t.skip('single bytes from multiple buffers', function (t) {
  var bl = new AudioBufferList()
  bl.append(util.create([1,2,3,4]))
  bl.append(util.create([5,6,7]))
  bl.append(util.create([8,9]))
  bl.append(util.create([10]))

  t.equal(bl.length, 10)

  t.equal(bl.get(0), 1)
  t.equal(bl.get(1), 2)
  t.equal(bl.get(2), 3)
  t.equal(bl.get(3), 4)
  t.equal(bl.get(4), 5)
  t.equal(bl.get(5), 6)
  t.equal(bl.get(6), 7)
  t.equal(bl.get(7), 8)
  t.equal(bl.get(8), 9)
  t.equal(bl.get(9), 10)
  t.end()
})

t('multi bytes from single buffer', function (t) {
  var bl = new AudioBufferList()
  bl.append(util.create([-1, -.5, 0, 1]))

  t.equal(bl.length, 4)

  t.deepEqual(getChannelData(bl.slice(0, 4), 0), [-1, -.5, 0, 1])
  t.deepEqual(getChannelData(bl.slice(0, 3), 0), [-1, -.5, 0])
  t.deepEqual(getChannelData(bl.slice(1, 4), 0), [-.5, 0, 1])
  t.deepEqual(getChannelData(bl.slice(-4, -1), 0), [-1, -.5, 0])

  t.end()
})

t('multi bytes from single buffer (negative indexes)', function (t) {
  var bl = new AudioBufferList()
  bl.append(util.create([1,2,3,4,5,6,7,8,9,10,11,12], 2))

  t.equal(bl.length, 6)

  t.deepEqual(getChannelData(bl.slice(-6, -1), 0), [1,2,3,4,5])
  t.deepEqual(getChannelData(bl.slice(-6, -2), 0), [1,2,3,4])
  t.deepEqual(getChannelData(bl.slice(-5, -2), 0), [2,3,4])

  t.end()
})

t('multiple bytes from multiple buffers', function (t) {
  var bl = new AudioBufferList()

  bl.append(util.create([0,1,2,3]))
  bl.append(util.create([4,5,6]))
  bl.append(util.create([7,8]))
  bl.append(util.create([9]))

  t.equal(bl.length, 10)

  t.deepEqual(getChannelData(bl.slice(0, 10), 0), [0,1,2,3,4,5,6,7,8,9])
  t.deepEqual(getChannelData(bl.slice(3, 10), 0), [3,4,5,6,7,8,9])
  t.deepEqual(getChannelData(bl.slice(3, 6), 0), [3,4,5])
  t.deepEqual(getChannelData(bl.slice(3, 8), 0), [3,4,5,6,7])
  t.deepEqual(getChannelData(bl.slice(5, 10), 0), [5,6,7,8,9])
  t.deepEqual(getChannelData(bl.slice(-7, -4), 0), [3,4,5])

  t.end()
})

t('multiple bytes from multiple buffer lists', function (t) {
  var bl = new AudioBufferList()

  bl.append(new AudioBufferList([ util.create([0,1,2,3]), util.create([4,5,6]) ]))
  bl.append(new AudioBufferList([ util.create([7,8]), util.create([9]) ]))

  t.equal(bl.length, 10)

  t.deepEqual(getChannelData(bl.slice(0, 10), 0), [0,1,2,3,4,5,6,7,8,9])
  t.deepEqual(getChannelData(bl.slice(3, 10), 0), [3,4,5,6,7,8,9])
  t.deepEqual(getChannelData(bl.slice(3, 6), 0), [3,4,5])
  t.deepEqual(getChannelData(bl.slice(3, 8), 0), [3,4,5,6,7])
  t.deepEqual(getChannelData(bl.slice(5, 10), 0), [5,6,7,8,9])

  t.end()
})

// same data as previous test, just using nested constructors
t('multiple bytes from crazy nested buffer lists', function (t) {
  var bl = new AudioBufferList()

  bl.append(new AudioBufferList([
      new AudioBufferList([
          new AudioBufferList(util.create([0,1,2]))
        , util.create([3])
        , new AudioBufferList(util.create([4,5,6]))
      ])
    , new AudioBufferList([ util.create([7,8]) ])
    , new AudioBufferList(util.create([9]))
  ]))

  t.equal(bl.length, 10)

  t.deepEqual(getChannelData(bl.slice(0, 10), 0), [0,1,2,3,4,5,6,7,8,9])

  t.deepEqual(getChannelData(bl.slice(3, 10), 0), [3,4,5,6,7,8,9])
  t.deepEqual(getChannelData(bl.slice(3, 6), 0), [3,4,5])
  t.deepEqual(getChannelData(bl.slice(3, 8), 0), [3,4,5,6,7])
  t.deepEqual(getChannelData(bl.slice(5, 10), 0), [5,6,7,8,9])

  t.end()
})

t('append accepts arrays of Buffers', function (t) {
  var bl = new AudioBufferList()
  bl.append(util.create([0,1,2]))
  bl.append([ util.create([3,4,5]) ])
  bl.append([ util.create([6,7,8]), util.create([9,10,11]) ])
  bl.append([ util.create([12,13,14,15]), util.create([16,17,18,19,20]), util.create([21,22,23,24,25]) ])

  t.equal(bl.length, 26)

  t.deepEqual(getChannelData(bl, 0), [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25])
  t.end()
})

t('append accepts arrays of AudioBufferLists', function (t) {
  var bl = new AudioBufferList()
  bl.append(util.create([0,1,2]))
  bl.append([ new AudioBufferList(util.create([3,4,5])) ])
  bl.append(new AudioBufferList([ util.create([6,7,8]), new AudioBufferList(util.create([9,10,11])) ]))
  bl.append([ util.create([12,13,14,15]), new AudioBufferList([ util.create([16,17,18,19,20]), util.create([21,22,23,24,25]) ]) ])
  t.equal(bl.length, 26)
  t.deepEqual(getChannelData(bl, 0), [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25])
  t.end()
})

t('append chainable', function (t) {
  var bl = new AudioBufferList()
  t.ok(bl.append(util.create([0,1,2,3])) === bl)
  t.ok(bl.append([ util.create([0,1,2,3]) ]) === bl)
  t.ok(bl.append(new AudioBufferList(util.create([0,1,2,3]))) === bl)
  t.ok(bl.append([ new AudioBufferList(util.create([0,1,2,3])) ]) === bl)
  t.end()
})

t('append chainable (test results)', function (t) {
  var bl = new AudioBufferList(util.create([0,1,2]))
    .append([ new AudioBufferList(util.create([3,4,5])) ])
    .append(new AudioBufferList([ util.create([6,7,8]), new AudioBufferList(util.create([9,10,11])) ]))
    .append([ util.create([12,13,14,15]), new AudioBufferList([ util.create([16,17,18,19,20]), util.create([21,22,23,24,25]) ]) ])

  t.equal(bl.length, 26)
  t.deepEqual(getChannelData(bl, 0), [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25])
  t.end()
})

t('consuming from multiple buffers', function (t) {
  var bl = new AudioBufferList()

  bl.append(util.create([0,1,2,3]))
  bl.append(util.create([4,5,6]))
  bl.append(util.create([7,8]))
  bl.append(util.create([9]))

  t.equal(bl.length, 10)

  t.deepEqual(getChannelData(bl.slice(0, 10), 0), [0,1,2,3,4,5,6,7,8,9])

  bl.consume(3)
  t.equal(bl.length, 7)
  t.deepEqual(getChannelData(bl.slice(0, 7), 0), [3,4,5,6,7,8,9])

  bl.consume(2)
  t.equal(bl.length, 5)
  t.deepEqual(getChannelData(bl.slice(0, 5), 0), [5,6,7,8,9])

  bl.consume(1)
  t.equal(bl.length, 4)
  t.deepEqual(getChannelData(bl.slice(0, 4), 0), [6,7,8,9])

  bl.consume(1)
  t.equal(bl.length, 3)
  t.deepEqual(getChannelData(bl.slice(0, 3), 0), [7,8,9])

  bl.consume(2)
  t.equal(bl.length, 1)
  t.deepEqual(getChannelData(bl.slice(0, 1), 0), [9])

  t.end()
})

t('complete consumption', function (t) {
  var bl = new AudioBufferList()

  bl.append(util.create([0]))
  bl.append(util.create([1]))

  bl.consume(2)

  t.equal(bl.length, 0)
  t.equal(bl.buffers.length, 0)

  t.end()
})

t('test readUInt16LE / readUInt16BE / readInt16LE / readInt16BE', function (t) {
  var buf1 = util.create(1)
    , buf2 = util.create(3)
    , buf3 = util.create(3)
    , bl   = new AudioBufferList()

  buf2[1] = 0x3
  buf2[2] = 0x4
  buf3[0] = 0x23
  buf3[1] = 0x42

  bl.append(buf1)
  bl.append(buf2)
  bl.append(buf3)

  t.throws(function () {
	  bl.readUInt16BE(2) // 0x0304
	  bl.readUInt16LE(2) // 0x0403
	  bl.readInt16BE(2) // 0x0304
	  bl.readInt16LE(2) // 0x0403
	  bl.readUInt16BE(3) // 0x0423
	  bl.readUInt16LE(3) // 0x2304
	  bl.readInt16BE(3) // 0x0423
	  bl.readInt16LE(3) // 0x2304
	  bl.readUInt16BE(4) // 0x2342
	  bl.readUInt16LE(4) // 0x4223
	  bl.readInt16BE(4) // 0x2342
	  bl.readInt16LE(4) // 0x4223
  })
  t.end()
})


t('basic copy', function (t) {
  var buf  = util.noise(util.create(1024))
    , buf2 = util.create(1024)
    , b    = AudioBufferList(buf)
  b.copy(buf2)
  t.deepEqual(getChannelData(b, 0), getChannelData(buf2, 0), 'same buffer')
  t.end()
})

t('copy after many appends', function (t) {
  var buf  = util.noise(util.create(512))
    , buf2 = util.create(1024)
    , b    = AudioBufferList(buf)

  b.append(buf)
  b.copy(buf2)
  t.deepEqual(getChannelData(b, 0), getChannelData(buf2, 0), 'same buffer')
  t.end()
})

t('copy at a precise position', function (t) {
  var buf  = util.noise(util.create(1004))
    , buf2 = util.create(1024)
    , b    = AudioBufferList(buf)

  b.copy(buf2, 20)
  t.deepEqual(getChannelData(b, 0), util.slice(buf2, 20).getChannelData(0), 'same buffer')
  t.end()
})

t('copy starting from a precise location', function (t) {
  var buf  = util.noise(util.create(10))
    , buf2 = util.create(5)
    , b    = AudioBufferList(buf)

  b.copy(buf2, 0, 5)
  t.deepEqual(getChannelData(b.slice(0, 5), 0), buf2.getChannelData(0), 'same buffer')
  t.end()
})

t('copy in an interval', function (t) {
  var rnd      = util.noise(util.create(10))
    , b        = AudioBufferList(rnd) // put the random bytes there
    , actual   = util.create(3)
    , expected = util.create(3)

  util.copy(util.subbuffer(rnd, 5,8), expected, 0)
  b.copy(actual, 0, 5, 8)

  t.deepEqual(actual.getChannelData(0), expected.getChannelData(0), 'same buffer')
  t.end()
})

t('copy an interval between two buffers', function (t) {
  var buf      = util.noise(util.create(10))
    , buf2     = util.create(10)
    , b        = AudioBufferList(buf)

  b.append(buf)
  b.copy(buf2, 0, 5, 15)

  t.deepEqual(getChannelData(b.slice(5, 15), 0), buf2.getChannelData(0), 'same buffer')
  t.end()
})

t('shallow slice across buffer boundaries', function (t) {
  var bl = new AudioBufferList([util.create([0,0,0,0,0]), util.create([1,1,1,1,1,1]), util.create([2,2,2,2,2])])

  t.deepEqual(getChannelData(bl.slice(3, 13), 0), [0,0,1,1,1,1,1,1,2,2])
  t.end()
})

t('shallow slice within single buffer', function (t) {
  var bl = new AudioBufferList(util.create([0,1,2,3,4,5,6,7,8]))

  t.deepEqual(getChannelData(bl.slice(3, 6), 0), [3,4,5])
  t.end()
})

t('shallow slice single buffer', function (t) {
  t.plan(3)
  var bl = new AudioBufferList([util.create([0,0,0,0,0]), util.create([1,1,1,1,1,1]), util.create([2,2,2,2,2])])

  t.deepEqual(getChannelData(bl.slice(0, 5), 0), util.create([0,0,0,0,0]).getChannelData(0))
  t.deepEqual(getChannelData(bl.slice(5, 11), 0), util.create([1,1,1,1,1,1]).getChannelData(0))
  t.deepEqual(getChannelData(bl.slice(11, 16), 0), util.create([2,2,2,2,2]).getChannelData(0))
})

t('shallow slice with negative or omitted indices', function (t) {
  t.plan(4)
  var bl = new AudioBufferList([util.create([0,0,0,0,0]), util.create([1,1,1,1,1,1]), util.create([2,2,2,2,2])])

  t.deepEqual(getChannelData(bl.slice(), 0), '0000011111122222'.split('').map(v => parseFloat(v)))
  t.deepEqual(getChannelData(bl.slice(5), 0), '11111122222'.split('').map(v => parseFloat(v)))
  t.deepEqual(getChannelData(bl.slice(5, -3), 0), '11111122'.split('').map(v => parseFloat(v)))
  t.deepEqual(getChannelData(bl.slice(-8), 0), '11122222'.split('').map(v => parseFloat(v)))
})

t('shallow slice does not make a copy', function (t) {
  t.plan(1)
  var buffers = [util.create(util.create([0,0,0,0,0])), util.create(util.create([1,1,1,1,1,1])), util.create(util.create([2,2,2,2,2]))]
  var bl = (new AudioBufferList(buffers)).slice(5, -3)

  util.fill(buffers[1],0)
  util.fill(buffers[2],0)

  t.deepEqual(getChannelData(bl, 0), [0,0,0,0,0,0,0,0])
})

t('clone', function (t) {
  t.plan(2)

  var bl = new AudioBufferList(util.create([0,1,2,3,4,5,6,7,8,9]))
    , dup = bl.clone()

  t.equal(bl.prototype, dup.prototype)
  t.deepEqual(getChannelData(bl, 0), getChannelData(dup, 0))
})

t('destroy no pipe', function (t) {
  t.plan(2)

  var bl = new AudioBufferList(util.create([0,1,0,1,0,1,0,1]))
  bl.destroy()

  t.equal(bl.buffers, null)
  t.equal(bl.length, 0)
})

t('slice', function (t) {
  var l = new AudioBufferList(10, 2)

  t.equal(l.numberOfChannels, 2)

  l.consume(10)

  t.equal(l.numberOfChannels, 2)

  let m = l.slice()

  t.equal(m.numberOfChannels, 2)

  t.end()
})

t('zero buffers', function (t) {
  let a = AudioBufferList(0, 2)
  t.equal(a.buffers.length, 0)

  let b = AudioBufferList(10, 2)
  let c = b.slice(0,0)
  t.equal(c.length, 0)
  t.equal(c.buffers.length, 0)

  t.end()
})

t('update number of channels', function (t) {
  let a = AudioBufferList(3, 3)

  t.equal(a.numberOfChannels, 3)

  let b = AudioBufferList(0, 2)

  t.equal(b.numberOfChannels, 2)
  t.equal(b.length, 0)
  t.equal(b.buffers.length, 0)

  b.append(util.create(1))

  t.equal(b.length, 1)
  t.equal(b.numberOfChannels, 1)

  t.end()
})

t('remove 0-len should return null', function (t) {
  let a = AudioBufferList(10)
  t.ok(a.remove(10))
  t.notOk(a.remove(10))
  t.end()
})

t('copy(from, to)', function (t) {
  let a = new AudioBufferList([0, 1, 2, 3, 4, 5])

  t.equal(a.length, 6)

  let b = a.copy(1,4)
  t.deepEqual(b.getChannelData(0), [1,2,3])

  t.end()
})
