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
  var STATUS_ERR = "Error.";
  var STATUS_OK = "Ok.";
  var MSG_WORD_NOT_FOUND = "Following words not found in dict:";
  var INPUT_PLACEHOLDER = "Example: Hello World";

  /////////////////////////////
  // some methods
  /////////////////////////////
  function isNotFound(my_error) {
    if (my_error.status_code === 404) {
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
          return my_gadget.jio_putAttachment(MODEL, my_name, makeBlob(text));
        }
        throw my_error;
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
        "status_text": null,
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

    .declareMethod("setTab", function (my_tab) {
      var gadget = this,
        props = gadget.property_dict;
      props.status.className = props.voca.className = props.grammar.className = "";
      props[my_tab].className = "kw-modeller-active-tab";
      props.modeller_output.value = props[my_tab + "_text"];
    })

    .declareMethod("convertInput", function () {
      var gadget = this,
        props = gadget.property_dict,
        input_value = props.modeller_input.value,
        word_string,
        line_list;

      if (input_value === "") {
        return;
      }
      
      line_list = input_value.toUpperCase().split(LINE_BREAKS).filter(Boolean);
      word_string = line_list.map(function (line) {
        return line.split(" ").reduce(function (prev, next) {
          return prev += "W_" + next.replace(ALPHA_NUMERIC, '') + " ";
        }, "");
      }).join("").trim();

      return new RSVP.Queue()
        .push(function () {
          return gadget.validateAgainstDict(word_string.replace(/W_/g, ""));
        })
        .push(function (my_validation_dict) {
          var matched_word,
            utter_tag;

          if (my_validation_dict.error_list.length > 0) {
            props.status_text = STATUS_ERR + MSG_WORD_NOT_FOUND + "\n" +
              my_validation_dict.error_list.join("\n");
            props.voca_text = props.grammar_text = null;
            return gadget.setTab("status");
          }
          props.status_text = STATUS_OK;
          props.modeller_count += 1;
          utter_tag = "UTTER_" + props.modeller_count;

          props.voca_text = (props.voca_text || props.voca_init) +
            "S : NS_B " + utter_tag + " NS_E\n" + utter_tag + ": " +
              word_string + "\n\n";
          props.grammar_text = (props.grammar_text || props.grammar_init);
          for (matched_word in my_validation_dict.match_dict) {
            if (my_validation_dict.match_dict.hasOwnProperty(matched_word)) {
              props.grammar_text += "\n% W_" + matched_word + "\n" + matched_word + "       " +
                my_validation_dict.match_dict[matched_word].join("\n" + matched_word + "       ");
            }
          }
          props.modeller_output.value = props.status_text;
          return gadget.setTab("status");
        });
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
        case "kw-modeller-input-help": break;
        case "kw-modeller-output-tab-grammar":
          return gadget.setTab("grammar");
        case "kw-modeller-output-tab-status":
          return gadget.setTab("status");
        case "kw-modeller-output-tab-voca":
          return gadget.setTab("voca");
        case "kw-modeller-output-test":
          return gadget.convertInput();
        case "kw-modeller-output-build": break;
        case "kw-modeller-output-download": break;
        default:
          return false;
      }
    }, false, true);

}(window, document, rJS, RSVP));

