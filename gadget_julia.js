/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP */
(function (window, document, rJS, RSVP) {
  "use strict";

  /*
  ###############################################################################
  #
  #    Copyright (C) 2015  VoxForge
  #
  #    This program is free software: you can redistribute it and/or modify
  #    it under the terms of the GNU General Public License as published by
  #    the Free Software Foundation, either version 3 of the License, or
  #    (at your option) any later version.
  #
  #    This program is distributed in the hope that it will be useful,
  #    but WITHOUT ANY WARRANTY; without even the implied warranty of
  #    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  #    GNU General Public License for more details.
  #
  #    You should have received a copy of the GNU General Public License
  #    along with this program.  If not, see <http://www.gnu.org/licenses/>.
  #
  ###############################################################################
  #
  # port of Julius perl script: mkdfa.pl
  #
  ###############################################################################
  */
  var LINE_BREAKS = /(.*?[\r\n])/g;
  var LINE_BREAK = /[\r\n]/g;
  var LINE_COMMENT = /[#.*]/g;
  
  var GRAMMAR_VALUE =
    "S : NS_B SENT NS_E\n" +
    "SENT: CALL_V NAME_N\n" +
    "SENT: DIAL_V DIGIT\n";
  
  var VOCA_VALUE = 
    "% NS_B\n" +
    "<s>        sil\n" +
    "\n" +
    "% NS_E\n" +
    "</s>        sil\n" +
    "\n" +
    "% CALL_V\n" +
    "PHONE        f ow n\n" +
    "CALL        k ao l\n" +
    "\n" +
    "% DIAL_V\n" +
    "DIAL        d ay l\n" +
    "\n" +
    "% NAME_N\n" +
    "STEVE        s t iy v\n" +
    "YOUNG        y ah ng\n" +
    "\n" +
    "% DIGIT\n" +
    "FIVE        f ay v\n" +
    "FOUR        f ow r\n" +
    "NINE        n ay n\n" +
    "EIGHT       ey t\n" +
    "OH          ow\n" +
    "ONE         w ah n\n" +
    "SEVEN       s eh v ih n\n" +
    "SIX         s ih k s\n" +
    "THREE       th r iy\n" +
    "TWO         t uw\n" +
    "ZERO        z iy r ow";
  
  function createResponseObject(my_voca, my_grammar, my_name) {
    var name = my_name || "sample",
      response_object = {};
    response_object.name = name;
    response_object.count = {"words": 0, "categories": 0};
    response_object[name + ".voca"] = convertToArray(my_voca);
    response_object[name + ".grammar"] = convertToArray(my_grammar);
    response_object[name + ".dfa"] = [];
    response_object[name + ".dict"] = [];
    response_object[name + ".term"] = [];
    response_object[name + ".tmp.voca"] = [];
    response_object[name + ".rev.grammar"] = [];
    response_object[name + ".header"] = [];
    return response_object;
  }
  
  function convertToArray(my_array) {
    return my_array.split(LINE_BREAKS).filter(Boolean);
  }
  
  function sanitizeLine(my_line) {
    return my_line.replace(LINE_BREAK, "").replace(LINE_COMMENT, "");
  }
  
  function notifyCount(my_count) {
    return "Status: sample.voca has " + my_count.categories + " categories and " +
      my_count.words + " words";
  }
  
  function reverseGrammarFile(my_response) {
    return my_response[my_response.name + ".grammar"]
      .reduce(function(prev, next) {
        var clean_next = sanitizeLine(next),
          pointer = prev[prev.name + ".rev.grammar"],
          list;
        if (clean_next !== "") {
          list = clean_next.split(": "); 
          pointer.push(list[0].trim() + ":" + list[1].split(" ").reverse().join(" "));
        }
        return prev;
      }, my_response);
  }
  
  function createTermDictAndVocaFile(my_response, my_voca) {
    return my_response[my_response.name + ".voca"]
      .reduce(function (prev, next) {
        var clean_next = sanitizeLine(next),
          term_index = prev[prev.name + ".term"],
          line_feed = clean_next.split("  ").filter(Boolean),
          pop;
        if (clean_next[0] === "%") {
          pop = line_feed[0].split(" ").pop();
          prev[prev.name + ".term"].push((term_index.length) + "  " + pop);
          prev[prev.name + ".tmp.voca"].push("#" + clean_next.split(" ").pop());
          prev.count.categories += 1;
        } else if (line_feed.length > 0) {
          prev[prev.name + ".dict"].push((term_index.length -1) + " [" + line_feed[0] + "] " + line_feed[1]);
          prev.count.words += 1;
        }
        return prev;
      }, my_response);
  }
  
  function createDfaFile(my_response) {
    return new RSVP.Queue()
      .push(function () {
        var prefix = my_response.name;
        return mkdfa(
          "-e1",
          "-fg", my_response[prefix + ".rev.grammar"].join(),
          "-fv", my_response[prefix + ".tmp.voca"].join(),
          "-fo", my_response[prefix + ".dfa"].join(),
          "-fh", my_response[prefix + ".header"].join()
        );
      })
      .push(function (oulala) {
        console.log(oulala);
      })
      .push(undefined, function (error) {
        console.log(error);
        throw error;
      });
  }

  /////////////////////////////
  // templates
  /////////////////////////////
  
  /////////////////////////////
  // some methods 
  /////////////////////////////

  rJS(window)

    /////////////////////////////
    // ready
    /////////////////////////////
    .ready(function () {
      var gadget = this,
        grammar_area = gadget.element.querySelector(".grammar"),
        voca_area = gadget.element.querySelector(".voca");
      gadget.property_dict = {};

      grammar_area.value = GRAMMAR_VALUE;
      voca_area.value = VOCA_VALUE;
    })

    /////////////////////////////
    // acquired methods
    /////////////////////////////

    /////////////////////////////
    // published methods
    /////////////////////////////
    
    /////////////////////////////
    // declared methods
    /////////////////////////////
    .declareMethod("render", function (my_option_dict) {
      return this;
    })
    
    .declareMethod("generateDfa", function (my_grammar, my_voca) {
      var gadget = this;
      return new RSVP.Queue()
        .push(function () {
          return RSVP.all([
            reverseGrammarFile(createResponseObject(my_voca, my_grammar)),
            gadget.notify_processing("Starting Processing")
          ]);
        })
        .push(function (my_result) {
          var response = my_result[0],
            pointer = response[response.name + ".rev.grammar"];
          return new RSVP.all([
            createTermDictAndVocaFile(my_result[0]),
            gadget.notify_processing("Grammar rules: " + pointer.length)
          ]);
        })
        .push(function (my_result) {
          return new RSVP.all([
            gadget.notify_processing(notifyCount(my_result[0].count)),
            gadget.notify_processing("Generated .term file."),
            createDfaFile(my_result[0]),
            gadget.notify_processing("Now parsing grammar file.")
          ]);
        })
        .push(undefined, function (my_error) {
          console.log(my_error);
          throw my_error;
        });
    })

    .declareMethod("notify_processing", function (my_message) {
      var gadget = this;
      gadget.element.querySelector(".status").value += my_message + "\n";
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
      var gadget = this,
        target = my_event.target,
        grammar_value,
        voca_value;
      switch (target.name) {
        case "input":
          grammar_value = target.querySelector(".grammar").value;
          voca_value = target.querySelector(".voca").value;
          return gadget.generateDfa(grammar_value, voca_value);
      }
    });

}(window, document, rJS, RSVP));

