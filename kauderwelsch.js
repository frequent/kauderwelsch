/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, navigator, RSVP */
(function(window, navigator, RSVP, undefined) {

  // Stream Recording inspired by:
  /* Copyright 2013 Chris Wilson

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
  */

  var AUDIO_CONTEXT = window.AudioContext || window.webkitAudioContext;
  var MEDIA_DEVICES = navigator.mediaDevices;
  var REQUEST_ANIMATION_FRAME = window.requestAnimationFrame || 
    window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
  var CANCEL_ANIMATION_FRAME = window.cancelAnimationFrame || 
    window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame;

  var AUDIO_OPTIONS = {
      "audio": {
          "mandatory": {
              "googEchoCancellation": "false",
              "googAutoGainControl": "false",
              "googNoiseSuppression": "false",
              "googHighpassFilter": "false"
          },
          "optional": []
      },
  };

  function initializeAudio(audio) {
    audio.context = new AUDIO_CONTEXT();
    audio.analyser = audio.context.createAnalyser();
    audio.analyser.fftSize = 2048;
    
    //audio.processor = audio.context.createScriptProcessor(4096, 1, 1);
  }

  function saveAudio() {
    var kauderwelsch_instance = this;
    kauderwelsch_instance.audio.recorder.exportWAV(doneEncoding);
    // could get mono instead by saying
    // audioRecorder.exportMonoWAV( doneEncoding );
  }

  function doneEncoding(blob) {
    //???
    Recorder.setupDownload(blob, "Sample" + 1 + ".wav" );
  }
  
  /*
  function toggleRecording(e) {
    if (e.classList.contains("recording")) {
        // stop recording
        audioRecorder.stop();
        e.classList.remove("recording");
        => audioRecorder.getBuffers( gotBuffers ); //redraw from recorded file, then play through?
    } else {
        // start recording
        if (!audioRecorder)
            return;
        e.classList.add("recording");
        audioRecorder.clear();
        audioRecorder.record();
    }
  }
  */

  function convertToMono(input) {
    var kauderwelsch_instance = this,
      splitter = kauderwelsch_instance.audio.context.createChannelSplitter(2);
      merger = kauderwelsch_instance.audio.context.createChannelMerger(2);

      input.connect(splitter);
      splitter.connect(merger, 0, 0);
      splitter.connect(merger, 0, 1);
      return merger;
  }

  function cancelAnalyserUpdates() {
    var kauderwelsch_instance = this;
    window.cancelAnimationFrame(kauderwelsch_instance.rafID);
    kauderwelsch_instance.rafID = null;
  }

  function updateAnalyser() {
    var kauderwelsch_instance = this,
      audio = kauderwelsch_instance.audio,
      freqByteData,
      step,
      amp,
      min,
      max,
      datum,
      i,
      j;

    if (!kauderwelsch_instance.analyser_context) {
        var canvas = kauderwelsch_instance.analyser_dom_node;
        canvas_width = canvas.width;
        canvas_height = canvas.height;
        kauderwelsch_instance.analyser_context = canvas.getContext('2d');
    }

    // draw analyser code her
    // https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/frequencyBinCount
    {
      freqByteData = new Uint8Array(audio.analyer.frequencyBinCount);
      step = Math.ceil( freqByteData.length / canvas_width );
      amp = canvas_height / 2;

      audio.analyser.getByteFrequencyDatea(freqByteData);

      kauderwelsch_instance.visualiser_context.clearRect(0, 0, canvas_width, canvas_height);
      kauderwelsch_instance.visualiser_context.fillStyle = "silver";
      //kauderwelsch_instance.visualiser_context.fillStyle =  "round";  
      
      for(i = 0; i < canvas_width; i += 1){
        min = 1.0;
        max = -1.0;
        for (j = 0; j < step; j += 1) {
          datum = data[(i * step) + j]; 
          if (datum < min) {
            min = datum;
          }
          if (datum > max) {
            max = datum;
          }
        }
        kauderwelsch_instance.analyser_context.fillRect(
          i,
          (1 + min) * amp,
          1, 
          Math.max(1, (max - min) * amp)
        );
      }
    }

    kauderwelsch_instance.rafID = window.requestAnimationFrame(updateAnalyser);
  }
  
  function bootstrap(my_option_dict) {
    var kauderwelsch_instance = this;

    return new RSVP.Queue()
      .push(function () {
        return MEDIA_DEVICES.getUserMedia(AUDIO_OPTIONS);
      })
      .push(function (my_stream) {
        var audio = kauderwelsch_instance.audio,
          input_point = audio.context.createGain(),
          zero_gain;

        // set source to input stream and connect/Create audio node from stream.
        audio.source = audio.context.createMediaStreamSource(my_stream);
        audio.source.connect(input_point);

        // connect with destination
        input_point.connect(audio.analyser);
        
        audio.recorder = new Recorder(input_point);
        
        zero_gain = audio.context.createGain();
        zero_gain.gain.value = 0.0;
        input_point.connect(zero_gain);
        zero_gain.connect(audio.context.destination);
        
        updateAnalyser();
      })
      .push(null, function (my_error) {
        kauderwelsch_instance.terminate(my_error);
        throw my_error;
      });
  }
  
  function Kauderwelsch(my_option_dict) {
    var kauderwelsch_instance = this,
      option_dict = my_option_dict || {};

    if (!AUDIO_CONTEXT) {
      throw new TypeError("Browser does not support AudioContext");
    }
    if (!MEDIA_DEVICES) {
      throw new TypeError("Browser does not support MediaDevices");
    }
    if (!REQUEST_ANIMATION_FRAME || !CANCEL_ANIMATION_FRAME) {
      throw new TypeError("Browser does not support AnimationFrame");
    }

    // setup worker communication
    kauderwelsch_instance.sendMessage = function (my_message) {
      return new RSVP.Promise(function (resolve, reject, notify) {
        kauderwelsch_instance.trainer.onmessage = function (my_event) {
          if (my_event.data.error) {
              reject(handelCallback.call(kauderwelsch_instance, my_event));
            } else {
              resolve(handleCallback.call(kauderwelsch_instance, my_event));
            }
          };

        return kauderwelsch_instance.trainer.postMessage(my_message);
      });
    };
    
    // The context's nodemap: source => processor => destination
    // context => Browser AudioContext
    // source => AudioSourceNode from captured microphone input
    // processor => ScriptProcessorNode for julius
    kauderwelsch_instance.audio = {
      context: null,
      source: null,
      processor: null,
      recorder: null,
      _transfer: my_option_dict.transfer
    };

    // Do not pollute the object
    delete option_dict.transfer;
    
    // audio visualizer
    kauderwelsch_instance.analsyer_dom_node = my_option_dict.analyser_dom_node;
    
    // instantiate worker
    kauderwelsch_instance.trainer = new Worker(my_option_dict.pathToTrainer || 'kauderwelsch_worker.js');

    initializeAudio(kauderwelsch_instance.audio);
    bootstrap(my_option_dict);
  }

  Kauderwelsch.prototype.stop = function () {
    var kauderwelsch_instance = this;

  };

  Kauderwelsch.prototype.record = function() {
    var kauderwelsch_instance = this;

  };

  Kauderwelsch.prototype.terminate = function(my_termination_reason) {
    var kauderwelsch_instance = this;

    kauderwelsch_instance.audio.processor.onaudioprocess = null;
    kauderwelsch_instance.trainer.terminate();
    if (typeof kauderwelsch_instance.onfail === 'function') {
      kauderwelsch_instance.onfail(my_termination_reason);
    }
  };

  window.Kauderwelsch = Kauderwelsch;

}(window, window.navigator, RSVP));

