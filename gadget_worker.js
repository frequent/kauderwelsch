/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, navigator, Worker */
(function (window, rJS, navigator, Worker) {
  "use strict";

  /////////////////////////////
  // some methods
  /////////////////////////////

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    
    /////////////////////////////
    // state
    /////////////////////////////
    //.setState({"defer": new RSVP.defer()})

    /////////////////////////////
    // acquired methods
    /////////////////////////////
    
    /////////////////////////////
    // published methods
    /////////////////////////////
    
    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod('render', function (my_option_dict) {
      var gadget = this;
      return gadget.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return gadget.jio_create([my_option_dict]);
        });
    })
    
    .declareMethod("jio_create", function (param_list) {
      var gadget = this;
      return gadget.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.createJio.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_allDocs", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.allDocs.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_remove", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.remove.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_post", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.post.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_put", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.put.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_get", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.get.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_allAttachments", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.allAttachments.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_getAttachment", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.getAttachment.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_putAttachment", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.putAttachment(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_removeAttachment", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.removeAttachment.apply(my_jio_gadget, param_list);
        });
    })
    .declareMethod("jio_repair", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.repair.apply(my_jio_gadget, param_list);
        });
    });

}(window, rJS, navigator, Worker));
