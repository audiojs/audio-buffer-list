# audio-buffer-list [![Build Status](https://travis-ci.org/audiojs/audio-buffer-list.svg?branch=master)](https://travis-ci.org/audiojs/audio-buffer-list) [![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

Extension of [BufferList](https://npmjs.org/package/bl) for [AudioBuffers](https://npmjs.org/package/audio-buffer). Handy and performant to deal with sequence of audio buffers − accumulate, read, stream, modify, delete etc.

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

## See also

* [audio](https://github.com/audiojs/audio) — high-level class for audio
* [audio-buffer](https://github.com/audiojs/audio-buffer) — audio buffer class for nodejs and browser
* [audio-buffer-utils](https://github.com/audio-buffer-utils) — toolset for audio buffers
* [buffer-list](https://npmjs.org/package/bl) — canonical BufferList implementation
