/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, RSVP, Kauderwelsch */
(function (window, rJS, RSVP, Kauderwelsch) {
  "use strict";

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function (my_gadget) {

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
      
      // record audio and store somewhere
      
      // initialize Kauderwelsch
      props.kw = new Kauderwelsch({
        "pathToTrainer": null
      });
      
      return gadget;
    });
    
}(window, rJS, RSVP, Kauderwelsch));
