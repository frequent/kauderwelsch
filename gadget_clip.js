/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP, loopEventListener, jIO, Math */
(function (window, document, rJS, RSVP, loopEventListener, jIO, Math) {
  "use strict";

  /////////////////////////////
  // templates
  /////////////////////////////
  var CANVAS = "CANVAS";

  var SOUND_CLIP_TEMPLATE = "<div class='kw-clip'>\
    <span class='kw-clip-progress'></span>\
    <canvas class='kw-clip-canvas' height='80'></canvas>\
    <div class='kw-clip-audio-controls'>\
      <audio controls></audio>\
    </div>\
    <div class='kw-clip-storage-controls'>\
      <form name='kw-form-save-controls'>\
        <input type='text' name='kw-clip-reference' value='%s' />\
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

  function cropAudio(my_gadget, my_event) {
    var props = my_gadget.property_dict,
      rect = my_gadget.property_dict.rect,
      form = my_event.target,
      canvas_list = form.parentNode.parentNode.querySelectorAll("canvas"),
      clip_canvas,
      crop_canvas,
      bounds,
      cropped_buffer,
      slice_start,
      slice_end;

    my_event.preventDefault();
    if (canvas_list.length === 1) {
      clip_canvas = canvas_list[0];
      crop_canvas = document.createElement("canvas");
      crop_canvas.className= "kw-clip-canvas-crop";
      crop_canvas.width = clip_canvas.width;
      crop_canvas.height = clip_canvas.height;
      clip_canvas.parentNode.insertBefore(crop_canvas, clip_canvas.nextSibling);
      return my_gadget.clipSetCrop(crop_canvas);
    } else if (confirm("Crop Audio?")) {
      bounds = canvas_list[1].getBoundingClientRect();
      slice_start = rect.x / bounds.width;
      slice_end = (rect.x + rect.w)/bounds.width;
      props.canvas_buffer = props.canvas_buffer.map(function (buffer) {
        var len = buffer.length;
        return buffer.slice((Math.ceil(len * slice_start)), Math.ceil((len * slice_end)));
      });
      crop_canvas = canvas_list[1];
      crop_canvas.parentNode.removeChild(crop_canvas);
      return new RSVP.Queue()
        .push(function () {
          return my_gadget.convertBuffer();
        })
        .push(function () {
          return my_gadget.drawBuffer();
        });
    }
  }

  function deleteAudio(my_gadget, my_event) {
    return my_gadget.setClipList(
      my_gadget.element.getAttribute("data-gadget-scope")
    );
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
  
  function dist(p1, p2) {
    return Math.sqrt(p2.x - p1.x) * (p2.x - p1.x);
  }
  
  function getHandle(mouse, props) {
    if (dist(mouse, {"x": props.rect.x + props.left_offset}) <= props.handle_size) {
      return 'left';
    }
    if (dist(mouse, {"x": props.rect.x + props.left_offset + props.rect.w}) <= props.handle_size) {
      return 'right';
    }
    return false;
  }

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      this.property_dict = {
        "rect": {
          x: null,
          y: null,
          w: null,
          h: null
        },
        current_handle: false,
        handle_size: 16,
        drag: false
      };
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod("exportMonoWAV", "exportMonoWAV")
    .declareAcquiredMethod("setClipList", "setClipList")

    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("render", function (my_option_dict) {
      var gadget = this,
        props = gadget.property_dict,
        div = document.createElement("div");

      div.innerHTML = parseTemplate(SOUND_CLIP_TEMPLATE, [
        my_option_dict.file_name
      ]);

      props.clip = div.firstChild;
      props.canvas = div.querySelector("canvas");
      props.progress = div.querySelector(".kw-clip-progress");
      props.audio_element = div.querySelector("audio");
      props.audio_element.controls = true;
      props.canvas_buffer = my_option_dict.canvas_buffer;

      return new RSVP.Queue()
        .push(function () {
          return gadget.convertBuffer();
        })
        .push(function () {
          gadget.element.appendChild(props.clip);
          return gadget.element;
        });
    })
    
    .declareMethod("convertBuffer", function () {
      var gadget = this,
        props = gadget.property_dict;
      return new RSVP.Queue()
        .push(function () {
          return gadget.exportMonoWAV(props.canvas_buffer[0]);
        })
        .push(function (my_export_buffer) {
          props.download_buffer = my_export_buffer;
          props.audio_element.src = window.URL.createObjectURL(props.download_buffer);
          return;
          //drawBuffer(props.canvas.width, props.canvas.height, proops.canvas.getContext('2d'), props.download_buffer);
          //return gadget.drawBuffer();
        });
    })

    .declareMethod("drawBuffer", function () {
      var props = this.property_dict,
        canvas = props.canvas,
        buffer = props.canvas_buffer[0];

      //props.audio_element.parentNode.appendChild(
      //  initializeDownload(props.download_buffer, "punt.wav")
      //);
      drawBuffer(canvas.width, canvas.height, canvas.getContext('2d'), buffer);
    })
    
    .declareMethod("draw", function () {
      var gadget = this,
        props = gadget.property_dict,
        canvas = props.crop_canvas,
        ctx = canvas.getContext("2d"),
        canvas_coordinate_list = canvas.getBoundingClientRect();
        
      props.left_offset = canvas_coordinate_list.left;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(229, 134, 150, 0.7)';
      ctx.fillRect(props.rect.x, props.rect.y, props.rect.w, props.rect.h);
      if (props.current_handle) {
        switch (props.current_handle) {
          case 'left':
            canvas.style.cursor= (props.rect.w > 0 ? 'w' : 'e') + '-resize';
            break;
          case 'right':
            canvas.style.cursor= (props.rect.w > 0 ? 'e' : 'w') + '-resize';
            break;
          }
      } else {
        canvas.style.cursor = '';
      }
    })
    
    .declareMethod("clipSetCrop", function (my_canvas) {
      var gadget = this,
        props = gadget.property_dict;

      props.crop_canvas = my_canvas;
      props.rect = {
        x: my_canvas.width * 0.1,
        y: 0,
        w: my_canvas.width * 0.8,
        h: my_canvas.height
      };
      props.drag = false;
      props.current_handle = false;
      
      return gadget.draw();
    })
    
    .declareMethod("mouseDownHandle", function () {
      var gadget = this,
        props = gadget.property_dict;
      if (props.current_handle) {
        props.drag = true;
      }
      return gadget.draw(); 
    })
    
    .declareMethod("mouseUpHandle", function () {
      var gadget = this,
        props = gadget.property_dict;
      props.drag = false;
      props.current_handle = false;
      return gadget.draw();
    })
    
    .declareMethod("mouseMoveHandle", function (my_event) {
      var gadget = this,
        props = gadget.property_dict,
        previous_handle = props.current_handle,
        mouse_pos;

      if (!props.drag) {
        props.current_handle = getHandle({"x": my_event.pageX - props.crop_canvas.offsetLeft}, props);
      }

      if (props.current_handle && props.drag) {
        mouse_pos = {"x": my_event.pageX - props.left_offset};
        switch (props.current_handle) {
          case 'left':
            props.rect.w += props.rect.x - mouse_pos.x;
            props.rect.x = mouse_pos.x;
            break;
          case 'right':
            props.rect.w = mouse_pos.x - props.rect.x;
            break;
        }
      }
      if (props.drag || props.current_handle != previous_handle) {
        return gadget.draw();
      }
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
      props.canvas.setAttribute("width", props.clip.offsetWidth);
      return gadget.drawBuffer();
    })

    /////////////////////////////
    // on event
    /////////////////////////////
    .onEvent("submit", function (my_event) {
      var gadget = this;
      switch (my_event.target.name) {
        case "kw-form-clip-crop":
          return cropAudio(gadget, my_event);
        case "kw-form-clip-delete":
          return deleteAudio(gadget, my_event);
      }
    })

    .onEvent("mousedown", function (my_event) {
      var gadget = this;
      if (my_event.target.nodeName === CANVAS) {
        return gadget.mouseDownHandle(my_event);
      }
    })
    .onEvent("mouseup", function (my_event) {
      var gadget = this;
      if (my_event.target.nodeName === CANVAS) {
        return gadget.mouseUpHandle(my_event);
      }
    })
    .onEvent("mousemove", function (my_event) {
      var gadget = this;
      if (my_event.target.nodeName === CANVAS) {
        return gadget.mouseMoveHandle(my_event);
      }
    })
    

    .onEvent("timeupdate", function (my_event) {
      var gadget = this,
        props = gadget.property_dict,
        offset = Math.floor(props.clip.offsetWidth * props.audio_element.currentTime / props.audio_element.duration );
      props.progress.style.left = offset + "px";
  });

}(window, document, rJS, RSVP, loopEventListener, jIO, Math));

