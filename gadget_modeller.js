/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP */
(function (window, document, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // templates
  /////////////////////////////
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
    console.log("got text, ", text)
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
      var gadget = this;

      gadget.property_dict = {
        "modeller_input": gadget.element.querySelector(".kw-input textarea"),
        "modeller_output": gadget.element.querySelector(".kw-output textarea")
      };
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    .declareAcquiredMethod('jio_allDocs', 'jio_allDocs')
    .declareAcquiredMethod('jio_createJio', 'jio_createJio')
    .declareAcquiredMethod('jio_putAttachment', 'jio_putAttachment')
    .declareAcquiredMethod('jio_getAttachment', 'jio_getAttachment')
    .declareAcquiredMethod('jio_put', 'jio_put')
    .declareAcquiredMethod('jio_get', 'jio_get')

    /////////////////////////////
    // published methods
    /////////////////////////////

    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("render", function (my_option_dict) {
      var gadget = this,
        props = gadget.property_dict;

      //props.voca.setAttribute("placeholder", VOCA_PLACEHOLDER);
      //props.grammar.setAttribute("placeholder", GRAMMAR_PLACEHOLDER);
      props.modeller_input.setAttribute("placeholder", INPUT_PLACEHOLDER);

      return new RSVP.Queue()
        .push(function () {
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
        case "kw-modeller-input":
          console.log("store input")
          return storeBlob(gadget, my_event, "input");
        case "kw-modeller-output":
          console.log("store output")
          return storeBlob(gadget, my_event, "output");
        default:
          return false;
      }
    }, false, true);

}(window, document, rJS, RSVP));

