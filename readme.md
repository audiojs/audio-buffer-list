# audio-buffer-list [![Build Status](https://travis-ci.org/audiojs/audio-buffer-list.svg?branch=master)](https://travis-ci.org/audiojs/audio-buffer-list) [![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)

Extension of [BufferList](https://npmjs.org/package/bl) for [AudioBuffers](https://npmjs.org/package/audio-buffer). Handy and performant to deal with (possibly long) sequence of audio buffers − accumulate, read, stream, modify, delete etc.

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

Creates new audio buffer list instance, `new` is not strictly required.

`source` can be _AudioBuffer_, _AudioBuffer_ array, _AudioBufferList_ or _AudioBufferList_ array.

`options` may provide `channels`, `context` for web audio API context and `sampleRate`.

### `list.buffers`

Sequence of audio buffers with actual data.

### `list.length`

Total length of list in samples, i.e. sum of inner buffer lengths.

### `list.duration`

Total duration of the audio list, i.e. sum of buffers durations.

### `list.numberOfChannels`

Detected from the buffer with max number of channels in the list. Can be set by options.

### `list.sampleRate`

Just for convenience with _AudioBuffer_ interface

### `list.offset(sample)`

Return `[bufIdx, offset]` pair for any sample number. `bufIdx` is the number of buffer in the list, `offset` is sample offset inside of that buffer.

### `list.append(buffer)`

Insert new AudioBuffer, AudioBufferList or array of them to the end.

### `list.insert(buffer, offset=0)`

Put new AudioBuffer, AudioBufferList or array of them at the offset.

### `list.delete(count, offset=0)`

Delete number of samples starting at the offset. `count` can possibly be negative, then items are deleted on the left side from the offset. `offset` can also be negative, meaning to start from the end.

### `list.consume(length)`

Delete data from the beginning.

### `list.slice(start=0, end=-0)`

Return sublist of the initial list. The data is not copied but returned as subarrays.

### `list.map((buffer, index, offset) => buffer|bool?, from=0, to=-0)`

Create new list by mapping every buffer. Optionally pass offsets `from` and `to` to map only buffers covering the subset, keeping the rest unchanged. If no buffer returned from the mapper function then the old buffer will be preserved. If `null` returned then the buffer will be discarded. `offset` tracks `buffer` offset in new list, `index` reflects buffer count.

```js
list = list.map((buf, idx, offset) => {
	for (let c = 0; c < channels; c++) {
		let data = buf.getChannelData(channel)

		//start buffer from the subset may start earlier than the subset
		//end buffer from the subset may end later than the subset
		for (let i = Math.max(from - offset, 0),
					l = Math.min(to - offset, buf.length);
					i < l; i++) {
			data[i] = process(data[i])
		}
	}
}, from, to)
```

### `list.each((buffer, index, offset) => {}, from=0, to=-0, {reversed}?)`

Iterate over buffers from the indicated range. Buffers can be modified in-place during the iterating. Return `false` to break loop. Pass `{reversed: true}` as the last argument to iterate in reverse order.

### `list.reverse(start=0, end=-0)`

Reverse part of the list.

### `list.repeat(count)`

Repeats contents of the list specified number of times. Modifies list in-place.

### `list.getChannelData(channel, from=0, to=-0)`

Return _FloatArray_ with merged data for the channel.

### `list.copy(dest?, destStart?, srcStart?, srcEnd?)`

Put data into destination _AudioBuffer_.

### `list.copyFromChannel(destination, channel, startInChannel=0)`

Put data from the channel to destination _FloatArray_. Optional `startInChannel` defines offset in the channel to start from.

### `list.copyToChannel(source, channel, startInChannel=0)`

Put data from the `source` _FloatArray_ into channel, optionally starting at `startInChannel` offset.

### `list.duplicate()`

Create new AudioBufferList consisting of the same AudioBuffers as the initial list.

### `list.clone()`

Return copy of the list, consisting of cloned buffers.

### `list.destroy()`

Clean up list.

## See also

* [audio](https://github.com/audiojs/audio) — high-level class for audio
* [audio-buffer](https://github.com/audiojs/audio-buffer) — audio buffer class for nodejs and browser
* [audio-buffer-utils](https://github.com/audio-buffer-utils) — toolset for audio buffers
* [buffer-list](https://npmjs.org/package/bl) — canonical BufferList implementation
