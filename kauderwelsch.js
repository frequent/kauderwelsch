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
  
  // needs to be explicit
  var ANALYSER_CONTEXT;
  var ANALYSER_DOM_NODE;
  var ANALYSER_NODE;
  var ANALYSER_FRAME_ID;

  updateAnalyser = function () {
    var freqByteData = new Uint8Array(ANALYSER_NODE.frequencyBinCount),
      magnitude,
      i;

    // https://www.airtightinteractive.com/2013/10/making-audio-reactive-visuals/
    // volumne
    // beat
    // waveform (array 0-256, 128 is silence) 
    // ANALYSER_NODE.getByteTimeDomainData(freqByteData);
    // equalizer (array 0-256, 0 is silence)
    ANALYSER_NODE.getByteFrequencyData(freqByteData); 
    ANALYSER_CONTEXT.clearRect(0, 0, ANALYSER_DOM_NODE.width, ANALYSER_DOM_NODE.height);
    ANALYSER_CONTEXT.fillStyle = 'silver';
    ANALYSER_CONTEXT.lineCap = 'round';

    for(i = 0; i < ANALYSER_DOM_NODE.width; i += 1){
      magnitude = freqByteData[i]/1.5;

      ANALYSER_CONTEXT.fillRect(i*1.5, ANALYSER_DOM_NODE.height/2, 1, -magnitude * 1);
      ANALYSER_CONTEXT.fillRect(i*1.5, ANALYSER_DOM_NODE.height/2, 1,  magnitude * 1);
    }
    ANALYSER_FRAME_ID = requestAnimationFrame( updateAnalyser );
  };


  function initializeAudio(audio) {
    audio.context = new AUDIO_CONTEXT();

    
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


  
  function bootstrap(my_option_dict) {
    var kauderwelsch_instance = this;

    return new RSVP.Queue()
      .push(function () {
        return MEDIA_DEVICES.getUserMedia(AUDIO_OPTIONS);
      })
      .push(function (my_stream) {
        console.log("bootstrap has stream")
        console.log(my_stream)
        var audio = kauderwelsch_instance.audio,
          input_point = audio.context.createGain(),
          zero_gain;

        // set source to input stream and connect/Create audio node from stream.
        audio.source = audio.context.createMediaStreamSource(my_stream);
        audio.source.connect(input_point);

        //audio.recorder = new Recorder(input_point);
        
        zero_gain = audio.context.createGain();
        zero_gain.gain.value = 0.0;
        input_point.connect(zero_gain);
        zero_gain.connect(audio.context.destination);

        kauderwelsch_instance.initializeAnalyser();
        
        // connect with destination
        input_point.connect(audio.analyser);
        
      })
      .push(null, function (my_error) {
        console.log("BAM, error")
        console.log(my_error)
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
    // audio visualizer
    kauderwelsch_instance.canvas_node = option_dict.analyser_dom_node;

    // Do not pollute the object
    delete option_dict.transfer;
    delete option_dict.analyser_dom_node;
    
    
    // instantiate worker
    kauderwelsch_instance.trainer = new Worker(my_option_dict.pathToTrainer || 'kauderwelsch_worker.js');

    initializeAudio(kauderwelsch_instance.audio);
    bootstrap.call(kauderwelsch_instance, my_option_dict);
  }

  Kauderwelsch.prototype.initializeAnalyser = function () {
    var kauderwelsch_instance = this,
      audio = kauderwelsch_instance.audio,
      canvas_node = kauderwelsch_instance.canvas_node;
    
    audio.analyser = audio.context.createAnalyser();
    audio.analyser.fftSize = 2048;
    
    ANALYSER_CONTEXT = canvas_node.getContext('2d');
    ANALYSER_DOM_NODE = canvas_node;
    ANALYSER_NODE = audio.analyser;
  
    updateAnalyser();
  };
  
  Kauderwelsch.prototype.cancelAnalyser = function () {
    var kauderwelsch_instance = this;
    cancelAnimationFrame(ANALYSER_FRAME_ID);
    ANALYSER_FRAME_ID = null;
  };
  
  Kauderwelsch.prototype.stop = function () {
    var kauderwelsch_instance = this;

  };

  Kauderwelsch.prototype.sendMessage = function (my_message) {
    var kauderwelsch_instance = this;

    // setup worker communication 
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
