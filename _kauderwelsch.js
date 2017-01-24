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
  
  // need to be explicit
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
    
    //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle
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

  /*
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
        var audio = kauderwelsch_instance.audio,
          input_point = audio.context.createGain(),
          zero_gain;

        // set source to input stream and connect/Create audio node from stream.
        audio.source = audio.context.createMediaStreamSource(my_stream);
        audio.source.connect(input_point);

        audio.recorder = new Recorder(input_point);
        
        zero_gain = audio.context.createGain();
        zero_gain.gain.value = 0.0;
        input_point.connect(zero_gain);
        zero_gain.connect(audio.context.destination);

        kauderwelsch_instance.initializeAnalyser();
        
        // connect with destination
        input_point.connect(audio.analyser);
        
      })
      .push(null, function (my_error) {
        console.log(my_error);
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
    kauderwelsch_instance.trainer = new Worker(my_option_dict.pathToTrainer || 'kauderwelsch_trainer.js');

    initializeAudio(kauderwelsch_instance.audio);
    
    // XXX return promise?
    return new RSVP.Queue()
      .push(function () {
         return bootstrap.call(kauderwelsch_instance, my_option_dict);
      })
      .push(function () {
        return kauderwelsch_instance;
      });
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
  
  Kauderwelsch.prototype.record = function() {
    var kauderwelsch_instance = this;
    
    // XXX really clear? dump file if not stored?
    kauderwelsch_instance.audio.recorder.clear();
    kauderwelsch_instance.audio.recorder.record();
  };
  
  Kauderwelsch.prototype.stop = function () {
    var kauderwelsch_instance = this;
    
    kauderwelsch_instance.audio.recorder.stop();
    kauderwelsch_instance.is_recording = null;

    // XXX save? display file recorded and allow to play/delete
    // store on storage and add text info
    // kauderwelsch_instance.audio.recorder.getBuffers( gotBuffers);
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


/* display records

// fork getUserMedia for multiple browser versions, for the future
// when more browsers support MediaRecorder

navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

// set up basic variables for app

var record = document.querySelector('.record');
var stop = document.querySelector('.stop');
var soundClips = document.querySelector('.sound-clips');
var canvas = document.querySelector('.visualizer');

// disable stop button while not recording

stop.disabled = true;

// visualiser setup - create web audio api context and canvas

var audioCtx = new (window.AudioContext || webkitAudioContext)();
var canvasCtx = canvas.getContext("2d");

//main block for doing the audio recording

if (navigator.getUserMedia) {
  console.log('getUserMedia supported.');

  var constraints = { audio: true };
  var chunks = [];

  var onSuccess = function(stream) {
    var mediaRecorder = new MediaRecorder(stream);

    visualize(stream);

    record.onclick = function() {
      mediaRecorder.start();
      console.log(mediaRecorder.state);
      console.log("recorder started");
      record.style.background = "red";

      stop.disabled = false;
      record.disabled = true;
    }

    stop.onclick = function() {
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      console.log("recorder stopped");
      record.style.background = "";
      record.style.color = "";
      // mediaRecorder.requestData();

      stop.disabled = true;
      record.disabled = false;
    }

    mediaRecorder.onstop = function(e) {
      console.log("data available after MediaRecorder.stop() called.");

      var clipName = prompt('Enter a name for your sound clip?','My unnamed clip');
      console.log(clipName);
      var clipContainer = document.createElement('article');
      var clipLabel = document.createElement('p');
      var audio = document.createElement('audio');
      var deleteButton = document.createElement('button');
     
      clipContainer.classList.add('clip');
      audio.setAttribute('controls', '');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'delete';

      if(clipName === null) {
        clipLabel.textContent = 'My unnamed clip';
      } else {
        clipLabel.textContent = clipName;
      }

      clipContainer.appendChild(audio);
      clipContainer.appendChild(clipLabel);
      clipContainer.appendChild(deleteButton);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
      chunks = [];
      var audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      console.log("recorder stopped");

      deleteButton.onclick = function(e) {
        evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
      }

      clipLabel.onclick = function() {
        var existingName = clipLabel.textContent;
        var newClipName = prompt('Enter a new name for your sound clip?');
        if(newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      }
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    }
  }

  var onError = function(err) {
    console.log('The following error occured: ' + err);
  }

  navigator.getUserMedia(constraints, onSuccess, onError);
} else {
   console.log('getUserMedia not supported on your browser!');
}

function visualize(stream) {
  var source = audioCtx.createMediaStreamSource(stream);

  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  //analyser.connect(audioCtx.destination);
  


}
*/

