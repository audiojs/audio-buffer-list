'use strict';

const t = require('tape')
const AudioBufferList = require('./')
const AudioBuffer = require('audio-buffer')
const util = require('audio-buffer-utils')
const isAudioBuffer = require('is-audio-buffer')
const fs = require('fs')
const Through = require('audio-through')

//new methods
t('create', t => {
	t.end()
})
t('append', t => {
	t.end()
})
t('splice', t => {
	t.end()
})
t('delete', t => {
	t.end()
})
t('insert', t => {
	t.end()
})
t('copy', t => {
	t.end()
})


//bl patch methods
t('single bytes from single buffer', function (t) {
  var bl = new AudioBufferList()
  bl.append(new AudioBuffer(1, [0,1,2,3]))

  t.equal(bl.length, 4)

  t.equal(bl.get(0, 0), 0)
  t.equal(bl.get(1, 0), 1)
  t.equal(bl.get(2, 0), 2)
  t.equal(bl.get(3, 0), 3)

  t.end()
})

t('single bytes from multiple buffers', function (t) {
  var bl = new AudioBufferList()
  bl.append(new AudioBuffer(1, [1,2,3,4]))
  bl.append(new AudioBuffer(1, [5,6,7]))
  bl.append(new AudioBuffer(1, [8,9]))
  bl.append(new AudioBuffer(1, [10]))

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
  bl.append(new AudioBuffer(1, [-1, -.5, 0, 1]))

  t.equal(bl.length, 4)

  t.deepEqual(bl.slice(0, 4).getChannelData(0), [-1, -.5, 0, 1])
  t.deepEqual(bl.slice(0, 3).getChannelData(0), [-1, -.5, 0])
  t.deepEqual(bl.slice(1, 4).getChannelData(0), [-.5, 0, 1])
  t.deepEqual(bl.slice(-4, -1).getChannelData(0), [-1, -.5, 0])

  t.end()
})

t('multi bytes from single buffer (negative indexes)', function (t) {
  var bl = new AudioBufferList()
  bl.append(new AudioBuffer(2, [1,2,3,4,5,6,7,8,9,10,11,12]))

  t.equal(bl.length, 6)

  t.deepEqual(bl.slice(-6, -1).getChannelData(0), [1,2,3,4,5])
  t.deepEqual(bl.slice(-6, -2).getChannelData(0), [1,2,3,4])
  t.deepEqual(bl.slice(-5, -2).getChannelData(0), [2,3,4])

  t.end()
})

t('multiple bytes from multiple buffers', function (t) {
  var bl = new AudioBufferList()

  bl.append(new AudioBuffer(1, [0,1,2,3]))
  bl.append(new AudioBuffer(1, [4,5,6]))
  bl.append(new AudioBuffer(1, [7,8]))
  bl.append(new AudioBuffer(1, [9]))

  t.equal(bl.length, 10)

  t.deepEqual(bl.slice(0, 10).getChannelData(0), [0,1,2,3,4,5,6,7,8,9])
  t.deepEqual(bl.slice(3, 10).getChannelData(0), [3,4,5,6,7,8,9])
  t.deepEqual(bl.slice(3, 6).getChannelData(0), [3,4,5])
  t.deepEqual(bl.slice(3, 8).getChannelData(0), [3,4,5,6,7])
  t.deepEqual(bl.slice(5, 10).getChannelData(0), [5,6,7,8,9])
  t.deepEqual(bl.slice(-7, -4).getChannelData(0), [3,4,5])

  t.end()
})

t('multiple bytes from multiple buffer lists', function (t) {
  var bl = new AudioBufferList()

  bl.append(new AudioBufferList([ new AudioBuffer(1, [0,1,2,3]), new AudioBuffer(1, [4,5,6]) ]))
  bl.append(new AudioBufferList([ new AudioBuffer(1, [7,8]), new AudioBuffer(1, [9]) ]))

  t.equal(bl.length, 10)

  t.deepEqual(bl.slice(0, 10).getChannelData(0), [0,1,2,3,4,5,6,7,8,9])
  t.deepEqual(bl.slice(3, 10).getChannelData(0), [3,4,5,6,7,8,9])
  t.deepEqual(bl.slice(3, 6).getChannelData(0), [3,4,5])
  t.deepEqual(bl.slice(3, 8).getChannelData(0), [3,4,5,6,7])
  t.deepEqual(bl.slice(5, 10).getChannelData(0), [5,6,7,8,9])

  t.end()
})

