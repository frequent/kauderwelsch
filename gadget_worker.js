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
    // acquired methods
    /////////////////////////////
    
    /////////////////////////////
    // published methods
    /////////////////////////////
    
    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod('render', function (my_option_dict) {
      return this.jio_create(my_option_dict);
    })
    
    .declareMethod("jio_create", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.createJIO.apply(null, param_list);
        });
    })
    .declareMethod("jio_allDocs", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.allDocs.apply(null, param_list);
        });
    })
    .declareMethod("jio_remove", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.remove.apply(null, param_list);
        });
    })
    .declareMethod("jio_post", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.post.apply(null, param_list);
        });
    })
    .declareMethod("jio_put", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.put.apply(null, param_list);
        });
    })
    .declareMethod("jio_get", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.get.apply(null, param_list);
        });
    })
    .declareMethod("jio_allAttachments", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.allAttachments.apply(null, param_list);
        });
    })
    .declareMethod("jio_getAttachment", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.getAttachment.apply(null, param_list);
        });
    })
    .declareMethod("jio_putAttachment", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.putAttachment(null, param_list);
        });
    })
    .declareMethod("jio_removeAttachment", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.removeAttachment.apply(null, param_list);
        });
    })
    .declareMethod("jio_repair", function (param_list) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.repair.apply(null, param_list);
        });
    })

}(window, rJS, navigator, Worker));
