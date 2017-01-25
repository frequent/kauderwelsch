/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, RSVP, loopEventListener */
(function (window, rJS, RSVP) {
  "use strict";

  // Stream Visualiser/Recorder inspired by:
  // Copyright (c) 2014 Chris Wilson -License (MIT)
  // https://github.com/cwilso/AudioRecorder

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
  
  var AUDIO_CONTEXT = window.AudioContext || window.webkitAudioContext;
  var MEDIA_DEVICES = navigator.mediaDevices;

  var REQUEST_ANIMATION_FRAME = window.requestAnimationFrame || 
    window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
  var CANCEL_ANIMATION_FRAME = window.cancelAnimationFrame || 
    window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame;

  /////////////////////////////
  // some methods
  /////////////////////////////

  function updateAnalyser () {
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
  }


  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function (my_gadget) {
      my_gadget.property_dict = {};

      return new RSVP.Queue()
        .push(function () {
          return my_gadget.getElement();
        })
        .push(function (my_element) {
          my_gadget.property_dict.element = my_element;
        });
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod('render', function (my_option_dict) {
      var gadget = this,
        props = gadget.property_dict;

      if (!AUDIO_CONTEXT) {
        throw new TypeError("Browser does not support AudioContext");
      }
      if (!MEDIA_DEVICES) {
        throw new TypeError("Browser does not support MediaDevices");
      }
      if (!REQUEST_ANIMATION_FRAME || !CANCEL_ANIMATION_FRAME) {
        throw new TypeError("Browser does not support AnimationFrame");
      }

      props.canvas_Node = props.element.querySelector(".kw-analyser");
      props.context = new AUDIO_CONTEXT();

      // XXX where to load trainer?
      // props.trainer = new Worker(my_option_dict.pathToTrainer || 'kauderwelsch_trainer.js');

      return gadget;
    })
    
    .declareMethod("initializeAnalyser", function () {
      var gadget = this,
        props = gadget.property_dict;
        
      props.analyser = props.context.createAnalyser();
      props.analyser.fftSize = 2048;
      
      ANALYSER_CONTEXT = props.canvas_node.getContext("2d");
      ANALYSER_DOM_NODE = props.canvas_node;
      ANALYSER_NODE = props.analyser;

      return updateAnalyser();      
    })

    .declareMethod("cancelAnalyser", function () {
      var gadget = this;
      cancelAnimationFrame(ANALYSER_FRAME_ID);
      ANALYSER_FRAME_ID = null;
    })

    .declareService(function () {
      var gadget = this,
        props = gadget.property_dict;

      return new RSVP.Queue()
      .push(function () {
        return MEDIA_DEVICES.getUserMedia(AUDIO_OPTIONS);
      })
      .push(function (my_stream) {
        var input_point = props.context.createGain(),
          zero_gain;

        // set source to input stream, connect & Create audio node from stream
        props.source = props.context.createMediaStreamSource(my_stream);
        props.source.connect(input_point);

        return new RSVP.Queue()
          .push(function () {
            return gadget.getDeclaredGadget("recorder");
          })
          .push(function (my_recorder_gadget) {
            return my_recorder_gadget.render({"input_point": input_point});
          })
          .push(function () {
          
            zero_gain = props.context.createGain();
            zero_gain.gain.value = 0.0;
            input_point.connect(zero_gain);
            zero_gain.connect(props.context.destination);
        
            // initialize analyser and connect with destination
            return gadget.initializeAnalyser();
          })
          .push(function () {
            input_point.connect(props.analyser);
            return;
          });
      })
      .push(null, function (my_error) {
        console.log(my_error);
        throw my_error;
      });
    });
    
}(window, rJS, RSVP));

