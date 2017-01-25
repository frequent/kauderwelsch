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
  
  worker_instance.onmessage = function(my_event){
    var opts = my_event.data.option_dict;
    switch(my_event.data.command){
      case 'init':
        initialize(opts);
        break;
      case 'record':
        console.log("RECORDING")
        record(opts.buffer);
        break;
      case 'exportWAV':
        exportWAV(opts.type);
        break;
      case 'exportMonoWAV':
        exportMonoWAV(opts.type);
        break;
      case 'getBuffers':
        getBuffers();
        break;
      case 'clear':
        clear();
        break;
    }
  };
  
  function initialize (my_option_dict) {
    SAMPLE_RATE = my_option_dict.sample_rate;
    worker_instance.postMessage({"command": "init", "status": 200});
  }
  
  function record (input_buffer){
    REC_BUFFERS_LEFT.push(input_buffer[0]);
    REC_BUFFERS_RIGHT.push(input_buffer[1]);
    REC_LENGTH += input_buffer[0].length;
  }
  
  function exportWAV (my_type) {
    var bufferL = mergeBuffers(REC_BUFFERS_LEFT, REC_LENGTH),
      bufferR = mergeBuffers(REC_BUFFERS_RIGHT, REC_LENGTH),
      interleaved = interleave(bufferL, bufferR),
      dataview = encodeWAV(interleaved),
      audioBlob = new Blob([dataview], { type: my_type });
  
    worker_instance.postMessage({"command": "exportWav", "status": 200,
      "result": audioBlob
    });
  }
  
  function exportMonoWAV (my_type){
    var bufferL = mergeBuffers(REC_BUFFERS_LEFT, REC_LENGTH),
      dataview = encodeWAV(bufferL, true),
      audioBlob = new Blob([dataview], { type: my_type });
  
    worker_instance.postMessage({"command": "exportMonoWav", "status": 200,
      "result": audioBlob
    });
  }
  
  function getBuffers() {
    var buffers = [];
    buffers.push( mergeBuffers(REC_BUFFERS_LEFT, REC_LENGTH) );
    buffers.push( mergeBuffers(REC_BUFFERS_RIGHT, REC_LENGTH) );
    worker_instance.postMessage({"command": "getBuffers", "status": 200,
      "result": buffers
    });
  }
  
  function clear(){
    REC_LENGTH = 0;
    REC_BUFFERS_LEFT = [];
    REC_BUFFERS_RIGHT = [];
    worker_instance.postMessage({"command": "clear", "status": 200});
  }
  
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

}(self));
