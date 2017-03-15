/*jslint nomen: true, indent: 2, maxerr: 3 */
/*global window, document, rJS, RSVP */
(function (window, document, rJS, RSVP) {
  "use strict";

/*
https://github.com/VoxForge/develop/blob/master/bin/mkdfa.jl => all into worker
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
var LINE_TERM = /(?!% )([A-Za-z0-9_]*)/g;

// re = new RegExp("\\b(" + word_string + ")\\b(?!')(?:\\([0-9]\\))?")

function sanitizeLine(my_line) {
  return my_line.replace(LINE_BREAK, "").replace(LINE_COMMENT, "");
}

function notifyCount(my_count) {
  return "Status: sample.voca has " + my_count.categories + " categories and " +
    my_count.words + " words";
}

function reverseGrammarFile(my_grammar) {
  return my_grammar.split(LINE_BREAKS).filter(Boolean)
    .reduce(function(prev, next) {
      var clean_next = sanitizeLine(next),
        list;
      if (clean_next !== "") {
        list = clean_next.split(" : "); 
        prev.push(list[0] + ":" + list[1].split(" ").reverse().join(" "));
      }
      return prev;
    }, []);
}

function createTermFile(my_voca) {
  return my_voca.split(LINE_BREAKS).filter(Boolean)
    .reduce(function (prev, next) {
      var clean_next = sanitizeLine(next),
        term_index = prev.term.length,
        match = next.match(LINE_TERM).filter(Boolean);
      if (match) {
        prev.term.push(term_index + " " + match);
        //write(tmpvocafile_fh, "\#$found$(lineend)") => \# ?
        prev.tmp_voca.push("#" + match);
        prev.count.categories += 1;
      } else {
        prev.count.words += 1;
      }
      return prev;
    }, {"term": [], "tmp_voca": [], "count": {"words": 0, "categories": 0}});
}

function createDictFile(my_voca) {
  return my_voca.split(LINE_BREAKS).filter(Boolean)
    .reduce(function (prev, next) {
      var clean_next = sanitizeLine(next),
        split;
      if (clean_next.indexOf("%") > 0) {
        prev.count += 1;
      } else if (clean_next !== "") {
        split = clean_next.split();
        dict.push(prev.count + "[" + split[0] + "]  " + split.pop());
      }
      return prev;
    }, {"dict": [], "count": -1});
}

// https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/main.c
function createDfaFile() {
  
}


function juliaMakeDfa(my_gadget, my_voca_content, my_grammar_content) {
  return new RSVP.Queue()
    .push(function () {
      return RSVP.all([
        gadget.notify_processing("Starting Processing"),
        reverseGrammarFile(my_grammar_content)
      ]);
    })
    .push(function (my_result) {
      return new RSVP.all([
        gadget.notify_processing("Grammar rules: " + my_result.length),
        createTermFile(my_vocal_file)
      ]);
    })
    .push(function (my_result) {
      return new RSVP.all([
        gadget.notify_processing(notifyCount(my_result.count)),
        gadget.notify_processing("Generated .term file."),
        createDictFile(my_voca_dict)
      ]);
    })
    .push(function (my_result) {
      return new RSVP.all([
        gadget.notify_processing("Generates .dict file."),
        createDfaFile()
      ]);
    })
    .push(undefined, function (my_error) {
      console.log(my_error);
      throw my_error;
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
      var gadget = this;
      gadget.property_dict = {};
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

    /////////////////////////////
    // declared job
    /////////////////////////////

    /////////////////////////////
    // declared services
    /////////////////////////////

    /////////////////////////////
    // on event
    /////////////////////////////
    ;

}(window, document, rJS, RSVP));

