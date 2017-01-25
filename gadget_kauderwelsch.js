/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

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
      var gadget = this;
      
      return new RSVP.Queue()
        .push(function () {
          return gadget.getDeclaredGadget("visualiser");
        })
        .push(function (my_visualiser_gadget) {
          return my_visualiser_gadget.render(my_option_dict);
        });
    });

    // bridge
        
}(window, rJS, RSVP));

