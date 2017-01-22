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
  var REQUEST_ANIMATION_FRAME = navigator.requestAnimationFrame || 
    navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;
  var CANCEL_ANIMATION_FRAME = navigator.cancelAnimationFrame || 
    navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;

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

  function updateAnalyser() {
    var kauderwelsch_instance = this,
      bar_
    
    if (!kauderwelsch_instance.analyser_context) {
        var canvas = kauderwelsch_instance.analyser_dom_node;
        canvas_width = canvas.width;
        canvas_height = canvas.height;
        kauderwelsch_instance.analyser_context = canvas.getContext('2d');
    }

    // visualiser draw code here
    {
      var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);
      var step = Math.ceil( data.length / canvas_width );
      var amp = canvas_height / 2;
      kauderwelsch_instance.fillStyle = "silver";
      kauderwelsch_instance.visualiser_context.clearRect(0, 0, canvas_width, canvas_height);
      for(var i=0; i < width; i++){
          var min = 1.0;
          var max = -1.0;
          for (j=0; j<step; j++) {
              var datum = data[(i*step)+j]; 
              if (datum < min)
                  min = datum;
              if (datum > max)
                  max = datum;
          }
      context.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
    }

        var SPACING = 3;
        var BAR_WIDTH = 1;
        var numBars = Math.round(canvas_width / SPACING);
        var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

        analyserNode.getByteFrequencyData(freqByteData); 

        analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
        analyserContext.fillStyle = 'silver';
        analyserContext.lineCap = 'round';
        var multiplier = analyserNode.frequencyBinCount / numBars;

        // Draw rectangle for each frequency bin.
        for (var i = 0; i < numBars; ++i) {
            var magnitude = 0;
            var offset = Math.floor( i * multiplier );
            // gotta sum/average the block, or we miss narrow-bandwidth spikes
            for (var j = 0; j< multiplier; j++)
                magnitude += freqByteData[offset + j];
            magnitude = magnitude / multiplier;
            var magnitude2 = freqByteData[i * multiplier];
            analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);
        }
    }
    
    kauderwelsch_instance.rafID = window.requestAnimationFrame(updateVisualiser);

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
      throw new TypeEroor("Browser does not support AnimationFrame");
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

