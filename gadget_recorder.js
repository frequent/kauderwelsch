/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP, jIO, loopEventListener */
(function (window, document, rJS, RSVP, jIO, loopEventListener) {
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
  
  var SOUND_CLIP_TEMPLATE = "<div class='kw-clip'>\
    <span class='kw-clip-progress'></span>\
    <canvas class='kw-clip-canvas' height='80'></canvas>\
    <div class='kw-clip-audio-controls'>\
      <audio controls></audio>\
    </div>\
    <div class='kw-clip-storage-controls'>\
      <form name='kw-form-save-controls'>\
        <input type='text' name='kw-clip-reference' value='Unnamed Clip' />\
        <input type='submit' value='Save' />\
      </form>\
    </div>\
    <div class='kw-clip-delete-controls'>\
      <form name='kw-form-clip-delete'>\
        <input type='submit' value='Delete' />\
      </form>\
    </div>\
    <div class='kw-clip-crop-controls'>\
      <form name='kw-form-clip-crop'>\
        <input type='submit' value='Crop' />\
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
        return RSVP.all(
          my_input.split(" ").map(function (word) {
            return my_gadget.jio_allDocs({
              "include_docs": true,
              "limit": getLimit(word)
            });
          })
        );
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

  function deleteAudio(my_gadget, my_event) {
    var props = my_gadget.property_dict,
      form = my_event.target,
      list = props.clip_list;
    
    list.removeChild(form.parentNode.parentNode);
    return RSVP.all([
      my_gadget.notify_clear(),
      my_gadget.setClipList()
    ]);
  }

  function cropAudio(my_gadget, my_event) {
    var props = my_gadget.property_dict,
      form = my_event.target,
      canvas_list = form.parentNode.parentNode.querySelectorAll("canvas"),
      clip_canvas,
      crop_canvas;

    my_event.preventDefault();
    if (canvas_list.length === 1) {
      clip_canvas = canvas_list[0];
      crop_canvas = document.createElement("canvas");
      crop_canvas.className= "kw-clip-canvas-crop";
      crop_canvas.width = clip_canvas.width;
      crop_canvas.height = clip_canvas.height;
      clip_canvas.parentNode.insertBefore(crop_canvas, clip_canvas.nextSibling);
      return my_gadget.clipSetCrop(crop_canvas);
    } else {
      crop_canvas = canvas_list[1];
      crop_canvas.parentNode.removeChild(crop_canvas);
    }
    
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
    
    .declareMethod("setClipList", function () {
      var gadget = this,
        props = gadget.property_dict,
        clip_list = props.clip_list,
        placeholder;

      if (!clip_list.firstChild) {
        placeholder = document.createElement("p");
        placeholder.textContent = "No Clips Found";
        clip_list.appendChild(placeholder);
      }
    })
    
    .declareMethod("clipSetCrop", function (my_canvas) {
      var ctx = my_canvas.getContext('2d'),
        canvas_coordinate_list = my_canvas.getBoundingClientRect(),
        left_offset = canvas_coordinate_list.left,
        rect = {
          x: my_canvas.width * 0.1,
          y: 0,
          w: my_canvas.width * 0.8,
          h: my_canvas.height
        },
        current_handle = false,
        handle_size = 16,
        drag = false;
  
      function dist(p1, p2) {
        return Math.sqrt(p2.x - p1.x) * (p2.x - p1.x);
      }
      
      function getHandle(mouse) {
        if (dist(mouse, {"x": rect.x + left_offset}) <= handle_size) {
          return 'left';
        }
        if (dist(mouse, {"x": rect.x + left_offset + rect.w}) <= handle_size) {
          return 'right';
        }
        return false;
      }
    
      function mouseDownHandle(e) {
        if (current_handle) {
          drag = true;
        }
        draw();
      }
      
      function mouseUpHandle() {
        drag = false;
        current_handle = false;
        draw();
      }
      
      function mouseMoveHandle(e) {
        var previous_handle = current_handle,
          mouse_pos;
    
        if (!drag) {
          current_handle = getHandle({"x": e.pageX - my_canvas.offsetLeft});
        }
        if (current_handle && drag) {
          mouse_pos = {"x": e.pageX - left_offset};
          switch (current_handle) {
            case 'left':
              rect.w += rect.x - mouse_pos.x;
              rect.x = mouse_pos.x;
              break;
            case 'right':
              rect.w = mouse_pos.x - rect.x;
              break;
          }
        }
        if (drag || current_handle != previous_handle) {
          draw();
        }
      }
      
      function draw() {
        ctx.clearRect(0, 0, my_canvas.width, my_canvas.height);
        ctx.fillStyle = 'rgba(229, 134, 150, 0.7)';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        if (current_handle) {
          switch (current_handle) {
            case 'left':
              my_canvas.style.cursor= (rect.w > 0 ? 'w' : 'e') + '-resize';
              break;
            case 'right':
              my_canvas.style.cursor= (rect.w > 0 ? 'e' : 'w') + '-resize';
              break;
            }
        } else {
          my_canvas.style.cursor = '';
        }
      }
      draw();
      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            customLoopEventListener(my_canvas, "mousedown", mouseDownHandle),
            customLoopEventListener(my_canvas, "mouseup", mouseUpHandle),
            customLoopEventListener(my_canvas, "mousemove", mouseMoveHandle),
          ]);
        });
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
            placeholder = props.clip_list.querySelector("p"),
            canvas;
          clip = div.firstChild;
          if (placeholder) {
            while (props.clip_list.firstChild) {
              props.clip_list.removeChild(props.clip_list.firstChild);
            }
          }
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
    
    .onEvent("submit", function (my_event) {
      var gadget = this;
      switch (my_event.target.name) {
        case "kw-form-clip-delete":
          return deleteAudio(gadget, my_event);
        case "kw-form-clip-crop":
          return cropAudio(gadget, my_event);
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
    
}(window, document, rJS, RSVP, jIO, loopEventListener));

