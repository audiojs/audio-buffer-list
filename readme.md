# audio-buffer-list [![Build Status](https://travis-ci.org/audiojs/audio-buffer-list.svg?branch=master)](https://travis-ci.org/audiojs/audio-buffer-list) [![unstable](https://img.shields.io/badge/stability-unstable-green.svg)](http://github.com/badges/stability-badges) [![Greenkeeper badge](https://badges.greenkeeper.io/audiojs/audio-buffer-list.svg)](https://greenkeeper.io/)

Extension of [BufferList](https://npmjs.org/package/bl) for [AudioBuffers](https://npmjs.org/package/audio-buffer).
Handy and performant to deal with (possibly long) sequence of audio buffers − accumulate, read, stream, modify, delete etc.

## Usage

[![npm install audio-buffer-list](https://nodei.co/npm/audio-buffer-list.png?mini=true)](https://npmjs.org/package/audio-buffer-list/)

```js
import AudioBufferList from 'audio-buffer-list'

let abl = new AudioBufferList([
  new AudioBuffer({length: 4, sampleRate: 44100 }),
  new AudioBuffer({length: 100, sampleRate: 44100 })
])

abl.append(
  new AudioBuffer({length: 100})
)

abl.length // 204
abl.slice() // <AudioBuffer 0, ...>
```

## API

### `new AudioBufferList(source, options?)`

Creates new audio buffer list instance, `new` is not strictly required.

`source` can be _AudioBuffer_, _AudioBuffer_ array, _AudioBufferList_ or _AudioBufferList_ array.

`options` may provide `numberOfChannels`, `context` for web audio API context and `sampleRate`.

The created list instance contains the following properties:

* `list.buffers` − sequence of audio buffers with actual data.
* `list.length` − total length of list in samples, i.e. sum of inner buffer lengths.
* `list.duration` − total duration of the audio list, i.e. sum of buffers durations.
* `list.numberOfChannels` − detected from the buffer with max number of channels in the list. Can be set by options.
* `list.sampleRate` − just for convenience with _AudioBuffer_ interface.


### `list.append(buffer)`

Insert new AudioBuffer, AudioBufferList or array of them to the end.

### `list.insert(offset=0, buffer)`

Put new AudioBuffer, AudioBufferList or array of them at the offset.

### `list.remove(offset=0, count)`

Remove number of samples from the list starting at the `offset`. `count` can possibly be negative, then items are removed on the left side from the offset. `offset` can also be negative, meaning to remove from the end. Retuns removed sublist instance.


### `list.slice(start=0, end=-0)`

Return sublist of the initial list. The data is not copied but returned as subarrays.

### `list.map(mapper, from=0, to=-0)`

Map buffers from the interval defined by `from` and `to` arguments. Modifies list in-place.

Mapper function has signature `(buffer, idx, offset) => buffer`. `buffer` is an audio buffer to process, `idx` is buffer number, and `offset` is first buffer sample absolute offset. If mapper returns `undefined`, the buffer is preserved. If mapper returns `null`, the buffer is discarded. If mapper returns `false`, iterations are stopped.

Pass `{reversed: true}` option to walk in reversed order.

```js
list = list.map((buf, idx, offset) => {
  for (let c = 0; c < channels; c++) {
    let data = buf.getChannelData(c)

    //start buffer from the subset may start earlier than the subset
    //end buffer from the subset may end later than the subset
    for (let i = 0, l = buf.length; i < l; i++) {
      data[i] = process(data[i])
    }
  }
}, from, to)
```

### `list.reverseMap(mapper, from=0, to=-0)`

Same as map, but runs from tail (to break preliminarily).

### `list.repeat(count)`

Repeats contents of the list specified number of times. Modifies list in-place, returns self.

### `list.copy(dest?, start=0, end=-0)`

Put data into destination _AudioBuffer_ or create one. It is like `slice`, but returns an _AudioBuffer_.

### `list.copyFromChannel(dest, channel, startInChannel=0, end=-0)`

Put data from the channel to destination _FloatArray_. Optional `startInChannel` defines offset in the channel to start from.

### `list.copyToChannel(src, channel, startInChannel=0, end=-0)`

Put data from the source _FloatArray_ into channel, optionally starting at `startInChannel` offset.

### `list.split([a, b, c, ...], d, e, ...)`

Split list at the indicated indexes. That increases number of inner buffers.

### `list.join(start=0, end=-0)`

Joins buffers from the indicated range. Returns an AudioBuffer with joined data.

### `list.offset(idx)`

Return `[bufIdx, offset]` pair for any sample number. `bufIdx` is the number of buffer in the list, `offset` is sample offset inside of that buffer.

### `list.destroy()`

Clean up list.


## See also

* [audio-buffer-utils](https://github.com/audio-buffer-utils) — toolset for audio buffers.
* [buffer-list](https://npmjs.org/package/bl) — canonical BufferList implementation.
