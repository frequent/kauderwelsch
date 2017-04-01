(function (window, RSVP) {
  "use strict";

  /*
   * Copyright (c) 1991-2011 Kawahara Lab., Kyoto University
   * Copyright (c) 2000-2005 Shikano Lab., Nara Institute of Science and Technology
   * Copyright (c) 2005-2011 Julius project team, Nagoya Institute of Technology
   * All rights reserved
   */

  // Finite automaton generator, mkfa %s programmed by 1995-1996 S.Hamada
  //
  // function:   grammar & vocabulary -> FA & header for parsing
  // usage:      mkfa <option>.. <file-spec1>..; or mkfa <option>.. <file-spec2>
  // option:     -dfa    DFA output(default)
  //             -nfa    NFA output
  //             -c      compatible FA output with g2fa
  //             -e[0|1] putting class reduction flag on edge(default: on vertex)
  //                    (0:accept 1:start omitted:both)
  //             -nw     no warning messages
  //             -q[0|1] control of processing report
  //                    (0:no report 1:semi-quiet omitted:semi-quiet)
  //             -v      verbose mode(to stderr)
  // filespec1:  -fg     grammar filename
  //             -fv     vocabulary filename
  //             -fo     output filename(DFA or NFA file)
  //             -fh     header filename of class reduction flag for parser
  // filespec2:  -f      basename of above I/O files => "sample" for example
  //                     (respectively appended .grammar, .voca, .dfa(.nfa), .h)
  // NOTES:       * Regular expression with left recursion can't be processed.
  //              * Option -dfa and -nfa must not follow option -f.
  //              * State#1 isn't always final state even if compiled with -c.,
  //                ver.1.44-flex-p1);

  // http://www.isi.edu/~pedro/Teaching/CSCI565-Fall16/Materials/LexAndYaccTutorial.pdf
  // http://opencbp.sourceforge.net/en_US.ISO8859-1/books/opencbook/functions.html
  // https://julius.osdn.jp/juliusbook/en/
  // https://github.com/zaach/jison
  // http://dinosaur.compilertools.net/bison/bison_4.html
  // https://www2.cs.arizona.edu/~debray/Teaching/CSc453/DOCS/tutorial-large.pdf
  // http://www.cs.man.ac.uk/~pjj/cs212/ex5_hint.html
  // http://zaa.ch/jison/try/usf/index.html
  // https://en.wikipedia.org/wiki/LALR_parser#LR_parsers

  var YY = {};

  // optF => when -f is specified (to resolve problems with -dfa)
  var IS_OPTION_F_SET = 0;
  var VERSION_NUMBER = "ver.1.44-flex-p1";
  var FILE_DICT = {};
  var SWITCH_DICT = {
    "sent_list": 0,
    "no_warning": 0,
    "compat_i": 0,
    "quiet": 0,
    "semi_quiet": 0,
    "debug": 0,
    "nfa_output": 0,
    "verbose": 0,
    "edge_start": 0,
    "edge_accept": 0
  };
  
  YY.parse = function () {
    console.log("hello");
  };

  function getFileByType(my_type) {
    var file;
    for (file in FILE_DICT) {
      if (FILE_DICT.hasOwnProperty(file)) {
        if (FILE_DICT[file].type === my_type) {
          return FILE_DICT[file];
        }
      }
    }
  }

  function setGrammarFile() {
    var struct, 
      grammar = getFileByType("grammar"),
      header = getFileByType("header");

    if (grammar === undefined) {
      throw("Can't open grammar file");
    }
    if (header === undefined) {
      throw("Can't open header file");
    }
    
    YY["in"] = grammar.content; // read
    if (SWITCH_DICT.compat_i) {
      header.content.push("/dev/null\n");
    }

    header.content +=
      "// Header of class reduction flag for finite automaton parser\n\
       //                   made with mkfa " + VERSION_NUMBER + "\n\n\
       //        Do logical AND between label and FA's field #4, #5.\n\
       //\n\n";

    if (SWITCH_DICT.quiet === undefined) {
      console.log("Now parsing grammar file\n");
    }

    // yyiha!
    YY.parse();
    
    /*
    if (!SWITCH_QUIET) {
      console.log("Now modifying grammar to minimize states [" + START_SYMBOL - 1 + "]\n");
      NO_NEW_LINE = 0;
    }
    if (START_SYMBOL == NULL) {
      START_SYMBOL = CLASS_LIST; // struct?
    }
    struct_name = START_SYMOBL.name;
    FP_HEADER.push("// Start Symbol:  " + struct_name + "\n");
    if (testNoInstantClass(struct_name) !== null) {
      errorMessage("Prototype-declared Class " + struct_name + " has no instant definitions");
    }
    if (errorParse) {
      errorMessage("Fatal Errors exists");
    }
    */
  }

  function setFileName(my_param, my_mode) {
    var set_grammar= 0,
      set_voca = 0,
      set_output = 0,
      set_header = 0;

    function setFile(my_name, my_content) {
      return {"type": my_name, "content": my_content};
    }

    switch (my_mode) {
      
      // spec1, no file name specified
      case 1:
        FILE_DICT.grammar = setFile("grammar", my_param);
        set_grammar = 1;
        break;
      case 2:
        FILE_DICT.voca = setFile("voca", my_param);
        set_voca = 1;
        break;
      case 3:
        FILE_DICT.output = setFile("output", my_param);
        set_output = 1;
        break;
      case 4:
        FILE_DICT.header = setFile("header", my_param);
        set_header = 1;
        break;

      // spec2
      case 5:
        IS_OPTION_F_SET = 1;
        FILE_DICT.key = my_param[0];
        FILE_DICT[FILE_DICT.key + ".grammar"] = setFile("grammar", my_param[1]);
        FILE_DICT[FILE_DICT.key + ".voca"] = setFile("voca", my_param[2]);
        if (SWITCH_DICT.nfa_output) {
          FILE_DICT[FILE_DICT.key + ".nfa"] = setFile("output", my_param[3]);
        } else {
          FILE_DICT[FILE_DICT.key + ".dfa"] = setFile("output", my_param[3]);
        }
        FILE_DICT[FILE_DICT.key + ".header"] = setFile("header", my_param[4]);
        set_grammar = set_voca = set_output = set_header = 1;
        return 1;
    }

    // XXX original would only return 1 if all sets are 1?, will not work
    if (set_grammar + set_voca + set_output + set_header === 0) {
      return 0;
    }
    return 1;
  }

  function setSwitch (my_input) {
    switch (my_input) {
      case "l":
        SWITCH_DICT.sent_list = 1;
        break;
      case "nw":
        SWITCH_DICT.no_warning = 1;
        break;
      case "c":
        SWITCH_DICT.compat_i = 1;
        break;
      case "db":
        SWITCH_DICT.debug = 1;
        break;
      case "dfa":
        if (IS_OPTION_F_SET) {
          console.log("dfa resolving option set");
        }
        SWITCH_DICT.nfa_output = 0;
        break;
      case "nfa":
        if (IS_OPTION_F_SET) {
          console.log("dfa resolving option set");
        }
        SWITCH_DICT.nfa_output = 1;
        break;
      case "fg":
        return 1;
      case "fv":
        return 2;
      case "fo":
        return 3;
      case "fh":
        return 4;
      case "f":
        return 5;
      case "v":
        SWITCH_DICT.verbose = 1;
        break;
      case "c":
        SWITCH_DICT.compat_i = 1;
        break;
      case "e":
        SWITCH_DICT.edge_accept = 1;
        SWITCH_DICT.edge_start = 1;
        break;
      case "e0":
        SWITCH_DICT.edge_accept = 1;
        break;
      case "e1":
        SWITCH_DICT.edge_start = 1;
        break;
      case "q0":
        SWITCH_DICT.quiet = 1;
        break;
      case "q":
      case "q1":
        SWITCH_DICT.semi_quiet = 1;
        break;
      default:
        throw("Ran out of switch options.... funny");
    }
  }

  //$mkfa -e1 -fg $rgramfile -fv $tmpvocafile -fo $(dfafile).tmp -fh $headerfile
  //$mkfa -e1 -f ["sample" $rgramfile $tmpvocafile $(dfafile).tmp $headerfile]
  function getSwitch(my_parameter_list) {
    var len = my_parameter_list.length,
      file_mode = 0,
      file_finish = 0,
      parameter,
      i;

    // note: skipping first parameter
    for (i = 1; i < len; i += 1) {
      parameter = my_parameter_list[i];
      if (file_mode === 0) {
        if (parameter[0] === '-') {
          file_mode = setSwitch(parameter.slice(1));
        } else {
          throw("First parameter character is not '-':" + parameter);
        }
      } else {
        file_finish = setFileName(parameter, file_mode);
        file_mode = 0;
      }
    }
    if (file_finish === 0) {
      throw("Something went wrong trying to set filenames.");
    }
  }

  // ---------------------------- start (spec1)---------------------------------
  //$mkfa -e1 -fg $rgramfile -fv $tmpvocafile -fo $(dfafile).tmp -fh $headerfile
  function makeDfa() {
    var parameter_list = arguments;

    return new RSVP.Queue()
      .push(function () {
        getSwitch(parameter_list);
        
        if (SWITCH_DICT.edge_accept) {
          throw("AcceptFlag on edge is under construction.");
        }

        setGrammarFile();
        //setVoca();
        //makeNFA();
        //if (SWITCH_DICT.nfa_output === 0) {
        //  makeDFA();
        //}
        //makeTriplet();
      })
      .push(undefined, function (my_error) {
        console.log(my_error);
        throw my_error;
      });
  }

  window.mkdfa = makeDfa;

}(window, RSVP));


