/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP, jIO */
(function (window, document, rJS, RSVP, jIO) {
  "use strict";

  // Stream Recording inspired by:
  // Copyright Â© 2013 Matt Diamond - License (MIT)
  // https://github.com/mattdiamond/Recorderjs

  var WORKER_PATH = 'gadget_recorder_worker_router.js';
  var FILE_PREFIX = "sample.txt";
  var LINE_BREAKS = /(.*?[\r\n])/g;

  /////////////////////////////
  // templates
  /////////////////////////////

  /////////////////////////////
  // some methods 
  /////////////////////////////

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

  function getLimit(my_input) {
    // as it's not possible to get lowerbound + NEXT,
    // String.fromCharCode(double.charCodeAt(0) + 1); is not guaranteed to
    // be in the index, we get all records on index from 
    return [
      FILE_PREFIX + ":" + my_input.charAt(0) + my_input.charAt(1),
      undefined
    ];
  }
  
  // unsexy
  function testChunk(my_chunk, my_input) {
    var rows = my_chunk.split(LINE_BREAKS).filter(Boolean),
      input_list = my_input.split(" "),
      output_list = [],
      len = rows.length,
      found,
      input,
      i,
      j,
      row;

    for (j = 0; j < input_list.length; j += 1) {
      input = input_list[j];
      found = null;
      for (i = 0; i < len; i += 1) {
        if (rows[i].split(" ")[0] === input) {
          found = true;
        }
      }
      if (found !== true) {
        output_list.push(input);
      }
    }
    return output_list;
  }

  function convertRange(my_range) {
    var output_array = [],
      i;
    for (i = 0; i < 2 && my_range.data.total_rows >= 2; i += 1) {
      output_array.push(my_range.data.rows[i].doc.block);
    }
    return output_array.join("-");
  }

  function validateAgainstDict(my_gadget, my_input) {
    return new RSVP.Queue()
      .push(function () {
        return RSVP.all(my_input.split(" ").map(function (word) {
          return my_gadget.jio_allDocs({
            "include_docs": true,
            "limit": getLimit(word)
          });
        }));
      })
      .push(function (my_range_list) {
        return RSVP.all(my_range_list.map(function (current) {
            return my_gadget.jio_getAttachment("prefetch", FILE_PREFIX, {
              "format": "text",
              "range": "bytes=" + convertRange(current)
            });
          }));
      })
      .push(function (my_range_text_list) {
        return testChunk(my_range_text_list.join(""), my_input);
      })
      .push(undefined, function (my_error_list) {
        throw my_error_list;
      });
  }

  function recordAudio(my_gadget, my_event) {
    var props = my_gadget.property_dict,
      form = my_event.target,
      text_input = form.querySelector("input[type='text']");

    my_event.preventDefault();
    
    // stop, update memory storage and dom with new file
    if (props.is_recording) {
      form.querySelector("input[type='submit']").value = "Record";
      return my_gadget.notify_stop();
    }
    
    // validate and record
    return new RSVP.Queue()
      .push(function () {
        var text_value = text_input.value.toUpperCase();
        text_input.value = text_value;
        return validateAgainstDict(my_gadget, text_value);
      })
      .push(function (my_validation_error_list) {
        var message;
        if (my_validation_error_list.length === 0) {
          form.querySelector("input[type='submit']").value = "Stop";
          return my_gadget.notify_record();
        }
        // flag words not found in dictionary
        message = form.querySelector(".kw-highlight-input");
        message.className += " kw-highlight-active";
        message.innerHTML = text_input.value.split(" ").reduce(function (prev, next) {
          if (my_validation_error_list.indexOf(next) > -1) {
            return prev + " <span>" + next + "</span>";
          } else {
            return prev + " " + next;
          }
        }, "");
      })
      .push(function () {
        return false;
      });
  }

  function callbackHandler(my_gadget, my_event) {
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
    }
  }

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      this.property_dict = {
        "clip_list": this.element.querySelector(".kw-clip-list")
      };
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod('jio_getAttachment', 'jio_getAttachment')
    .declareAcquiredMethod('jio_allDocs', 'jio_allDocs')
    
    /////////////////////////////
    // published methods
    /////////////////////////////
    .allowPublicAcquisition('exportMonoWAV', function () {
      return this.exportMonoWAV();
    })
    .allowPublicAcquisition('setClipList', function (my_scope) {
      return this.setClipList(my_scope);
    })

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
    
    .declareMethod("setClipList", function (my_scope) {
      var gadget = this,
        props = gadget.property_dict,
        clip_list = props.clip_list,
        placeholder;

      if (my_scope) {
        clip_list.removeChild(clip_list.querySelector("div[data-gadget-scope='" + my_scope + "']"));
      }
      if (!clip_list.firstChild) {
        placeholder = document.createElement("p");
        placeholder.textContent = "No Clips Found";
        clip_list.appendChild(placeholder);
      }
    })

    .declareMethod("sendMessage", function (my_message) {
      var gadget = this,
        props = gadget.property_dict;
  
      // setup worker communication 
      return new RSVP.Promise(function (resolve, reject, notify) {
        props.router.onmessage = function (my_event) {
          if (my_event.data.error) {
              return reject(callbackHandler(gadget, my_event));
            } else {
              return resolve(callbackHandler(gadget, my_event));
            }
          };
          return props.router.postMessage(my_message);
        });
    })

    .declareMethod("notify_stop", function () {
      var gadget = this,
        props = gadget.property_dict;
        //div = document.createElement("div"),
        //audio_element,
        //audio_url,
        //clip;

      props.is_recording = null;
      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            gadget.declareGadget("gadget_clip.html"),
            gadget.getBuffers()
          ]);
        })
        .push(function (my_result_list) {
          return my_result_list[0].render({"canvas_buffer": my_result_list[1]});
        })
        .push(function (my_rendered_clip) {
          var placeholder = props.clip_list.querySelector("p");
          if (placeholder) {
            while (props.clip_list.firstChild) {
              props.clip_list.removeChild(props.clip_list.firstChild);
            }
          }
          props.clip_list.appendChild(my_rendered_clip);
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
    
    .onEvent("submit", function (my_event) {
      var gadget = this;
      switch (my_event.target.name) {
        case "kw-form-record":
          return recordAudio(gadget, my_event);
        default:
          return false;
      }
    }, false, true)
    
    .onEvent("input", function (my_event) {
      var message = this.element.querySelector(".kw-highlight-active");
      if (message) {
        message.textContent = "";
        message.className = message.className.replace(" kw-highlight-active", "");
      }
    });
    
}(window, document, rJS, RSVP, jIO));

