/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP, loopEventListener, jIO */
(function (window, document, rJS, RSVP, loopEventListener, jIO) {
  "use strict";

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

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this,
        div = document.createElement("div");
      
      div.innerHTML = parseTemplate(SOUND_CLIP_TEMPLATE);
      gadget.property_dict = {
        "clip": div.firstChild,
        "canvas": div.querySelector("canvas"),
        "progress": div.querySelector(".kw-clip-progress"),
        "audio_element": div.querySelector("audio")
      };
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod("exportMonoWAV", "exportMonoWAV")

    /////////////////////////////
    // published methods
    /////////////////////////////
    
    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("render", function (my_option_dict) {
      var gadget = this,
        props = gadget.property_dict;

      props.canvas_buffer = my_option_dict.canvas_buffer;

      return new RSVP.Queue()
        .push(function () {
          return gadget.exportMonoWAV([]);
        })
        .push(function (my_export_buffer) {
          props.download_buffer = my_export_buffer;
          console.log("CLIP DONE");
          return props.clip;
        });
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

    /////////////////////////////
    // declared job
    /////////////////////////////

    /////////////////////////////
    // declared services
    /////////////////////////////
    .declareService(function () {
      var gadget = this,
        props = gadget.property_dict;
      console.log("xxx declare service")
      props.audio_element.controls = true;
      props.canvas.setAttribute("width", props.clip.offsetWidth);
      props.audio_element.src = window.URL.createObjectURL(props.download_buffer);
      props.audio_element.parentNode.appendChild(initializeDownload(props.download_buffer, "punt.wav"));

      drawBuffer(props.canvas.width, props.canvas.height, props.canvas.getContext('2d'), props.canvas_buffer[0]);
    })

    /////////////////////////////
    // on event
    /////////////////////////////
    .onEvent("submit", function (my_event) {
      var gadget = this;
      switch (my_event.target.name) {
        case "kw-form-clip-crop":
          return cropAudio(gadget, my_event);
      }
    })

    .onEvent("timeupdate", function (my_event) {
      var gadget = this,
        props = gadget.property_dict,
        offset = Math.floor(props.clip.offsetWidth * props.audio_element.currentTime / props.audio_element.duration );
      props.progress.style.left = offset + "px";
  })
  ;

}(window, document, rJS, RSVP, loopEventListener, jIO));