// same data as previous test, just using nested constructors
t('multiple bytes from crazy nested buffer lists', function (t) {
  var bl = new AudioBufferList()

  bl.append(new AudioBufferList([
      new AudioBufferList([
          new AudioBufferList(new AudioBuffer(1, [0,1,2]))
        , new AudioBuffer(1, [3])
        , new AudioBufferList(new AudioBuffer(1, [4,5,6]))
      ])
    , new AudioBufferList([ new AudioBuffer(1, [7,8]) ])
    , new AudioBufferList(new AudioBuffer(1, [9]))
  ]))

  t.equal(bl.length, 10)

  t.deepEqual(bl.slice(0, 10).getChannelData(0), [0,1,2,3,4,5,6,7,8,9])

  t.deepEqual(bl.slice(3, 10).getChannelData(0), [3,4,5,6,7,8,9])
  t.deepEqual(bl.slice(3, 6).getChannelData(0), [3,4,5])
  t.deepEqual(bl.slice(3, 8).getChannelData(0), [3,4,5,6,7])
  t.deepEqual(bl.slice(5, 10).getChannelData(0), [5,6,7,8,9])

  t.end()
})

t('append accepts arrays of Buffers', function (t) {
  var bl = new AudioBufferList()
  bl.append(new AudioBuffer(1, [0,1,2]))
  bl.append([ new AudioBuffer(1, [3,4,5]) ])
  bl.append([ new AudioBuffer(1, [6,7,8]), new AudioBuffer(1, [9,10,11]) ])
  bl.append([ new AudioBuffer(1, [12,13,14,15]), new AudioBuffer(1, [16,17,18,19,20]), new AudioBuffer(1, [21,22,23,24,25]) ])

  t.equal(bl.length, 26)

  t.deepEqual(bl.slice().getChannelData(0), [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25])
  t.end()
})

t('append accepts arrays of AudioBufferLists', function (t) {
  var bl = new AudioBufferList()
  bl.append(new AudioBuffer(1, [0,1,2]))
  bl.append([ new AudioBufferList([3,4,5]) ])
  bl.append(new AudioBufferList([ new AudioBuffer(1, [6,7,8]), new AudioBufferList([9,10,11]) ]))
  bl.append([ new AudioBuffer(1, [12,13,14,15]), new AudioBufferList([ new AudioBuffer(1, [16,17,18,19,20]), new AudioBuffer(1, [21,22,23,24,25]) ]) ])
  t.equal(bl.length, 26)
  t.deepEqual(bl.slice().getChannelData(0), [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25])
  t.end()
})

t('append chainable', function (t) {
  var bl = new AudioBufferList()
  t.ok(bl.append(new AudioBuffer(1, [0,1,2,3])) === bl)
  t.ok(bl.append([ new AudioBuffer(1, [0,1,2,3]) ]) === bl)
  t.ok(bl.append(new AudioBufferList(new AudioBuffer(1, [0,1,2,3]))) === bl)
  t.ok(bl.append([ new AudioBufferList(new AudioBuffer(1, [0,1,2,3])) ]) === bl)
  t.end()
})

t('append chainable (test results)', function (t) {
  var bl = new AudioBufferList([0,1,2])
    .append([ new AudioBufferList([3,4,5]) ])
    .append(new AudioBufferList([ new AudioBuffer(1, [6,7,8]), new AudioBufferList([9,10,11]) ]))
    .append([ new AudioBuffer(1, [12,13,14,15]), new AudioBufferList([ new AudioBuffer(1, [16,17,18,19,20]), new AudioBuffer(1, [21,22,23,24,25]) ]) ])

  t.equal(bl.length, 26)
  t.deepEqual(bl.slice().getChannelData(0), [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25])
  t.end()
})

t('consuming from multiple buffers', function (t) {
  var bl = new AudioBufferList()

  bl.append(new AudioBuffer(1, [0,1,2,3]))
  bl.append(new AudioBuffer(1, [4,5,6]))
  bl.append(new AudioBuffer(1, [7,8]))
  bl.append(new AudioBuffer(1, [9]))

  t.equal(bl.length, 10)

  t.deepEqual(bl.slice(0, 10).getChannelData(0), [0,1,2,3,4,5,6,7,8,9])

  bl.consume(3)
  t.equal(bl.length, 7)
  t.deepEqual(bl.slice(0, 7).getChannelData(0), [3,4,5,6,7,8,9])

  bl.consume(2)
  t.equal(bl.length, 5)
  t.deepEqual(bl.slice(0, 5).getChannelData(0), [5,6,7,8,9])

  bl.consume(1)
  t.equal(bl.length, 4)
  t.deepEqual(bl.slice(0, 4).getChannelData(0), [6,7,8,9])

  bl.consume(1)
  t.equal(bl.length, 3)
  t.deepEqual(bl.slice(0, 3).getChannelData(0), [7,8,9])

  bl.consume(2)
  t.equal(bl.length, 1)
  t.deepEqual(bl.slice(0, 1).getChannelData(0), [9])

  t.end()
})

