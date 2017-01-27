/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global self */
(function (worker_instance) {
  "use strict";

  // Stream Recording inspired by:
  // Copyright Â© 2013 Matt Diamond - License (MIT)
  // https://github.com/mattdiamond/Recorderjs

  var REC_LENGTH = 0,
    REC_BUFFERS_LEFT = [],
    REC_BUFFERS_RIGHT = [],
    SAMPLE_RATE;
  
  var RECORDER = {};
  
  RECORDER.initialize = function (my_option_dict) {
    SAMPLE_RATE = my_option_dict.sample_rate;
    return;
    //worker_instance.postMessage({"command": "init", "status": 200});
  };
  
  RECORDER.record = function (input_buffer){
    REC_BUFFERS_LEFT.push(input_buffer[0]);
    REC_BUFFERS_RIGHT.push(input_buffer[1]);
    REC_LENGTH += input_buffer[0].length;
  };
  
  RECORDER.exportWAV = function (my_type) {
    var bufferL = mergeBuffers(REC_BUFFERS_LEFT, REC_LENGTH),
      bufferR = mergeBuffers(REC_BUFFERS_RIGHT, REC_LENGTH),
      interleaved = interleave(bufferL, bufferR),
      dataview = encodeWAV(interleaved),
      audioBlob =  new Blob([dataview], { type: my_type });
    return audioBlob;
    //worker_instance.postMessage({"command": "exportWAV", "status": 200,
    //  "result": audioBlob
    //});
  };

  RECORDER.exportMonoWAV = function (my_type){
    var bufferL = mergeBuffers(REC_BUFFERS_LEFT, REC_LENGTH),
      resampled,
      dataview;
      
    resampler.initialize(SAMPLE_RATE, 16000, 1, bufferL.length);
    resampled = resampler.resample(bufferL);
    SAMPLE_RATE = 16000;
    dataview = encodeWAV(resampled, true);
    
    // resampled = downSample(SAMPLE_RATE, 16000, 1, bufferL),
    // resampled = new Resampler(SAMPLE_RATE, 16000, 1, bufferL),
    // dataview = encodeWAV(resampled.outputBuffer, true),
    // dataview = encodeWAV(bufferL, true),
    return new Blob([dataview], { type: my_type });

    //worker_instance.postMessage({"command": "exportMonoWAV", "status": 200,
    //  "result": audioBlob
    //});
  };
  
  RECORDER.getBuffers = function () {
    var buffers = [];
    buffers.push( mergeBuffers(REC_BUFFERS_LEFT, REC_LENGTH) );
    buffers.push( mergeBuffers(REC_BUFFERS_RIGHT, REC_LENGTH) );
    return buffers
    //worker_instance.postMessage({"command": "getBuffers", "status": 200,
    //  "result": buffers
    //});
  };
  
  RECORDER.clear = function(){
    REC_LENGTH = 0;
    REC_BUFFERS_LEFT = [];
    REC_BUFFERS_RIGHT = [];
    return;
    //worker_instance.postMessage({"command": "clear", "status": 200});
  };
  
  // utility methods

  function mergeBuffers(recBuffers, recLength){
    var result = new Float32Array(recLength);
    var offset = 0;
    for (var i = 0; i < recBuffers.length; i++){
      result.set(recBuffers[i], offset);
      offset += recBuffers[i].length;
    }
    return result;
  }
  
  function interleave(inputL, inputR){
    var length = inputL.length + inputR.length;
    var result = new Float32Array(length);
  
    var index = 0,
      inputIndex = 0;
  
    while (index < length){
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }

  function floatTo16BitPCM(output, offset, input){
    for (var i = 0; i < input.length; i++, offset+=2){
      var s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }
  
  function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++){
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  function encodeWAV(samples, mono){
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);
    
    // https://gist.github.com/also/900023
    // set Wave file headers

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 32 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, mono?1:2, true);
    /* sample rate */
    view.setUint32(24, SAMPLE_RATE, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, SAMPLE_RATE * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 4, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);
  
    floatTo16BitPCM(view, 44, samples);
  
    return view;
  }
  
  worker_instance.recorder = RECORDER;

}(self));
