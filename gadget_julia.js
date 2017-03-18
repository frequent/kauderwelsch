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
        //write(tmpvocafile_fh, "\#$found$(lineend)")
        //https://www.tutorialspoint.com/execute_julia_online.php
        prev.tmp_voca.push("#" + match + "\n");
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

/*

// https://github.com/julius-speech/julius/tree/6d135a686a74376495a7a6f55d3d67df54186f83/gramtools
// https://github.com/julius-speech/julius/blob/6d135a686a74376495a7a6f55d3d67df54186f83/gramtools/mkdfa/mkdfa.pl.in
// https://github.com/VoxForge/develop/blob/master/bin/mkdfa.jl
// needs mkfa => https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/main.c
// needs dfa_minimize => https://github.com/julius-speech/julius/blob/6d135a686a74376495a7a6f55d3d67df54186f83/gramtools/dfa_minimize/dfa_minimize.c

function main ()

  mkfa= @windows ? "mkfa.exe" : "mkfa"
  dfa_minimize= @windows ? "dfa_minimize.exe" : "dfa_minimize"
  workingfolder=mktempdir()

  rgramfile= "$(workingfolder)/g$(getpid()).grammar"
  gramfile="$(grammar_prefix).grammar"
  vocafile=grammar_prefix * ".voca"
  termfile=grammar_prefix * ".term"
  tmpvocafile="$(workingfolde  r)/g$(getpid()).voca"
  dfafile=grammar_prefix * ".dfa"
  dictfile="$(grammar_prefix).dict"
  headerfile="$(workingfolder)/g$(getpid()).h"

  ok reverse_grammar(rgramfile,gramfile)
  ok make_category_voca(vocafile,termfile,tmpvocafile)
  run(`$mkfa -e1 -fg $rgramfile -fv $tmpvocafile -fo $(dfafile).tmp -fh $headerfile`)
  => https://github.com/rti7743/kaden_voice/blob/master/naichichi2/julius/gramtools/mkdfa/mkfa-1.44-flex/main.c

  run(`$dfa_minimize $(dfafile).tmp -o $dfafile`) 
  => https://github.com/julius-speech/julius/blob/6d135a686a74376495a7a6f55d3d67df54186f83/gramtools/dfa_minimize/dfa_minimize.c

  rm("$(dfafile).tmp")
  rm(rgramfile)
  rm(tmpvocafile)
  rm(headerfile)
end

/* Inputs
GRAMMAR
S : NS_B SENT NS_E
SENT: CALL_V NAME_N
SENT: DIAL_V DIGIT


VOCA
% NS_B
<s>        sil

% NS_E
</s>        sil

% CALL_V
PHONE        f ow n
CALL        k ao l

% DIAL_V
DIAL        d ay ah l

% NAME_N
STEVE        s t iy v
YOUNG        y ah ng

% DIGIT
FIVE        f ay v
FOUR        f ao r
NINE        n ay n
EIGHT        ey t
OH        ow
ONE        w ah n
SEVEN        s eh v ah n
SIX        s ih k s
THREE        th r iy
TWO        t uw
ZERO        z iy r ow

Phone Steve
Phone Young
Call Steve
Call Young
Dial Five
Dial Four
Dial Nine
Dial Eight
Dial Oh
Dial One
Dial Seven
Dial Six
Dial Three
Dial Two
Dial Zero

===================================
term
0	NS_B
1	NS_E
2	COMMAND
3	NAME
4	SUBJECT
5	DISTANCE
6	ACTIVITY
7	DIGIT
8	HELPER
----------------------------------
dfa
0 1 1 0 0
1 2 2 0 0
1 3 3 0 0
1 4 4 0 0
1 5 5 0 0
1 6 6 0 0
2 0 7 0 0
2 3 3 0 0
3 0 7 0 0
4 4 8 0 0
4 6 3 0 0
5 7 3 0 0
6 7 9 0 0
7 -1 -1 1 0
8 6 10 0 0
9 7 11 0 0
10 3 3 0 0
11 7 12 0 0
12 8 13 0 0
13 6 3 0 0
------------------------------------
dict
0	[<s>]	sil
1	[</s>]	sil
2	[LEFT]	l eh f t
2	[RIGHT]	r ay t
2	[UP]	ah p
2	[DOWN]	d aw n
2	[SAVE]	s ey v
2	[CLOSE]	k l ow s
2	[OPEN]	ow p ah n
2	[REMOVE]	r iy m uw v
2	[SEARCH]	s er ch
2	[BULK]	b ah l k
2	[SYNC]	s ih ng k
2	[PICK]	p ih k
2	[TAB]	t ae b
2	[NEXT]	n eh k s t
2	[PREVIOUS]	p r iy v iy ah s
3	[LUCY]	l uw s iy
4	[WEAPON]	w eh p ah n
4	[SYSTEMS]	s ih s t ah m z
4	[TARGET]	t aa r g ah t
5	[METERS]	m iy t er z
6	[ACTIVATE]	ae k t ah v ey t
6	[ACQUIRE]	ah k w ay er
6	[DEPLOY]	d ih p l oy
6	[FIRE]	f ay er
7	[ONE]	w ah n
7	[TWO]	t uw
7	[THREE]	th r iy
8	[IN]	ih n
8	[ON]	aa n
==================================
term
0	NS_B
1	NS_E
2	CALL_V
3	DIAL_V
4	NAME_N
5	DIGIT
-----------------------------------
dfa
0 1 1 0 0
1 4 2 0 0
1 5 3 0 0
2 2 4 0 0
3 3 4 0 0
4 0 5 0 0
5 -1 -1 1 0
----------------------------------
dict
0	[<s>]	sil
1	[</s>]	sil
2	[PHONE]	f ow n
2	[CALL]	k ao l
3	[DIAL]	d ay ah l
4	[STEVE]	s t iy v
4	[YOUNG]	y ah ng
5	[FIVE]	f ay v
5	[FOUR]	f ao r
5	[NINE]	n ay n
5	[EIGHT]	ey t
5	[OH]	ow
5	[ONE]	w ah n
5	[SEVEN]	s eh v ah n
5	[SIX]	s ih k s
5	[THREE]	th r iy
5	[TWO]	t uw
5	[ZERO]	z iy r ow
*/


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

