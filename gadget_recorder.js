/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP, loopEventListener, jIO */
(function (window, document, rJS, RSVP, loopEventListener, jIO) {
  "use strict";

  // Stream Recording inspired by:
  // Copyright Â© 2013 Matt Diamond - License (MIT)
  // https://github.com/mattdiamond/Recorderjs

  // XXX test for worker?

  var WORKER_PATH = 'gadget_recorder_worker_router.js';

  /////////////////////////////
  // templates
  /////////////////////////////
  var SOUND_CLIP_TEMPLATE = "<div class='kw-clip'>\
    <span class='kw-clip-progress'></span>\
    <canvas class='kw-clip-canvas' height='50'></canvas>\
    <div class='kw-clip-audio-controls'>\
      <audio controls></audio>\
    </div>\
    <div class='kw-clip-storage-controls'>\
      <form name='kw-form-clip-save'>\
        <input type='text' name='kw-clip-reference' value='Unnamed Clip' />\
        <input type='checkbox' name='kw-clip-store-cache' value='Local' />\
        <input type='checkbox' name='kw-clip-store-soundcloud' value='Soundcloud' />\
        <input type='submit' value='Save' />\
      </form>\
    </div>\
    <div class='kw-clip-delete-controls'>\
      <form name='kw-form-clip-delete'>\
        <input type='submit' value='Delete' />\
      </form>\
    </div>\
  </div>";

  /////////////////////////////
  // some methods 
  /////////////////////////////
  function initializeDownload(blob, filename) {
      var link = document.createElement("a");
      link.href = (window.URL || window.webkitURL).createObjectURL(blob);
      link.download = filename || 'output.wav';
      link.textContent = "Download Meno";
      return link;
    }

  function drawBuffer(width, height, context, data) {
    var step = Math.ceil( data.length / width ),
      amp = height / 2,
      min,
      max,
      datum,
      i,
      j;
    context.fillStyle = "silver";
    context.clearRect(0,0,width,height);
    for(i=0; i < width; i++){
        min = 1.0;
        max = -1.0;
        for (j=0; j<step; j++) {
            datum = data[(i*step)+j]; 
            if (datum < min)
                min = datum;
            if (datum > max)
                max = datum;
        }
        context.fillRect(i, (1+min)*amp, 1, Math.max(1,(max-min)*amp*0.75));
    }
  }

  function parseTemplate(my_template, my_value_list) {
    var template = my_template,
      value_list = my_value_list || [],
      html_content = [],
      counter = 0,
      setHtmlContent = function (my_content_list) {
        return function (my_snippet) {
          var value = value_list[counter] || "";
          my_content_list.push(my_snippet + value);
          counter += 1;
        };
      };
    template.split("%s").map(setHtmlContent(html_content));
    return html_content.join("");
  }
  
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

  // orocess to mono during recording
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

  function getCharacterPointers(my_input_list) {
    var output_array = [],
      len = my_input_list.length,
      input_array,
      input_value,
      single,
      double,
      follow_up,
      i;
    for (i = 0; i < len; i ++) {
      input_array = [];
      input_value = my_input_list[i];
      single = input_value.charAt(0);
      double = input_value.charAt(1);
      // XXX hm
      follow_up = String.fromCharCode(double.charCodeAt(0) + 1);
      input_array.push(single + double);
      input_array.push(single + follow_up);
      output_array.push(input_array);
    }
    return output_array;
      
    
    /*
    return my_input_list.reduce(function(current, value) {
      var single = value.charAt(0),
        double = value.charAt(1),
        follow_up = String.fromCharCode(double.charCodeAt(0) + 1),
        output_array = [];
      console.log(single)
      console.log(double)
      console.log(follow_up)
      output_array.push(single + double);
      output_array.push(single + follow_up);
      return current.push(output_array);
    }, []);
    */
  }

  function setPointer(my_index, my_pointer) {
    if (my_index.hasOwnProperty(my_pointer)) {
      return my_index[my_pointer];
    }
    console.log(my_pointer)
    if (my_pointer[1] === "Z") {
      throw new Error("Better stop looping before reaching infinity, non?")
    }
    console.log(my_pointer)
    console.log("did not find: " + my_pointer + " going to " + my_pointer[0] + String.fromCharCode(my_pointer.charCodeAt(1) + 1))
    return setPointer(my_index, my_pointer[0] + String.fromCharCode(my_pointer.charCodeAt(1) + 1))
  }

  function getBoundaryList(my_pointer_list, my_index) {
    var output_list = [],
      len = my_pointer_list.length,
      i,
      start_pointer,
      end_pointer;
    console.log(my_pointer_list)
    console.log(my_index)
    
    for (i = 0; i < len; i += 1) {
      start_pointer = setPointer(my_index, my_pointer_list[i][0]) 
      end_pointer = setPointer(my_index, my_pointer_list[i][1]);
      output_list.push(start_pointer + "-" + end_pointer);
    }
    console.log("DONE POINTER")
    console.log(output_list)
    return output_list.join(",");
  }

  // check dictionary whether words to be spoken are in it, throw if not
  // XXX this is a worker task, no?
  function validateAgainstDict(my_gadget, my_input_value) {
    console.log("starting with ", my_input_value)
    return new RSVP.Queue()
      .push(function () {
        return my_gadget.jio_getAttachment("dictionary", "index.VoxForgeDict.txt", {
          format: "text"
        });
      })
      .push(function (my_index) {
        var pointer_dict = JSON.parse(my_index);
        console.log(pointer_dict);
        console.log(my_input_value)
        console.log(my_input_value.split(","))
        console.log(getCharacterPointers(my_input_value.split(",")))
        console.log("let's get boundaries")
        return getBoundaryList(getCharacterPointers(my_input_value.split(",")), pointer_dict)
      })
      .push(function (boundary_list) {
        console.log("setting range to ", boundary_list)
          return my_gadget.jio_getAttachment("dictionary", "VoxForgeDict.txt", {
            "range": "bytes=" + boundary_list,
            "format": "text"
          });
        })
        .push(function (my_dictionary_content) {
          console.log(my_dictionary_content);
          console.log("YEAH")
          // look through this for the text from my_invput_value, return or missing words.

        })
        .push(undefined, function (my_error_list) {
          console.log("NOPE")
          console.log(my_error_list)
          throw my_error_list
          // words could not be found, throw the words, so user can update
        });
  }


  function handleCallback(my_event) {
    if (my_event.data.error) {
      throw my_event.data.error;
    }
    switch (my_event.data.command) {
      case "exportWAV":
        return my_event.data.result;
      case "exportMonoWAV":
        return my_event.data.result;
      case "clear":
        //console.log("cleared");
        break;
      case "getBuffers":
        return my_event.data.result;
      case "init":
        //console.log("started");
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
          my_gadget.property_dict.clip_list = 
            my_element.querySelector(".kw-clip-list");
        });
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod('setActiveStorage', 'setActiveStorage')
    .declareAcquiredMethod('jio_create', 'jio_create')
    .declareAcquiredMethod('jio_getAttachment', 'jio_getAttachment')

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod('render', function (my_option_dict) {
      var gadget = this,
      props = gadget.property_dict;
      props.is_recording = null;

      return new RSVP.Queue()
        .push(function () {
          var buffer_length = 4096;

          // Note: sample rate will be 48000
          // XXX error handling, need to terminate worker .terminate()
          props.router = new Worker(WORKER_PATH);
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
          return gadget.setActiveStorage("serviceworker");
        })
        .push(function () {
          return gadget.jio_create({"type": "serviceworker"});
        })
        .push(function () {
          return gadget.sendMessage({"command": 'init', "option_dict": {
            "sample_rate": props.context.sampleRate
          }});
        })
        .push(function () {
          props.source.connect(props.node);
          props.node.connect(props.context.destination);
        });
    })
    
    .declareMethod("sendMessage", function (my_message) {
      var gadget = this,
        props = gadget.property_dict;
  
      // setup worker communication 
      return new RSVP.Promise(function (resolve, reject, notify) {
        props.router.onmessage = function (my_event) {
          if (my_event.data.error) {
              reject(handleCallback(my_event));
            } else {
              resolve(handleCallback(my_event));
            }
          };
          return props.router.postMessage(my_message);
        });
    })
    
    .declareMethod("notify_stop", function () {
      var gadget = this,
        props = gadget.property_dict,
        div = document.createElement("div"),
        audio_element,
        audio_url,
        clip;

      props.is_recording = null;
      div.innerHTML = parseTemplate(SOUND_CLIP_TEMPLATE);
      audio_element = div.querySelector("audio");  
      audio_element.controls = true;
      
      function gotBuffers(my_canvas, my_buffer) {
        drawBuffer(my_canvas.width, my_canvas.height, my_canvas.getContext('2d'), my_buffer);
        return my_buffer;
      }
      
      return new RSVP.Queue()
        .push(function () {
          return gadget.getBuffers();
        })
        .push(function (my_buffer) {
          var mono_buffer = my_buffer[0],
            canvas;

          clip = div.firstChild,
          props.clip_list.appendChild(clip);
          canvas = clip.querySelector("canvas");
          canvas.setAttribute("width", clip.offsetWidth);
          gotBuffers(canvas, mono_buffer);

          return gadget.exportMonoWAV();
        })
        .push(function (my_resample_data) {
          audio_element.src = window.URL.createObjectURL(my_resample_data);
          audio_element.parentNode.appendChild(initializeDownload(my_resample_data, "punt.wav"));
          
          return gadget.sendMessage({"command": 'init', "option_dict": {
            "sample_rate": props.context.sampleRate
          }});
        })
        .push(function () {
          var progress = clip.querySelector(".kw-clip-progress");
          
          // XXX animation frames, too?
          function inProgress (my_event) {
            var offset = Math.floor( clip.offsetWidth * audio_element.currentTime / audio_element.duration );
            progress.style.left = offset + "px";
          }
          return loopEventListener(audio_element, "timeupdate", false, inProgress);
        });
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

    .declareMethod("getBuffers", function () {
      var gadget = this;
      return gadget.sendMessage({"command": 'getBuffers'});
    })
    
    .declareMethod("exportWAV", function (my_type) {
      var gadget = this;
      return gadget.sendMessage({"command": 'exportWAV', "option_dict": {
        "type": my_type || "audio/wav"
      }});
    })

    .declareMethod("exportMonoWAV", function (my_type) {
      var gadget = this;
      return gadget.sendMessage({"command": 'exportMonoWAV', "option_dict": {
        "type": my_type || "audio/wav"
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
        return new RSVP.Queue()
          .push(function () {
            my_event.preventDefault();
            console.log("submit")
            if (props.is_recording) {
              
              // stop, update memory storage and dom with new file
              form.querySelector("input[type='submit']").value = "Record";
              return gadget.notify_stop();
            } else {
              console.log("check if we can record")
              // validate and record
              return new RSVP.Queue()
                .push(function () {
                  var text_input = form.querySelector("input[type='text']");
                  console.log(text_input.value)
                  return validateAgainstDict(gadget, text_input.value);
                })
                .push(function (my_is_validated_entry) {
                  if (my_is_validated_entry) {
                    return gadget.notify_record();
                  }
                  console.log("NOPE, broken on ", my_is_validated_entry);
                  return;
                });
            }
          })
          .push(function () {
            return false;
          });
      }
      return loopEventListener(form, "submit", false, form_submit_handler);
    });
    
}(window, document, rJS, RSVP, loopEventListener, jIO));

