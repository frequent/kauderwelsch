/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, rJS, RSVP, loopEventListener */
(function (window, rJS, RSVP) {
  "use strict";

  /////////////////////////////
  // some methods
  /////////////////////////////

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function (my_gadget) {
      my_gadget.property_dict = {};

      // initialize all required storages (only serviceworker so far)
      return new RSVP.Queue()
        .push(function () {
          return my_gadget.getElement();
        })
        .push(function (my_element) {
          my_gadget.property_dict.element = my_element;
          my_gadget.property_dict.storage_dict = {};
          my_gadget.property_dict.storage_dict.active = null;
          return my_gadget.getDeclaredGadget("jio_gadget_serviceworker");
        })
        .push(function (my_declared_gadget) {
          return my_declared_gadget.render({"label": "storage-serviceworker"});
        })
        .push(function (my_rendered_gadget) {
          my_gadget.property_dict.storage_dict.serviceworker = my_rendered_gadget;
          return my_gadget.getDeclaredGadget("jio_gadget_indexeddb");
        })
        .push(function (my_declared_gadget) {
          return my_declared_gadget.render({"label": "storage-indexeddb"});
        })
        .push(function (my_rendered_gadget) {
          my_gadget.property_dict.storage_dict.indexeddb = my_rendered_gadget;
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

      // initialize the serviceworker and create the jIO serviceworker storage
      // XXX the worker should actually be a mapping storage
      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            gadget.getDeclaredGadget("serviceworker"),
            gadget.getDeclaredGadget("visualiser")
          ]);
        })
        .push(function (my_gadget_list) {
          return RSVP.all([
            my_gadget_list[0].render({
              "serviceworker_url": 'gadget_voxforge_serviceworker.js?some=thing',
              "scope": "./",
              "worker_url": 'gadget_voxforge_lexicon_worker.js'
            }),
            my_gadget_list[1].render()
          ]);
        })
        .push(function () {
          return gadget.setActiveStorage(["indexeddb"]);
        })
        .push(function () {
          return gadget.routeStorageRequest("createJIO", {"type": "indexeddb",
            "database": "lexicon"
          });
        })
        .push(function () {
          return gadget.setActiveStorage(["serviceworker"]);
        })
        .push(function () {
          return gadget.routeStorageRequest("createJIO", {"type": "serviceworker"});
        });
    })
    
    .declareMethod('setActiveStorage', function (my_type) {
      this.property_dict.storage_dict.active = my_type[0];
      return this;
    })

    .declareMethod('routeStorageRequest', function (my_method, my_param_list) {
      var gadget = this,
        dict = gadget.property_dict,
        active_storage_label = dict.storage_dict.active,
        storage = dict.storage_dict[active_storage_label];
      return storage[my_method].apply(storage, [].concat(my_param_list));
    })

    // jIO bridge
    .allowPublicAcquisition("setActiveStorage", function (param_list) {
      return this.setActiveStorage(param_list);
    })
    .allowPublicAcquisition("jio_create", function (param_list) {
      return this.routeStorageRequest("createJIO", param_list);
    })
    .allowPublicAcquisition("jio_allDocs", function (param_list) {
      return this.routeStorageRequest("allDocs", param_list);
    })
    .allowPublicAcquisition("jio_remove", function (param_list) {
      return this.routeStorageRequest("remove", param_list);
    })
    .allowPublicAcquisition("jio_post", function (param_list) {
      return this.routeStorageRequest("post", param_list);
    })
    .allowPublicAcquisition("jio_put", function (param_list) {
      return this.routeStorageRequest("put", param_list);
    })
    .allowPublicAcquisition("jio_get", function (param_list) {
      return this.routeStorageRequest("get", param_list);
    })
    .allowPublicAcquisition("jio_allAttachments", function (param_list) {
      return this.routeStorageRequest("allAttachments", param_list);
    })
    .allowPublicAcquisition("jio_getAttachment", function (param_list) {
      return this.routeStorageRequest("getAttachment", param_list);
    })
    .allowPublicAcquisition("jio_putAttachment", function (param_list) {
      return this.routeStorageRequest("putAttachment", param_list);
    })
    .allowPublicAcquisition("jio_removeAttachment", function (param_list) {
      return this.routeStorageRequest("removeAttachment", param_list);
    })
    .allowPublicAcquisition("jio_repair", function (param_list) {
      return this.routeStorageRequest("repair", param_list);
    });
    
}(window, rJS, RSVP));

