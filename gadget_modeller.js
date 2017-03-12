/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP */
(function (window, document, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // templates
  /////////////////////////////
  var LINE_BREAKS = /(.*?[\r\n])/g;
  var ALPHA_NUMERIC = /[^A-Z0-9.]/gi;

  var TEXT = {"format": "text"};
  var MODEL = "modeller";
  
  var NOT_FOUND = 404;

  var INPUT_PLACEHOLDER = "Example: Hello World";

  var GRAMMAR_PLACEHOLDER = "Please enter grammar, format:\n\
  S : NS_B SENT NS_E\n\
  SENT: CALL_V NAME_N\n\
  SENT: DIAL_V DIGIT";
                              
  var VOCA_PLACEHOLDER = "Please enter vocabulary, format:\n\
  % CALL_V\n\
  PHONE     f ow n\n\
  CALL        k ao l\n\
  \n\
  % DIAL_V\n\
  DIAL        d ay l\n\
  \n\
  % NAME_N\n\
  STEVE       s t iy v\n\
  YOUNG       y ah ng\n\
  \n\
  % DIGIT\n\
  FIVE        f ay v\n\
  FOUR        f ow r\n";

  /////////////////////////////
  // some methods 
  /////////////////////////////
  function isNotFound(my_error) {
    if (my_error.status_code === NOT_FOUND) {
      return true;
    }
  }
  
  function makeBlob(my_text_content) {
    return new Blob([my_text_content || ""], {type: "text/plain"});
  }

  function storeBlob(my_gadget, my_event, my_name) {
    var text;
    if (my_event) {
      text = my_event.target.querySelector("textarea").value;
    } else {
      text = "";
    }

    return my_gadget.jio_getAttachment(MODEL, my_name, TEXT)
      .push(undefined, function (my_error) {
        if (isNotFound(my_error)) {
          console.log("did not find it, save")
          return my_gadget.jio_putAttachment(MODEL, my_name, makeBlob(text));
        }
        throw my_error;
      })
      .push(function(my_attachment) {
        console.log(my_attachmemt)
        console.log("hum")
      });
  }

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this,
        element = gadget.element;

      gadget.property_dict = {
        "modeller_count": 0,
        "voca_init": "",
        "grammar_init": "% NS_B\n<s>       sil\n\n% NS_E\n<s>        sil\n",
        "voca_text": null,
        "grammar_text": null,
        "status": element.querySelector(".kw-modeller-status input"),
        "voca": element.querySelector(".kw-modeller-voca input"),
        "grammar": element.querySelector(".kw-modeller-grammar input"),
        "modeller_input": element.querySelector(".kw-input textarea"),
        "modeller_output": element.querySelector(".kw-output textarea")
      };
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod('jio_create', 'jio_create')
    .declareAcquiredMethod('jio_allDocs', 'jio_allDocs')
    .declareAcquiredMethod('jio_createJio', 'jio_createJio')
    .declareAcquiredMethod('jio_putAttachment', 'jio_putAttachment')
    .declareAcquiredMethod('jio_getAttachment', 'jio_getAttachment')
    .declareAcquiredMethod('jio_put', 'jio_put')
    .declareAcquiredMethod('jio_get', 'jio_get')
    .declareAcquiredMethod('validateAgainstDict', 'validateAgainstDict')

    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("render", function (my_option_dict) {
      var gadget = this,
        props = gadget.property_dict;

      props.modeller_input.setAttribute("placeholder", INPUT_PLACEHOLDER);
      props.status.className = "kw-modeller-active-tab";

      return new RSVP.Queue()
        //.push(function () {
        //  return gadget.jio_create({"type": "memory"});
        //})
        .push(function (my_memory_storage) {
          //props.storage = my_memory_storage;
          return gadget.jio_get("modeller");
        })
        .push(undefined, function (my_error) {
          if (isNotFound(my_error)) {
            return gadget.jio_put("modeller");
          }
          throw my_error;
        });
        //.push(function () {
        //  RSVP.all([
        //    storeBlob(gadget, undefined, "input"),
        //    storeBlob(gadget, undefined, "ouput")
        //  ]);
        //});
    })

    .declareMethod("convertInput", function () {
      var gadget = this,
        props = gadget.property_dict,
        input_value = props.modeller_input.value,
        word_list;

      if (input_value === "") {
        return;
      }

      return new RSVP.Queue()
        .push(function () {
          var line_list = input_value.toUpperCase()
              .split(LINE_BREAKS).filter(Boolean),
            utter_tag;
          
          word_list = line_list.map(function (line) {
            return line.split(" ").reduce(function (prev, next) {
              return prev += "W_" + next.replace(ALPHA_NUMERIC, '') + " ";
            }, "");
          }).join("").trim();

          props.modeller_count += 1;
          utter_tag = "UTTER_" + props.modeller_count;
          props.voca_text = (props.voca_text || props.voca_init) + "S : NS_B " +
            utter_tag + " NS_E\n" + utter_tag + ":" + word_list + "\n";

          return gadget.validateAgainstDict(word_list.replace(/W_/g, ""));
        })
        .push(function (my_validation_dict) {
          if (my_validation_dict.error_list.length > 0) {
            // output error report in status
          }

          props.grammar_text = (props.grammar_text || props.grammar_init) + 
            word_list.split(" ").reduce(function (prev, next) {
              var clean = next.replace("W_", "");
              return prev += "\n% " + next + "\n" + clean + "       " + 
                my_validation_dict.match_dict[clean] + "\n";
            }, "");
          console.log(props);
          props.modeller_output.value = props.grammar_text;
        })
        
    })

    /////////////////////////////
    // declared job
    /////////////////////////////

    /////////////////////////////
    // declared services
    /////////////////////////////

    /////////////////////////////
    // on event
    /////////////////////////////
    .onEvent("submit", function (my_event) {
      var gadget = this;
      switch (my_event.target.name) {
        case "kw-modeller-storage-load": break;
        case "kw-modeller-input-save": break;
        case "kw-modeller-input-open": break;
        case "kw-modeller-input-delete": break;
        case "kw-modeller-input-test":
          return gadget.convertInput();
        case "kw-modeller-output-tab-grammar": break;
        case "kw-modeller-output-tab-status": break;
        case "kw-modeller-output-tab-voca": break;
        case "kw-modeller-output-save": break;
        case "kw-modeller-output-open": break;
        case "kw-modeller-output-delete": break;
        case "kw-modeller-output-build": break;
        case "kw-modeller-output-download": break;
        default:
          return false;
      }
    }, false, true);

}(window, document, rJS, RSVP));

