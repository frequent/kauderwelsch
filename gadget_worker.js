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
          return gadget.jio_create(my_option_dict);
        });
    })
    
    .declareMethod("jio_create", function (config) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.createJio(config);
        });
    })
    .declareMethod("jio_allDocs", function (options) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.allDocs(options);
        });
    })
    .declareMethod("jio_remove", function (id) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.remove(id);
        });
    })
    .declareMethod("jio_post", function (doc) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.post(doc);
        });
    })
    .declareMethod("jio_put", function (id, doc) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.put(id, doc);
        });
    })
    .declareMethod("jio_get", function (id, options) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.get(id, options);
        });
    })
    .declareMethod("jio_allAttachments", function (options) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.allAttachments(options);
        });
    })
    .declareMethod("jio_getAttachment", function (id, name, options) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.getAttachment(id, name, options);
        });
    })
    .declareMethod("jio_putAttachment", function (id, name, doc) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.putAttachment(id, name, doc);
        });
    })
    .declareMethod("jio_removeAttachment", function (id, name) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.removeAttachment(id, name);
        });
    })
    .declareMethod("jio_repair", function (options) {
      return this.getDeclaredGadget("jio_gadget")
        .push(function (my_jio_gadget) {
          return my_jio_gadget.repair(options);
        });
    });

}(window, rJS, navigator, Worker));