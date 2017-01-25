/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, RSVP, loopEventListener */
(function (window, rJS, RSVP, loopEventListener) {
  "use strict";

  // Stream Recording inspired by:
  // Copyright Â© 2013 Matt Diamond - License (MIT)
  // https://github.com/mattdiamond/Recorderjs

  var WORKER_PATH = 'worker_recorder.js';

  /////////////////////////////
  // some methods 
  /////////////////////////////
    
  /*
  // called from listener, use later
  function saveAudio() {
    ?> recorder.exportWAV(doneEncoding);
    // could get mono instead by saying
    // audioRecorder.exportMonoWAV( doneEncoding );
  }

  // called from listener after ... encoding
  function doneEncoding( blob ) {
    Recorder.setupDownload( blob, "myRecording" + ((recIndex<10)?"0":"") + recIndex + ".wav" );
    recIndex++;
  }

  // called from listener, use on save with resampling
  function convertToMono(input) {
    var gadget = this;
      splitter = gadget.audio.context.createChannelSplitter(2);
      merger = gadget.audio.context.createChannelMerger(2);

      input.connect(splitter);
      splitter.connect(merger, 0, 0);
      splitter.connect(merger, 0, 1);
      return merger;
  }
  */

  // Custom loopEventListener
  function customLoopEventListener(my_target, my_type, my_callback) {
    var handle_event_callback,
      callback_promise;

    function cancelResolver() {
      if ((callback_promise !== undefined) &&
        (typeof callback_promise.cancel === "function")) {
        callback_promise.cancel();
      }
    }
    function canceller() {
      cancelResolver();
    }
    function itsANonResolvableTrap(resolve, reject) {
      handle_event_callback = function (evt) {
        cancelResolver();
        callback_promise = new RSVP.Queue()
          .push(function () {
            return my_callback(evt);
          })
          .push(undefined, function (error) {
            if (!(error instanceof RSVP.CancellationError)) {
              canceller();
              reject(error);
            }
          });
      };
      // eg object.onfirstpass = function () {...
      my_target["on" + my_type] = my_callback;
    }
    return new RSVP.Promise(itsANonResolvableTrap, canceller);
  }


  function handleCallback(my_event) {
    if (my_event.data.error) {
      throw my_event.data.error;
    }
    switch (my_event.data.command) {
      case "exportWav":
        console.log(my_event.data.reply);
        break;
      case "exportMonoWav":
        console.log(my_event.data.reply);
        break;
      case "clear":
        console.log(my_event.data);
        break;
      case "getBuffers":
        console.log(my_event.data.reply);
        break;
      case "init":
        console.log("started");
        break;
    }
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
      props.is_recording = null;

      // XXX Harmonize sendMessage API
      return new RSVP.Queue()
        .push(function () {
          var buffer_length = 4096;

          props.recorder = new Worker(WORKER_PATH);
          props.source = my_option_dict.input_point;
          props.context = props.source.context;
          props.done_worker_init.resolve();

          if (!props.context.createScriptProcessor) {
            props.node = props.context.createJavaScriptNode(buffer_length, 2, 2);
          } else {
            props.node = props.context.createScriptProcessor(buffer_length, 2, 2);
          }
        })
        .push(function () {
          return gadget.sendMessage({"command": 'init', "option_dict": {
            "sample_rate": props.context.sampleRate
          }});
        })
        .push(function () {
          props.source.connect(props.node);
          props.node.connect(props.context.destination);
          return gadget;
        });
    })
    
    .declareMethod("sendMessage", function (my_message) {
      var gadget = this,
        props = gadget.property_dict;
  
      // setup worker communication 
      return new RSVP.Promise(function (resolve, reject, notify) {
        props.recorder.onmessage = function (my_event) {
          if (my_event.data.error) {
              reject(handleCallback(my_event));
            } else {
              resolve(handleCallback(my_event));
            }
          };
          return props.recorder.postMessage(my_message);
        });
    })
    
    .declareMethod("notify_stop", function () {
      var gadget = this;
      gadget.property_dict.is_recording = null;
    })

    .declareMethod("notify_record", function () {
      var gadget = this;
      
      // recording should be triggered by onaudioprocess
      // first clear buffers, then allow recording
      return new RSVP.Queue()
        .push(function () {
          return gadget.notify_clear();
        })
        .push(function () {
          gadget.property_dict.is_recording = true;
        });
    })
    
    .declareMethod("notify_clear", function () {
      var gadget = this;
      return gadget.sendMessage({command:'clear'});
    })
    
    .declareMethod('initializeDownload', function (blob, filename) {
      // XXX fix once multiple files displayed
      link = document.getElementById("save");
      link.href = (window.URL || window.webkitURL).createObjectURL(blob);
      link.download = filename || 'output.wav';
    })
    
    // XXX note sure the following are needed right away
    
    // fetch file?
    .declareMethod("getBuffers", function (my_callback) {
      var gadget = this,
        props = gadget.property_dict;
      props.curren_callback = my_callback;
      return gadget.sendMessage({"command": 'getBuffers'});
    })
    
    // do different when saving
    .declareMethod("exportWav", function (my_callback, my_type) {
      var gadget = this,
        props = gadget.property_dict;
      props.current_callback = my_callback;
      props.type = my_type || "audio/wav";
      return gadget.sendMessage({"command": 'exportWav', "option_dict": {
        "type": type}
      });
    })

    // dito
    .declareMethod("exportMonoWav", function (my_callback, my_type) {
      var gadget = this,
        props = gadget.property_dict;
      props.current_callback = my_callback;
      props.type = my_type || "audio/wav";
      return gadget.sendMessage({"command": 'exportMonoWav', "option_dict": {
        "type": type
      }});      
    })

    .declareService(function () {
      var gadget = this,
        props = gadget.property_dict,
        deferred = new RSVP.defer();

      function record(my_event) {
        if (!props.is_recording) {
          return;
        }
        //Debug: console.log("recording...")
        return gadget.sendMessage({"command": "record", "option_dict": {
          "buffer": [
            my_event.inputBuffer.getChannelData(0),
            my_event.inputBuffer.getChannelData(1)
          ]
        }});
      }

      // if the script node is not connected to an output the 
      // "onaudioprocess" event is not triggered in chrome.
      return new RSVP.Queue()
        .push(function () {
          props.done_worker_init = deferred;
          return deferred.promise;
        })
        .push(function () {
          return customLoopEventListener(props.node, "audioprocess", record);
        });
    })
    .declareService(function () {
      var gadget = this,
        props = gadget.property_dict,
        form = props.element.querySelector(".kw-controls form");

      function form_submit_handler(my_event) {
        var queue = new RSVP.Queue();

        if (props.is_recording) {
          // stop, update memory storage and dom with new file
          form.querySelector("input").value = "Record";
          queue.push(function () {
            return gadget.notify_stop();
          });
        } else {
          // record
          form.querySelector("input").value = "Stop";
          queue.push(function () {
            return gadget.notify_record();
          });
        }

        queue.push(function () {
          my_event.preventDefault();
          return false;
        });

        return queue;
      }
      return loopEventListener(form, "submit", false, form_submit_handler);
    });
    
}(window, rJS, RSVP, loopEventListener));

