/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, RSVP, Kauderwelsch, loopEventListener */
(function (window, rJS, RSVP, Kauderwelsch, loopEventListener) {
  "use strict";

  // Custom loopEventListener
  function kauderWelschLoopEventListener(my_target, my_type, my_callback) {
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
      // eg kw.onfirstpass = function () {...
      my_target["on" + my_type] = my_callback;
    }
    return new RSVP.Promise(itsANonResolvableTrap, canceller);
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
      
      // create a new Kauderwelsch instance and setup listeners
      // keep files in memory until user is ok to save
      // memory/xxx storage
      // format:
      // title */sample1 LEFT THEFT HEFTY REEF SHAFT DAFT
      // attachment blob

      // initialize Kauderwelsch
      props.kw = new Kauderwelsch({
        "pathToTrainer": null,
        "analyser_dom_node": props.element.querySelector(".kw-analyser")
      });

      return gadget;
    })
    
    .declareService(function () {
      var gadget = this,
        props = gadget.property_dict,
        form = props.element.querySelector(".kw-controls form");

      function form_submit_handler(my_event) {
        var queue = new RSVP.Queue();
        console.log("gotcha");
        console.log(my_event);
        console.log(my_event.target);

        if (props.kw.is_recording) {
          // stop, update memory storage and dom with new file
          form.querySelector("input").value = "Record";
        } else {
          // record
          form.querySelector("input").value = "Stop";
        }

        queue.push(function () {
          my_event.preventDefault();
          return false;
        });
        
        return queue;
      }
      
      return loopEventListener(form, "submit", false, form_submit_handler);
    });
    
}(window, rJS, RSVP, Kauderwelsch, loopEventListener));