t('complete consumption', function (t) {
  var bl = new AudioBufferList()

  bl.append(new AudioBuffer(1, [0]))
  bl.append(new AudioBuffer(1, [1]))

  bl.consume(2)

  t.equal(bl.length, 0)
  t.equal(bl._bufs.length, 0)

  t.end()
})


t('test readUInt16LE / readUInt16BE / readInt16LE / readInt16BE', function (t) {
  var buf1 = new AudioBuffer(1, 1)
    , buf2 = new AudioBuffer(1, 3)
    , buf3 = new AudioBuffer(1, 3)
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


t('write nothing, should get empty buffer', function (t) {
  t.plan(3)
  AudioBufferList(function (err, data) {
    t.notOk(err, 'no error')
    t.ok(isAudioBuffer(data), 'got a buffer')
    t.equal(1, data.length, 'got a min-length buffer')
    t.end()
  }).end()
})

t('should emit finish', function (t) {
  var source = AudioBufferList()
    , dest = AudioBufferList()

  source.write(AudioBuffer(1))
  source.pipe(dest)

  dest.on('finish', function () {
    t.equal(dest.length, 1)
    t.end()
  })
})

t('basic copy', function (t) {
  var buf  = util.noise(util.create(1024))
    , buf2 = new AudioBuffer(1, 1024)
    , b    = AudioBufferList(buf)
  b.copy(buf2)
  t.deepEqual(b.slice().getChannelData(0), buf2.getChannelData(0), 'same buffer')
  t.end()
})

t('copy after many appends', function (t) {
  var buf  = util.noise(util.create(512))
    , buf2 = new AudioBuffer(1, 1024)
    , b    = AudioBufferList(buf)

  b.append(buf)
  b.copy(buf2)
  t.deepEqual(b.slice().getChannelData(0), buf2.getChannelData(0), 'same buffer')
  t.end()
})

t('copy at a precise position', function (t) {
  var buf  = util.noise(util.create(1004))
    , buf2 = new AudioBuffer(1, 1024)
    , b    = AudioBufferList(buf)

  b.copy(buf2, 20)
  t.deepEqual(b.slice().getChannelData(0), util.slice(buf2, 20).getChannelData(0), 'same buffer')
  t.end()
})

t('copy starting from a precise location', function (t) {
  var buf  = util.noise(util.create(10))
    , buf2 = new AudioBuffer(1, 5)
    , b    = AudioBufferList(buf)

  b.copy(buf2, 0, 5)
  t.deepEqual(b.slice(5).getChannelData(0), buf2.getChannelData(0), 'same buffer')
  t.end()
})

t('copy in an interval', function (t) {
  var rnd      = util.noise(util.create(10))
    , b        = AudioBufferList(rnd) // put the random bytes there
    , actual   = new AudioBuffer(1, 3)
    , expected = new AudioBuffer(1, 3)

  util.copy(util.subbuffer(rnd, 5,8), expected, 0)
  b.copy(actual, 0, 5, 8)

  t.deepEqual(actual.getChannelData(0), expected.getChannelData(0), 'same buffer')
  t.end()
})

t('copy an interval between two buffers', function (t) {
  var buf      = util.noise(util.create(10))
    , buf2     = new AudioBuffer(1, 10)
    , b        = AudioBufferList(buf)

  b.append(buf)
  b.copy(buf2, 0, 5, 15)

  t.deepEqual(b.slice(5, 15).getChannelData(0), buf2.getChannelData(0), 'same buffer')
  t.end()
})

t('shallow slice across buffer boundaries', function (t) {
  var bl = new AudioBufferList([AudioBuffer(1, [0,0,0,0,0]), AudioBuffer(1, [1,1,1,1,1,1]), AudioBuffer(1, [2,2,2,2,2])])

  t.deepEqual(bl.shallowSlice(3, 13).slice().getChannelData(0), [0,0,1,1,1,1,1,1,2,2])
  t.end()
})

t('shallow slice within single buffer', function (t) {
  var bl = new AudioBufferList([AudioBuffer(1, [0,0,0,0,0]), AudioBuffer(1, [1,1,1,1,1,1]), AudioBuffer(1, [2,2,2,2,2])])

  t.deepEqual(bl.shallowSlice(5, 10).slice().getChannelData(0), [1,1,1,1,1])
  t.end()
})

t('shallow slice single buffer', function (t) {
  t.plan(3)
  var bl = new AudioBufferList([AudioBuffer(1, [0,0,0,0,0]), AudioBuffer(1, [1,1,1,1,1,1]), AudioBuffer(1, [2,2,2,2,2])])

  t.deepEqual(bl.shallowSlice(0, 5).slice().getChannelData(0), AudioBuffer(1, [0,0,0,0,0]).getChannelData(0))
  t.deepEqual(bl.shallowSlice(5, 11).slice().getChannelData(0), AudioBuffer(1, [1,1,1,1,1,1]).getChannelData(0))
  t.deepEqual(bl.shallowSlice(11, 16).slice().getChannelData(0), AudioBuffer(1, [2,2,2,2,2]).getChannelData(0))
})

t('shallow slice with negative or omitted indices', function (t) {
  t.plan(4)
  var bl = new AudioBufferList([AudioBuffer(1, [0,0,0,0,0]), AudioBuffer(1, [1,1,1,1,1,1]), AudioBuffer(1, [2,2,2,2,2])])

  t.deepEqual(bl.shallowSlice().slice().getChannelData(0), '0000011111122222'.split('').map(v => parseFloat(v)))
  t.deepEqual(bl.shallowSlice(5).slice().getChannelData(0), '11111122222'.split('').map(v => parseFloat(v)))
  t.deepEqual(bl.shallowSlice(5, -3).slice().getChannelData(0), '11111122'.split('').map(v => parseFloat(v)))
  t.deepEqual(bl.shallowSlice(-8).slice().getChannelData(0), '11122222'.split('').map(v => parseFloat(v)))
})

t('shallow slice does not make a copy', function (t) {
  t.plan(1)
  var buffers = [new AudioBuffer(1, AudioBuffer(1, [0,0,0,0,0])), new AudioBuffer(1, AudioBuffer(1, [1,1,1,1,1,1])), new AudioBuffer(1, AudioBuffer(1, [2,2,2,2,2]))]
  var bl = (new AudioBufferList(buffers)).shallowSlice(5, -3)

  util.fill(buffers[1],0)
  util.fill(buffers[2],0)

  t.deepEqual(bl.slice().getChannelData(0), [0,0,0,0,0,0,0,0])
})

t('duplicate', function (t) {
  t.plan(2)

  var bl = new AudioBufferList([0,.1,.2,3,4,5,6,7,8,9])
    , dup = bl.duplicate()

  t.equal(bl.prototype, dup.prototype)
  t.deepEqual(bl.slice().getChannelData(0), dup.slice().getChannelData(0))
})

t('destroy no pipe', function (t) {
  t.plan(2)

  var bl = new AudioBufferList([0,1,0,1,0,1,0,1])
  bl.destroy()

  t.equal(bl._bufs.length, 0)
  t.equal(bl.length, 0)
})

!process.browser && t('destroy with pipe before read end', function (t) {
  t.plan(2)

  var bl = new AudioBufferList()
  fs.createReadStream(__dirname + '/test.js')
    .pipe(bl)

  bl.destroy()

  t.equal(bl._bufs.length, 0)
  t.equal(bl.length, 0)

})

!process.browser && t('destroy with pipe before read end with race', function (t) {
  t.plan(2)

  var bl = new AudioBufferList()
  fs.createReadStream(__dirname + '/test.js')
    .pipe(bl)

  setTimeout(function () {
    bl.destroy()
    setTimeout(function () {
      t.equal(bl._bufs.length, 0)
      t.equal(bl.length, 0)
    }, 500)
  }, 500)
})

!process.browser && t('destroy with pipe after read end', function (t) {
  t.plan(2)

  var bl = new AudioBufferList()
  fs.createReadStream(__dirname + '/test.js')
    .on('end', onEnd)
    .pipe(bl)

  function onEnd () {
    bl.destroy()

    t.equal(bl._bufs.length, 0)
    t.equal(bl.length, 0)
  }
})

!process.browser && t('destroy with pipe while writing to a destination', function (t) {
  t.plan(4)

  var bl = new AudioBufferList()
    , ds = new AudioBufferList()

  // fs.createReadStream(__dirname + '/test.js')
    Through(function (v) {return this.count > 1000 ? this.end() : new AudioBuffer(1, 1024)})
    .on('end', onEnd)
    .pipe(bl)

  function onEnd () {
    bl.pipe(ds)

    setTimeout(function () {
      bl.destroy()

      t.equals(bl._bufs.length, 0)
      t.equals(bl.length, 0)

      ds.destroy()

      t.equals(bl._bufs.length, 0)
      t.equals(bl.length, 0)

    }, 100)
  }
})


!process.browser && t('handle error', function (t) {
  t.plan(2)
  fs.createReadStream('/does/not/exist').pipe(AudioBufferList(function (err, data) {
    t.ok(err instanceof Error, 'has error')
    t.notOk(data, 'no data')
  }))
})
