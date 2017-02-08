/*jslint indent: 2 */
/*global window, rJS, RSVP */
(function (window, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // some methods
  /////////////////////////////

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////

    /////////////////////////////
    // published methods
    /////////////////////////////
    
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
          return RSVP.all([
            gadget.getDeclaredGadget("worker"),
            gadget.getDeclaredGadget("visualiser")
          ]);
        })
        .push(function (my_gadget_list) {
          return RSVP.all([
            my_gadget_list[0].render(my_option_dict),
            my_gadget_list[1].render()
          ]);
        });
    })

    // jIO bridge for recorder and its sub gadgets
    .allowPublicAcquisition("jio_create", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_create.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_allDocs", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_allDocs.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_remove", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_remove.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_post", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_post.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_put", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_put.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_get", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_get.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_allAttachments", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_allAttachments.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_getAttachment", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_getAttachment.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_putAttachment", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_putAttachment(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_removeAttachment", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_removeAttachment.apply(null, param_list);
        });
    })
    .allowPublicAcquisition("jio_repair", function (param_list) {
      return this.getDeclaredGadget("worker")
        .push(function (my_declared_gadget) {
          return my_declared_gadget.jio_repair.apply(null, param_list);
        });
    });
    
    /////////////////////////////
    // declared services
    /////////////////////////////
    
}(window, rJS, RSVP));
