# audio-buffer-list [![Build Status](https://travis-ci.org/audiojs/audio-buffer-list.svg?branch=master)](https://travis-ci.org/audiojs/audio-buffer-list) [![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

Extension of [BufferList](https://npmjs.org/package/bl) for [AudioBuffers](https://npmjs.org/package/audio-buffer). Handy and performant to deal with sequence of audio buffers − accumulate, read, stream, modify, delete etc. It provides interfaces both of _AudioBuffer_ and _BufferList_, as well as bunch of other useful methods.

## Usage

[![npm install audio-buffer-list](https://nodei.co/npm/audio-buffer-list.png?mini=true)](https://npmjs.org/package/audio-buffer-list/)

```js
const AudioBufferList = require('audio-buffer-list')
const AudioBuffer = require('audio-buffer')

let abl = new AudioBufferList(new AudioBuffer(1, [0, .1, .2, .3]), new AudioBuffer(1, 100))

abl.append(new AudioBuffer(1, 100))

abl.length // 204
abl.slice() // <AudioBuffer 0, .1, .2, .3, 0...>
```

## API

### `new AudioBufferList(source, options?)`

`source` can be _AudioBuffer_, _AudioBuffer_ array, _AudioBufferList_, _AudioBufferList_ array or callback.

`options` may provide `numberOfChannels`, `context` for web audio API context and `sampleRate`.

`new` is not strictly required.

### `list.insert(buffer, offset=0)`

Put new AudioBuffer, AudioBufferList or array of them at the offset.

### `list.delete(count, offset=0)`

Delete number of samples starting at the offset. `count` can possibly be negative, then items are deleted on the left side from the offset. `offset` can also be negative, meaning to start from the end.

### `list.repeat(count)`

Repeats contents of the list specified number of times. Modifies list in-place.



## AudioBuffer properties & methods

### `list.duration`

Total duration of the audio list, i.e. sum of buffers durations.

### `list.numberOfChannels`

Detected from the buffer with max number of channels in the list. Can be set by options.

### `list.sampleRate`

Just for convenience with _AudioBuffer_ interface

### `list.getChannelData(channel)`

Return _FloatArray_ with merged data for the channel.

### `list.copyFromChannel(destination, channel, startInChannel=0)`

Put data from the channel to destination _FloatArray_. Optional `startInChannel` defines offset in the channel to start from.

### `list.copyToChannel(source, channel, startInChannel=0)`

Put data from the `source` _FloatArray_ into channel, optionally starting at `startInChannel` offset.



## BufferList properties and methods

### `list.length`

Total length of list in samples, i.e. sum of inner buffer lengths.

### `list.append(buffer)`

### `list.slice(start?, end?)`

### `list.shallowSlice(start?, end?)`

### `list.get(idx, channel)`

### `list.duplicate()`

### `list.copy(dest, destStart?, srcStart?, srcEnd?)`

### `list.consume(length)`



## Stream methods

## See also

* [audio](https://github.com/audiojs/audio) — high-level class for audio
* [audio-buffer](https://github.com/audiojs/audio-buffer) — audio buffer class for nodejs and browser
* [audio-buffer-utils](https://github.com/audio-buffer-utils) — toolset for audio buffers
* [buffer-list](https://npmjs.org/package/bl) — canonical BufferList implementation
