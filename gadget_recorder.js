/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP, loopEventListener, jIO */
(function (window, document, rJS, RSVP, loopEventListener, jIO) {
  "use strict";

  // Stream Recording inspired by:
  // Copyright © 2013 Matt Diamond - License (MIT)
  // https://github.com/mattdiamond/Recorderjs

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

  function getLimit(my_input_list) {
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
  }

  function validateAgainstDict(my_gadget, my_input) {
    return new RSVP.Queue()
      .push(function () {
        return my_gadget.jio_allDocs({"limit": getLimit(my_input.split(","))});
      })
      .push(function (my_range) {
        console.log(my_range)
        throw "YEAH"
        //return my_gadget.jio_getAttachment("prefetch", "sample.txt", {
        //  format: "text",
        //  "range": "bytes=" + my_range
        //}); 
      })
      .push(function (my_range_text) {
        console.log(my_range_text)
      })
      .push(undefined, function (my_error_list) {
        console.log("NOPE")
        console.log(my_error_list)
        throw my_error_list
      });
  }


  function handleCallback(my_gadget, my_event) {
    if (my_event.data.error) {
      throw my_event.data.error;
    }
    switch (my_event.data.command) {
      case "exportWAV":
        return my_event.data.result;
      case "exportMonoWAV":
        return my_event.data.result;
      case "clear":
        break;
      case "getBuffers":
        return my_event.data.result;
      case "init":
        break;
      case "getLexicon":
        console.log("HAHA")
        return new RSVP.Queue()
          .push(function () {
            return my_gadget.getLexicon({});
          })
          .push(function (my_data) {
            console.log("got lexicon")
            console.log(my_data)
            return my_gadget.sendMessage({"command": my_event.data.callback, "option_dict": {
              "data": my_data
            }});
          });
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
    .declareAcquiredMethod('jio_getAttachment', 'jio_getAttachment')
    .declareAcquiredMethod('jio_allDocs', 'jio_allDocs')

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
          return gadget.sendMessage({"command": 'init', "option_dict": {
            "sample_rate": props.context.sampleRate
          }});
        })
        .push(function () {
          props.source.connect(props.node);
          props.node.connect(props.context.destination);
        });
    })

    .declareMethod("getLexicon", function (my_option_dict) {
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return gadget.setActiveStorage("indexeddb");
        })
        .push(function () {
          return gadget.jio_allDocs({
            "include_docs": true, 
            "limit": my_option_dict.limit
          });
        })
        .push(function (my_result) {
          console.log(my_result)
          return my_result;
        });
    })
    
    .declareMethod("sendMessage", function (my_message) {
      var gadget = this,
        props = gadget.property_dict;
  
      // setup worker communication 
      return new RSVP.Promise(function (resolve, reject, notify) {
        props.router.onmessage = function (my_event) {
          if (my_event.data.error) {
              return reject(handleCallback(gadget, my_event));
            } else {
              return resolve(handleCallback(gadget, my_event));
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
      return gadget.sendMessage({"command":'clear'});
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
            if (props.is_recording) {
              
              // stop, update memory storage and dom with new file
              form.querySelector("input[type='submit']").value = "Record";
              return gadget.notify_stop();
            } else {

              // validate and record
              return new RSVP.Queue()
                .push(function () {
                  var text_input = form.querySelector("input[type='text']");
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
