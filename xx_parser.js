(function (window, Math, Lexer) {
  "use strict";

  /*
   * Copyright (c) 1991-2011 Kawahara Lab., Kyoto University
   * Copyright (c) 2000-2005 Shikano Lab., Nara Institute of Science and Technology
   * Copyright (c) 2005-2011 Julius project team, Nagoya Institute of Technology
   * All rights reserved
   */
   
  // A ported Bison parser, made from gram. by hand.
  
  /* Skeleton output parser for bison,
  
    Copyright (C) 1984, 1989, 1990, 2000, 2001, 2002 Free Software
    Foundation, Inc.
  
    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2, or (at your option)
    any later version.
  
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
  
    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place - Suite 330,
    Boston, MA 02111-1307, USA.  */

  /* As a special exception, when this file is copied by Bison into a
    Bison output file, you may use that output file without restriction.
    This special exception was added by the Free Software Foundation
    in version 1.24 of Bison.  */
  
  /* This is the parser code that is written into each bison parser when
    the %semantic_parser declaration is not specified in the grammar.
    It was written by Richard Stallman by simplifying the hairy parser
    used when %semantic_parser is specified.  */
  
  /* All symbols defined below should begin with yy or YY, to avoid
    infringing on user name space.  This should be done even for local
    variables, as they might otherwise be expanded by user macros.
    There are some unavoidable exceptions within include files to
    define necessary library symbols; they are noted "INFRINGES ON
    USER NAME SPACE" below.  */

  // https://github.com/julius-speech/julius/blob/6d135a686a74376495a7a6f55d3d67df54186f83/gramtools/mkdfa/mkfa-1.44-flex/gram.tab.c
  // http://www.isi.edu/~pedro/Teaching/CSCI565-Fall16/Materials/LexAndYaccTutorial.pdf
  // https://github.com/codemix/malloc
  // zaa.ch/jison/try
  // http://unixwiz.net/techtips/reading-cdecl.html
  // http://www.cplusplus.com/doc/tutorial/preprocessor
  // https://www.cs.uic.edu/~spopuri/cparser.html
  // http://lxr.free-electrons.com/source/scripts/dtc/srcpos.h?v=2.6.33#L43

  // ------------------------------ setup --------------------------------------

  // behold the one YY to yyuck them all
  var YY = {};

  // ---------------------------- memory ---------------------------------------

  // (YYSTACK_BYTES) Size of array large to enough for all stacks, each with 
  // stack_size elements.
  // 2/3 stacks = 1/2 gaps plus byte size of all 2/3 types * number of elements
  //function getStackTotalBytes(my_stack_size) {
  //  var size_one_of_each,
  //    gaps_needed;
  //  if (YY.overflow !== undefined && (YY.ltype_trivial && YY.stype_trivial)) {
  //    gaps_needed = 1;
  //    size_one_of_each = YY.short_size + YY.stype_size;
  //    if (YY.lsp_needed) {
  //      gaps_needed = 2;
  //      size_one_of_each += YY.ltype_size;
  //    }
  //    return gaps_needed * YY.stack_gap_max + my_stack_size * size_one_of_each;
  //  } else {
  //    throw new Error("Seems overflow and trivial things have not been set.");
  //  }
  //}

  // A type that is properly aligned for any stack member
  // This was a union yyalloc struct only used in overflow handler, so now it's
  // a setter for a property. Could also look at this:
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
  //function getMaxStackGap() {
  //  if (YY.lsp_needed) {
  //    return YY.short_size + YY.stype_size + YY.ltype.size - 1;
  //  } else {
  //    return YY.short_size + YY.stype_size - 1;
  //  }
  //}

  // (YYSTACK_RELOCATE)
  // Relocate STACK from its old location to the new one. The local variables 
  // (have been local to .parse()!!) YYSIZE) and YYSTACKSIZE give the old and 
  // new number of elements in the stack, and YYPTR gives the new location of 
  // the stack. Advance YYPTR to a properly aligned location for the next stack.
  // https://opensource.apple.com/source/cc/cc-798/bison/bison.hairy.auto.html
  // Mozilla has an arrayBuffer tranfer which extends without copying but not 
  // supported anywhere else
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/transfer
  function relocateStack(my_old_view, my_new_view, my_len) {
    var new_bytes;

    // Copy STACK COUNT objects FROM to TO. source and destination don't overlap
    function copyStack(my_to, my_from, my_count) {
      var i,
        value;
      for (i = 0; i < my_count; i += 1) {
        value = my_to.getInt8(i);
        my_from.getInt8(i, value); 
      }
    }

    copyStack(my_old_view, my_new_view, my_len);

    // no need for caluclating yynewbytes and finding the position of stack in 
    // memory yyptr defined in setState because this was a macro
  }
  
  // Stack is an area of memory that holds all local variables and parameters 
  // used by any function, and remembers the order in which functions are called
  // so that function returns occur correctly.
  // Refer to the stacks through separate pointers to allow overflow to
  // reallocate them elsewhere.
  // using ArrayBuffer http://www.javascripture.com/ArrayBuffer
  function setParserStackList(my_context, my_depth, my_init) {
    
    function setStack(my_param) {
      var stack = my_param + "_stack",
        view = my_param + "_view",
        top = my_param + "_top",
        bottom = my_param + "_bottom",
        tmp,
        len,
        few;

      // initialize new or move existing arraybuffer to new (larger) one
      if (my_context[stack] === undefined) {
        my_context[stack] = new ArrayBuffer(my_depth);
      } else {
        tmp = new ArrayBuffer(my_depth);
        len = my_context.state_stack.byteLength;
        few = new DataView(tmp);
        my_context[stack] = relocateStack(my_context[view], few, len);
      }
      
      // (yyssa/yyvsa/yylsa)
      my_context[view] = new DataView(my_context[stack]);
      
      // (yyss/yyvs/yyls)
      my_context[bottom] = 0;
      
      // (yyssp/yyvsp/yylsp)
      my_context[top] = my_context.stack_size - 1;
    }

    // The state stack: Does not shift symbols on to the stack. 
    // Only a stack of states is maintained.
    setStack("state");
    
    // This semantic stack: Grows parallel to the state stack. At 
    // each reduction, semantic values are popped off this stack and the 
    // semantic action is executed.
    setStack("semantic");
    
    // The location stack: only used when lsp_needed is set and I'm 
    // not sure at this moment how it behaves.
    if (YY.lsp_needed) {
      setStack("location");
    }

    // no need to redefine on updates
    if (my_init === true) {

      // will also be overwritten externally, no need to update on relocates
      my_context.stack_size = YY.stack_initial_depth;

      // (YYPOPSTACK)
      my_context.popStack = function (n) {
        my_context.semantic_top = my_context.semantic_top - n || 1;
        my_context.state_top = my_context.state_top - n || 1;
        if (YY.lsp_needed) {
          my_context.location_top = my_context.location_top - n || 1;
        }
      };
    }
  }

  // --------------------------- configure -------------------------------------

  // Identify Bison output.
  YY.bison = 1;

  // (YYLEX)
  YY.lexer = window.lexer;

  // Hardcoded now. Pure parser = reeentrant = can be called during modification
  // https://www.gnu.org/software/bison/manual/html_node/Pure-Decl.html
  YY.pure = 0;

  // (YYDEBUG)
  YY.debug = 0;

  // Use locations, from: https://fbb-git.github.io/bisoncpp/bisonc++api.html
  // LTYPE__ d_loc__ The location type value associated with a terminal token.
  // It can be used by, e.g., lexical scanners to pass location information
  // of a matched token to the parser in parallel with a returned token.
  // It is available only when %lsp-needed, %ltype or %locationstruct is set.

  // Bonus: http://acronymsmeanings.com/full-meaning-of/yylsp/
  YY.lsp_needed = 0;

  // (YYINITDEPTH) Initial size of the parser's stacks.
  YY.stack_initial_depth = 200;

  // maximum size the stacks can grow to (effective only if the built-in stack 
  // extension method is used). Do not make this value too large, as results
  // may be undefined if size_max < getStackTotalBytes(stack_list_max_depth) is 
  // called.
  YY.stack_list_max_depth = 10000;

  // (YY.empty)
  YY.empty = -2;

  YY.nt_base = 14;

  // Lookahead token? or symbol
  YY.char;

  // Even trivially named yet obfusciatingly set, only used once needlessly
  // http://lxr.free-electrons.com/source/scripts/dtc/srcpos.h?v=2.6.33#L43
  YY.ltype_trivial = 1;

  // Since we're at it
  YY.stype_trivial = 1;

  // (short) 2 bytes size of short -32,768 to 32,767
  YY.short_size = 2;

  // size of type STYPE
  YY.stype_size = 0; // XXX?

  // size of type LTYPE
  YY.ltype_size = 0; // XXX?

  // (YYSIZE_T) type ? set to unsigned_int = 4 bytes   
  YY.sizet_size = 4; // XXX? YYSIZE_T a type?
  
  // also set size of char*
  // http://stackoverflow.com/a/40679845/536768
  YY.char_pointer_size = 4;

  // (YYSTACK_GAP_MAX) Size of the maximum gap between one aligned stack and 
  // the next => sizeof(union yyalloc) - 1;
  // YY.stack_gap_max = getMaxStackGap();

  // (YYLAST) highest index in lookup table yytable/state_action
  YY.last = 53;

  // /YYFINAL (rule?)
  YY.final = 43;

  // (YYFLAG) flag rerouting to default action in backup	
  YY.flag = -32768;

  // (YYTERROR) the audacity... just write 1 no?
  YY.terror = 1;

  // (YYERROR_VERBOSE)
  YY.error_verbose = 0;

  // (YYEOF) end of file
  YY.end_of_file_reached = 0;

  // (yyerror) this only reports, it used to increase error_count++
  YY.error = function (my_error_count, my_message) {
    console.log("[error] (#:" + my_error_count + "): " + my_message);
  };

  // https://opensource.apple.com/source/yacc/yacc-8/skeleton.c
  YY.overflow = function () {
    parameter_list = arguments;
    console.log(parameter_list.join(""));    
  };

  // dump all ArrayBuffers
  YY.purge = function (my_param, my_context) {
    my_context[my_param + "_stack"] = my_context[my_param + "_view"] =
      my_context[my_param + "_top"] = my_context[my_param + "_bottom"] = null;
  };
  
  
  // (YYLLOC_DEFAULT) -- Compute the default location (before the actions are run).
  // When YYLLOC_DEFAULT is run, CURRENT is set the location of the
  // first token.  By default, to implement support for ranges, extend
  // its range to the last symbol.
  YY.loco_default = function (my_current, my_right_hand_side, my_n) {
    my_current.last_line = my_right_hand_side[my_n].last_line;
    my_current.last_column = my_right_hand_side[my_n].last_column;
  };

  // --------------------------- token values ----------------------------------
  // Here is the definitions section for the yacc input file:
  // %token INTEGER
  //
  // This definition declares an INTEGER token. Yacc generates a parser in 
  // file y.tab.c and an include file y.tab.h, like:
  //
  // #ifndef YYSTYPE
  // #define YYSTYPE int
  // #endif
  // #define INTEGER 258
  // extern YYSTYPE yylval;
  //
  // Lex includes this file and utilizes the definitions for token values. 
  // To obtain tokens yacc calls yylex. Function yylex has a return type of int 
  // that returns a token. Values associated with the token are returned by 
  // lex in variable yylval. For example:
  // 
  // [0-9]+      {
  //                yylval = atoi(yytext);
  //                return INTEGER;
  //             }
  //
  // would store the value of the integer in yylval, and return token INTEGER 
  // to yacc. The type of yylval is determined by YYSTYPE. Since the default 
  // type is integer this works well in this case. Token values 0-255 are 
  // reserved for character values. For example, if you had a rule such as:
  //
  // [-+]       return *yytext;    /* return operator */
  //
  // the character value for minus or plus is returned. Note that we placed 
  // the minus sign first so that it wouldnât be mistaken for a range 
  // designator. Generated token values typically start around 258 because lex 
  // reserves several values for end-of-file and error processing.

  YY.token_values = {
    "CTRL_ASSIGN": 257,
    "CTRL_IGNORE": 258,
    "OPEN": 259,
    "CLOSE": 260,
    "REVERSE": 261,
    "STARTCLASS": 262,
    "LET": 263,
    "TAG": 264,
    "SYMBOL": 265,
    "REMARK": 266,
    "NL": 267
  };

  // ------------------ custom foo (mkfa.h and mkdfa) --------------------------
  // declared in gram.y, not sure yet what these do
  YY.custom_dict = {};

  YY.custom_dict.block_reservse_switch = null;
  YY.custom_dict.is_mode_assign_accept = 1;
  YY.custom_dict.class_count = 0;
  YY.custom_dict.current_class_count = 0;
  YY.custom_dict.start_flag = 0;
  YY.custom_dict.grammar_modification_number = 0;
  YY.custom_dict.finite_automaton_list = null; // Pointer of start FA in FA network

  // XXX mkfa.h? what is this for?
  // "Can't alloc nonterminal list buffer" => this is a buffer for non-terminals
  // BODY_NAME[body_class_number][symbol_len];
  // with 100 elements each 256 bytes space?
  YY.custom_dict.body_buffer_list = new ArrayBuffer(YY.custom_dict.body_class_number);
  YY.custom_dict.body_symbol_len = 256;
  YY.custom_dict.body_class_number = 100;
  YY.custom_dict.body_count = 0;
  YY.custom_dict.body_class_flag = 0;
  YY.custom_dict.body_class_flag_start = 0;
  YY.custom_dict.body_class_flag_accept = 0;
  YY.custom_dict.body_class_flag_max = YY.custom_dict.body_class_flag * 8;
  YY.custom_dict.is_block_start_or_end = 0;

  YY.custom_dict.head_name = "";

  // (CLASS_LIST_TAIL) The last node of the linear list of classes
  YY.custom_dict.class_list_tail = null;

  // (CLASS_LIST) Linear list of classes
  YY.custom_dict.class_list = null;

  // (START_SYMBOL) Class of start symbol
  YY.custom_dict.start_symbol = null;

  // XXX all of those are not used (yet?)
  YY.custom_dict.body_list = {"body": {}, "next": {}};
  YY.custom_dict.arc = {
    "inp": 0,
    "finite_automaton": {},
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "next": {}
  };
  YY.custom_dict.unify_arc = {
    "inp": 0,
    "finite_automaton": {},
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "next": {},
    "flag_reserved": 0
  };
  YY.custom_dict.finite_automaton_list = {
    "finite_automation": {},
    "next": {}
  };
  YY.custom_dict.finite_automaton = {
    // common
    "stat": 0,
    "arc": [],
    "body_class_flag_start": 0,
    "body_class_flag_accept": 0,
    "flag_traversed": 0,
    // for DFA
    "psNum": 0,
    "unify_arc_list": [],
    "finite_automaton_list": [],
    "flag_volatiled": 0
  };
  // XXX end unused

  YY.custom_dict.createBody = function () {
   return {"name": null, "flag_abort": 0, "next": {}};
  };

  YY.custom_dict.createBodyClass = function () {
    return {  
      "number": null,
      "name": null,
      "next": {},
      "body_list": {},
      "branch": null,
      "flag_used_fa": 0,
      "flag_used": 0,
      "flag_tmp": 0,
      "tmp": null
    };
  };  

  YY.custom_dict.configureNonTerminalSymbol = function (my_body) {
    var first_body = null,
      previous_body = null,
      i;
    for (i = 0; i < YY.custom_dict.body_count; i += 1) {
      my_body.name = YY.custom_dict.body_buffer_list.getInt(i);
      my_body.abort = 0;
      if (previous_body !== null) {
        previous_body.next = my_body;
      } else {
        first_body = my_body;
      }
      previous_body = my_body;
    }
    my_body.next = null;
    return first_body;
  };

  YY.custom_dict.outputHeader = function (my_name) {
    if (YY.custom_dict.class_count >= YY.custom_dict.body_class_flag_max) {
      if (YY.switch_dict && YY.switch_dict.compat_i === 0) {
        console.log("[info] - Class accepted flag overflow, " + my_name);
      }
    } else {
      if (YY.switch_dict && YY.switch_dict.compat_i === 0) {

        // 0x%08x = pointer http://stackoverflow.com/a/33324713/536768
        // XXX why the class_count check?
        YY.file_dict.header += "#define ACCEPT_" + my_name + "0x%08x\n", 1 << YY.custom_dict.class_count;
      }
      YY.custom_dict.current_class_count = YY.custom_dict.class_count++;
   }
  };

  YY.custom_dict.getNewClassName = function (my_key_name) {
    var tmp_class_count = 0,
      class_name = my_key_name + "#" + tmp_class_count;
    if (YY.switch_dict && YY.switch_dict.semi_quiet === 0) {
      console.log("[info] - Now modifying grammar to minimize states[" +
        YY.custom_dict.grammar_modification_number + "]");
      YY.switch_dict.no_new_line = 1;
    }
    YY.custom_dict.grammar_modification_number++;
    return 1;
  };
  
  YY.custom_dict.unifyBody = function (my_class_name, my_body, my_new_body) {
    var body_next,
      new_body_next,
      body_class,
      new_body,
      new_class_name;

    // alors...
    body_next = my_body.next;
    new_body_next = my_new_body.next;

    while (1) {
      if (body_next === null && new_body_next === null) {
        return -1;
      }
      if (new_body_next === null) {
        if (my_body.abort) {
         return -1;
        } else {
         my_body.abort = 1;
        }
        return 0;
      }
      if (body_next === null) {
        my_body.abort = 1;
        my_body.next = new_body_next;
        return 0;
      }
      if (body_next.name === new_body_next.name) {
        break;
      }

      // XXX ?
      my_body = body_next;
      my_new_body = new_body_next;
      body_next = body.next;
      new_body_next = new_body.next;
    }

    body_class = YY.custom_dict.createBodyClass(); // XXX another one?
    if (body_class !== null && body_class.tmp) {
      YY.custom_dict.enterNonTerminalSymbol(my_body.name, new_body_next, 0, 0, 0, 1);
    } else {
      new_class_name = getNewClassName(my_class_name);
      YY.custom_dict.enterNonTerminalSymbol(new_class_name, body_next, 0, 0, 0, 1);
      YY.custom_dict.enterNonTerminalSymbol(new_class_name, new_body_next, 0, 0, 0, 1);
      my_new_body.name = new_class_name;
      my_new_body.abort = 0;
      my_new_body.next = null;
      my_body.next = newBody;
      body_next.next = body_next;
    }
    return 0;
  };

  YY.custom_dict.pushBody = function (my_body_class, my_new_body) {
    var body_list = my_body_class.body_list,
      define_number = 1,
      pre_body_list = null,
      new_body_list,
      body,
      cmp;
   
    while (body_list !== null) {
      body = body_list.body;
      cmp = body.name === my_new_body.name;
      if (cmp > 0) {
        break;
      }
      if (cmp === 0) {
        if (YY.custom_dict.unifyBody(my_body_class.name, body, my_new_body)) {
          console.log("[info] - Redefining class: ", my_body_class.name, body.name);
        }
        return;
      }
      pre_body_list = body_list;
      body_list = body_list.next;
      define_number++;
    }
    new_body_list.body = new_body;
    if (pre_body_list !== null) {
      pre_body_list.next = new_body_list;
    } else {
      my_body_class.body_list = new_body_list;
    }
    new_body_list.next = body_list;
    my_body_class.branch++;
  };

  // Class Finite Automaton.
  YY.custom_dict.enterNonTerminalSymbol = function(my_name, my_body_accept, my_start, my_member, my_tmp) {
    // XXX mh not sure what to make of this
    // CLASS *class;
    // class = getClass( name );
    var body_class = YY.custom_dict.createBodyClass();

    if (body_class === null) {
      if (my_member) {
        context.scope.error_count++;
        console.log("[error] - Accepted fla of class is reassigned:", YY.custom_dict.head_name);
      }
    } else {
      body_class.name = my_name;
      if (my_mode_accept) {
        if (my_member) {
          body_class.number = YY.custom_dict.current_class_count;
        } else {
          if (my_tmp === 0) {
            outputHeader(name);
            body_class.number = YY.custom_dict.current_class_count;
          }
        }
      } else {
        body_class.number = -1;
      }
      body_class.branch = 0;
      body_class.used_finite_automaton = 0;
      body_class.used = 1; // non-terminal does not appear in voca
      body_class.body_list = null;
      body_class.tmp = tmp;
      body_class.next = null;
      if (YY.custom_dict.class_list_tail === null) {
        //YY.custom_dict.class_list.push(body_class);
        YY.custom_dict.class_list = body_class;
      } else {
        YY.custom_dict.class_list_tail.next = body_class;
      }
      YY.custom_dict.class_list_tail = body_class;
     }

     if (my_body === null) {
      YY.custom_dict.pushBody(body_class, my_body);
      if (my_start) {
        YY.custom_dict.body_class_flag_start = 0;
        if (YY.custom_dict.start_symbol === null) {
          YY.custom_dict.start_symbol = body_class;
        } else {
          context.scope.error_count++;
          console.log("[error] - Start symbol is redefined: ", body_class.name);
        }
      }
     }
     return body_class;
  };

  YY.custom_dict.appendNonTerminalSymbol = function (my_name, my_mode_assign) {
    YY.custom_dict.enterNonTerminalSymbol(
      my_name,
      YY.custom_dict.configureNonTerminalSymbol(YY.custom_dict.createBody()),
      my_mode_assign,
      YY.custom_dict.body_class_flag_start,
      YY.custom_dict.is_block_start_or_end,
      0
    );
    YY.custom_dict.body_count = 0;
  };

  // -------------------------- lookup tables ----------------------------------

  // YYTRANSLATE() -- Bison token number corresponding to YYLEX.
  YY.translate = function (my_x) {
    if (my_x <= 267) {
      return YY.table_dict.translate[my_x];
    }
    return 27;
  };

  YY.table_dict = {
      
    // (yytranslate)
    // This table maps lexical token numbers to their symbol numbers. If you 
    // have %token declarations in your grammar, Bison assigns token numbers to 
    // the different tokens; If you just use character representations, Bison 
    // just maps their ASCII values to the symbol numbers. Example of the latter
    // is yytranslate[97] = 5 which is 'a'. Full listing of yytranslate is below.
    "translate": [
       0,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     2,     2,     2,     2,
       2,     2,     2,     2,     2,     2,     1,     3,     4,     5,
       6,     7,     8,     9,    10,    11,    12,    13
    ],
    
    // (yyr1) - Symbol number of symbol that rule yyn derives.
    // Symbol number of lhs of each rule. Used at the time of a 
    // reduction to find the next state. yyr1 specifies the symbol number of 
    // the LHS of each rule. Remember that 0 is never used as a rule number, 
    // so this table has NRULES + 1 entries, where NRULES is the number of 
    // rules in the grammar. Here is the listing:
    "rule_left_hand_side_symbol_number": [
       0,   14,   14,   15,   15,   15,   15,   15,   16,   17,
      17,   18,   18,   19,   19,   19,   20,   20,   21,   22,
      22,   23,   23,   24,   25,   25,   26,   26  
    ],

    // Other example:
    // {
    //   0,     8,     9,     9,    10,    10,    11,    11,    12,    12
    // };
    // So rule #1 has $accept as LHS, and hence rule_symbol_number[1] = 8 (see 
    // symbol table given previously) and so on. When a reduction takes place, 
    // We need to know the LHS symbol of the rule used for reduction to 
    // transition to an appropriate state. That is where this table comes into 
    // use.

    // (yyr2) - length of RHS of each rule (Number of symbols composing right
    // hand side of rule. Used at the time of reduction to pop the stack.
    "rule_right_hand_side_symbol_length": [
      0,    1,    2,    1,    1,    1,    1,    2,    6,    1,
      2,    1,    2,    1,    2,    1,    1,    2,    4,    1,
      2,    1,    2,    1,    2,    1,    1,    1  
    ],

    // yyr2 specifies the length (number of symbols) of the right hand side of 
    // each rule. Here is a listing produced by Bison:
    // {
    //   0,     2,     3,     1,     3,     1,     1,     3,     0,     1
    // };
    // Rule #2 (L â L;E) has 3 symbols on the RHS, and hence yyr2[2] = 3. This 
    // table is also used at the time of a reduction. The number of states to 
    // be popped off the stack is same as the number of symbols on the right 
    // hand side of the reducing rule.

    // (yydefact) - default reduction rules for each state = default rule to 
    // reduce with in state S when YYTABLE doesn't specify something else to do.
    "default_reduction_rule": [
       0,    0,    0,   25,    0,    0,    9,   21,   26,   27,
       0,    3,    0,    4,   16,    0,    5,    6,    7,   24,
      10,   17,   22,    2,    0,    0,    0,   23,    0,   19,
       0,   11,   13,    0,   15,   18,   20,    0,   12,   14,
       8,    0,    0,    0
    ],

    // This table lists default reductions for each state. yydefact[state] = 
    // rule number to use for a default reduction in that state. Here is the 
    // yydefact table produced for our a sample grammar:
    // {
    // 0,     6,     8,     0,     3,     5,     9,     0,     1,     0,
    // 0,     7,     2,     4
    // };
    // Note that a rule number 0 in this table means error. Rule number 0 is 
    // not used internally by Bison because of some limitations of the internal
    // representation of the input grammar. One important observation here -
    // rule numbers are incremented by 1 in this table because of the additional 
    // rule ($accept â L $end). So what was really r5 for state 1, has become 
    // r6 in yydefact.

    // (yydefgoto) - lists default GOTOs for each non-terminal symbol. It is 
    // only used after checking with yypgoto.
    "default_goto_method": [
      23,   10,   11,   12,   30,   31,   13,   14,   28,   15,
      29,   16,   17  
    ],

    // This is a compressed form of the GOTO part of our traditional table. 
    // It has as many entries as there are non-terminals in the grammar. Each 
    // entry specifies the state to transition to on each non-terminal. So 
    // here goes:
    //{
    //  -1,     3,     4,     5,     7
    //};
    // yydefgoto[nth non-terminal] = most common GOTO state for the nth 
    // non-terminal. n starts from zero. An index into this array is obtained 
    // by subtracting the number of terminal symbols from the symbol number of
    // the non-terminal. For example, the symbol number for E is 10 and number 
    // of tokens in the grammar is 8, so:
    // Thus yydefgoto[E] = yydefgoto[10-8] = state 4.
    // yydefgoto is consulted whenever the parser reduces stack contents 
    // using a rule. Later we will see that yydefgoto is consulted only after 
    // checking with another goto table, and that will explain how we manage 
    // to go to state 6 from state 2 on L instead of going to state 3 as this
    // table specifies for L.
    // As a final note observe that the entry for the zeroth non-terminal
    // ($accept) is -1. The stack will never be reduced with the $accept rule.
    
    // (yypact) - Directory into yytable indexed by state number. Ddisplacements 
    // in yytable are indexed by symbol number.
    "set_state_action": [
          29,    14,     5,-32768,    36,     0,-32768,-32768,-32768,-32768,
           2,-32768,    20,-32768,-32768,    25,-32768,-32768,-32768,-32768,
      -32768,-32768,-32768,-32768,     5,    34,     8,-32768,     5,    34,
          42,     8,-32768,    -5,-32768,-32768,-32768,     5,-32768,-32768,
      -32768,    49,    50,-32768
    ],
    
    // This table specifies the portion of yytable that describes what to do 
    // in state S. It is indexed by the symbol number of the token symbols. This
    // is like the directory table D that was described in the previous section 
    // on compressing parsing tables. It is the first table consulted by the 
    // parsing loop. If yypact[cur-state] = YYPACT_NINF, its time for a 
    // default reduction using yydefact. This means that the state has only 
    // reductions as in state 1 (r5); otherwise the entry in yypact[cur-state] 
    // is to be added to the symbol number of the current look-ahead token and 
    // the resulting number is used as an index into yytable to get the next
    // action (see comments in yytable code).An example:
    
    // Suppose we are in state zero and the look-ahead token is 'a' (symbol 
    // number 5). Now yypact[0] is -4, so the index into yytable is 5-4 = 1. 
    // yytable[1] is 1 which means "shift this symbol and go to state 1". See 
    // yycheck below for some more checking information. If the yytable entry 
    // specifies a negative value say -3, it means that we should be reducing 
    // the stack with rule #3.

    // (yypgoto) - accounts for non-default GOTOs for all non-terminal symbols.
    "non_terminal_goto_method": [
      51,-32768,-32768,-32768,   21,-32768,-32768,   -3,   24,   12,
    -32768,-32768,   -2  
    ],

    // This table gives a reference to GOTO entries for non-terminals that can 
    // transition the automaton to different states based on previous state.
    // For example, the symbol L can take the automaton to state 3 if the 
    // present state is 0, but the GOTO on L for state 2 is state 6. Similarly 
    // for symbols E and P there are different GOTO states based on the current
    // state. The most common GOTO is already defined in YYDEFGOTO. The job 
    // of YYPGOTO is to indicate the anomalies. Lets take a look:
    // {
    //  -5,     5,    -1,     2,    -5
    // };
    // That's our ND table that we discussed in the compressing parsing tables 
    // section. It is indexed by non-terminal symbol number; One entry each 
    // for $accept, L, E, P, M. Let us say the current state on top of the 
    // stack after reduction by rule #5 (P â a) is state 10 (see example parse
    // in the appendix). Now the GOTO transition for state 10 on P is really 
    // state 13 (according to our traditional tables), which is not the 
    // yydefgoto entry for P.
    // The parser adds yypgoto[P] i.e yypgoto[3] to the current exposed 
    // state number (state 10). The result is 12 (since yypgoto[3]=2). 
    // Now yytable[12] happens to be 13, so this is the new state to be 
    // pushed on to the stack.

    // How does the parser know that it has to pick the state value from 
    // yytable (via yypgoto) and not from yydefgoto? For this, there is a 
    // guard table called yycheck that will indicate this fact. It is only 
    // after checking with this table that a proper pick is made. We will see 
    // this operation in the section describing the parsing routine yyparse().

    // (yytable) - a highly compressed representation of the actions in each 
    // state. Negative entries represent reductions. There is a negative 
    // infinity to detect errors.
    "state_action": [
      19,   21,   -1,    1,   25,    2,    3,    8,    9,    4,
       5,   22,    6,    7,    8,    9,    5,    8,    9,    7,
       8,    9,   26,   32,   34,   24,   35,   18,   32,   34,
       1,   39,    2,    3,   25,   40,    4,    5,   33,    6,
       7,    8,    9,   33,    5,   27,   20,    7,   37,   42,
      43,   41,   38,   36
    ],

    // This table is a mixed bag of state numbers and rule numbers in some 
    // pre-calculated order. This is the table T we discussed in the previous 
    // section. yytable works closely with yycheck, yypact and yypgoto tables 
    // to indicate to the parser either the state to pushed next on to the 
    // parse stack or a rule to use for reduction.
    // One thing worth noting here is the definition of YYTABLE_NINF - the 
    // "negative infinity" value for yytable is the highest negative entry 
    // which in our case is -1 (since there are no negative values in yytable). 
    // This value is used to determine explicit error situations.

    // (yycheck) - guard used to check legal bounds within portions yytable 
    "state_action_valid": [
       2,    4,    0,    1,    9,    3,    4,   12,   13,    7,
       8,   11,   10,   11,   12,   13,    8,   12,   13,   11,
      12,   13,   24,   26,   26,    5,   28,   13,   31,   31,
       1,   33,    3,    4,    9,   37,    7,    8,   26,   10,
      11,   12,   13,   31,    8,   11,   10,   11,    6,    0,
       0,    0,   31,   29
    ]

    // This is like a guard table. This table is used for various checks. Again 
    // this table is another mixed bag - of symbol numbers and state numbers. 
    // There is a very good explanation for this table inside Bison source
    // code (src/tables.h): YYCHECK = a vector indexed in parallel with YYTABLE.  
    // It indicates, in a roundabout way, the bounds of the portion you are 
    // trying to examine.
    // Suppose that the portion of YYTABLE starts at index P and the index to 
    // be examined within the portion is I. Then if YYCHECK[P+I] != I,
    // I is outside the bounds of what is actually allocated, and the 
    // default (from YYDEFACT or YYDEFGOTO) should be used. Otherwise,
    // YYTABLE[P+I] should be used.
    // Example: Suppose we are in state 0 and the look-ahead token in 'a'. 
    // yypact[0] = -4 and this, added to symbol number of 'a' (5) gives the
    // index in yytable as we have seen before. Before accessing yytable[1] and
    // proceeding to shift the token, the parser must check that yycheck[1] has 
    // the symbol number for the current token. If the test fails, it is time
    // for a default reduction! But in our case, yycheck[1] contains 5 which 
    // really is the symbol number 'a', so we can safely consult yytable for
    // what to do next.
    // yycheck also helps with special case reductions where the GOTO on a
    // non-terminal for the current state is not the most common state 
    // (specified by yydefgoto); Consider the same example given in the yypgoto 
    // section: we were in state #10 and the reduction rule was rule #5 (P â a). 
    // We added yypgoto[P]=2 to current state number (10) to get 12. Before 
    // consulting yytable the parser checks with yycheck[12]. If this value 
    // is 10, then we know that state# 10 is a special case, otherwise, we use 
    // yydefgoto to decide the transition.
  };

  if (YY.debug) {

    // (yyrhs) - A -1 separated list of RHS (right hand side/key) symbol
    // numbers of all rules. yyrhs[n] is first symbol on the RHS (right hand 
    // side of rule #n)
    // Not generated anymore in Bison > 2014
    YY.table_dict.right_hand_side = [
      15,     0,    15,    14,     0,    16,     0,    20,     0,    25,
       0,    26,     0,     1,    13,     0,    17,     5,    26,    18,
       6,    26,     0,    10,     0,     7,    10,     0,    19,     0,
      19,    18,     0,    21,     0,    23,    26,     0,    26,     0,
      21,     0,     7,    21,     0,    23,     9,    22,    26,     0,
      24,     0,    24,    22,     0,    11,     0,     8,    11,     0,
      11,     0,     3,    26,     0,     4,     0,    12,     0,    13,
       0
    ];

    // (yyprhs[n]) - Index in yyrhs of the first RHS symbol of rule n.
    // Not generated anymore in Bison > 2014
    YY.table_dict.right_hand_side_index = [
       0,     0,     2,     5,     7,     9,    11,    13,    16,    23,
      25,    28,    30,    33,    35,    38,    40,    42,    45,    50,
      52,    55,    57,    60,    62,    65,    67,    69
    ];
    
    // (yyrline[n]) - Line # in .y grammar source file where rule n is defined.
    YY.table_dict.rule_line_pointer = [
       0,    55,    55,    57,    57,    57,    57,    58,    63,    65,
      70,    76,    76,    78,    82,    86,    88,    92,    97,    99,
      99,   101,   105,   111,   116,   120,   125,   125
    ];
  }

  //if (YY.debug || YY.verbose) {
  // (yytname[n]) - A string specifying the symbol for symbol number n. 
  // ~ yytoknum[n] - Token number of token n (String name of token TOKEN_NUM)
  YY.table_dict.token_number_of_token = [
    "$", "error", "$undefined.", "CTRL_ASSIGN", "CTRL_IGNORE", "OPEN", 
    "CLOSE", "REVERSE", "STARTCLASS", "LET", "TAG", "SYMBOL", "REMARK", 
    "NL", "src", "statement", "block", "tag", "members", "member", "single", 
    "define", "bodies", "head", "body", "contol", "remark", 0  
  ];
  //}

  // ----------------------------- PARSE ---------------------------------------

  // #line 315 "/usr/share/bison/bison.simple"
  // The user can define parse_param_dict as name of an argument to be passed
  // into parse. It should actually point to an object. Grammar actions can 
  // access the variable by casting it to the proper pointer type.
  // https://en.wikipedia.org/wiki/Liskov_substitution_principle
  
  YY.parse = function (my_parse_param_dict) {
    var context = this,
      s;

    // If reentrant, generate the variables locally (set on this)
    if (YY.pure) {
      context.scope = s = context;
    
    // If nonreentrant, generate the variables and stacks here.
    } else {
      context.scope = s = YY;
    }

    // (yychar) - Lookahead symbol
    s.char;

    // (yylval) - Semantic value of lookahead symbol => lval = rval => key
    s.lval;

    // (yynerrs) - Error count
    s.error_count;

    // (yylloc) - Location data for the lookahead symbol. CAREFUL: not yyloc!
    if (YY.lsp_needed) {
      s.lloc;
    }

    // (yyresult) What eventually will be returned    
    s.result;

    // (yystate) Flex uses as alias for YY_START (that's used by AT&T lex) :)
    s.current_state;

    // (yyerrstatus) Number of tokens to shift before error messages enabled.
    s.shift_token_error_message_threshold;

    // (yychar1) Lookahead token as an internal (translated) token number.
    s.lookahead_token_number = 0;

    // (yyn) An all purpose variable! May represent state, rule or ... truc 
    s.truc;
    
    // (yyval) Variable used to return result of semantic evaluation 
    // from action routine, let's call that eval :)
    s.ival;
    
    // (yylen) When reducing, the number of symbols on the RHS (right hand 
    // side) of the reduced rule (length of RHS of a rule).
    s.right_hand_side_length;

    // (yyloc) Variable used to return result of location evaluation 
    // from action routine, loco. 
    if (YY.lsp_needed) {
      s.loco;
    }

    setParserStackList(s.scope, YY.stack_initial_depth, true);

    // Ok done declaring variables. Set the ball rolling!
    console.log("Starting parse.");

    // Initial state
    s.current_state = 0;
    s.shift_token_error_message_threshold = 0;
    s.errorcount = 0;

    // Cause a token to be read.
    YY.char = YY.empty;

    // Initialize stack pointers.
    // Waste one element of value and location stack so that they stay on the 
    // same level as the state stack. The wasted elements are never initialized.

    // yyssp = yyss; Top = bottom for state stack
    s.state_view.setInt8(s.state_bottom, "");
    s.state_top = s.state_bottom;

    // yyvsp = yyvs; Top = bottom for semantic stack
    s.semantic_view.setInt8(s.semantic_bottom, "");
    s.semantic_top = s.semantic_bottom;

    // yylsp = yyls; Top = bottom for location stack
    if (YY.lsp_needed) {
      s.location_view.setInt8(s.semantic_bottom, "");
      s.location_top = s.location_bottom;
    }

    // --------------------------------------------------------------
    // unused -- XXX remove
    // --------------------------------------------------------------
    // (yyerrok) - not used
    context.errorAccept = function () {
      s.shift_token_error_message_threshold = 0;
    };

    // (yyclearin)
    context.clearChar = function () {
      YY.char = YY.empty;
    };

    // (YYFAIL) - from transition of new meaning of YYERROR when moving from
    // GCC v2 from v1, remove this
    context.fail = function () {
      console.log("FAILING")
      context.errorLab();
    };

    // (YYRECOVERING)
    context.recover = function () {
      return !!s.shift_token_error_message_threshold;
    };

    // (YYBACKUP)
    context.oldBackup = function (my_token, my_value) {
      if (YY.char === YY.empty && s.right_hand_side_length === 1) {
        YY.char = my_token;
        s.lval = my_value;
        s.lookahead_token_number = YY.translate(YY.char);
        my_context.popStack();
        context.backup();
      } else {
        YY.error("Syntax error: Cannot back up.");
        context.errorLabExtended();
      }
    };

    //---------------------------------------------------------------
    // overflow -- flag error and "fall through" meaning ?
    //---------------------------------------------------------------
    context.overflowLab = function() {
      console.log("error: parser stack overflow");
      context.result = 2;
      throw new Error("Falling through...");
    };

    //----------------------------------
    // abortlab -- end too soon
    //----------------------------------
    context.abortLab = function() {
      context.result = 1;
      console.log("RESULINTG")
      context.returnResult();
    };

    //------------------------------------
    // yyacceptlab -- YYACCEPT comes here.
    //------------------------------------
    context.acceptLab = function () {
      context.result = 0;
      context.returnResult();
    };

    //-------------------------------------
    // errorLab -- here on detecting error
    // ------------------------------------
    context.errorLab = function () {
      var s = context.scope,
        message,
        count,
        len,
        i;

      // Start i at -truc if negative, avoid negative indexes in YYCHECK
      function setCounter(my_truc) {
        if (my_truc < 0) {
          return -s.truc;
        }
        return 0;
      }
      
      function listLen(my_list) {
        var str = "",
          i,
          len;
        for (i = 0, len = my_list.length; i < len; i += 1) {
          str += my_list[i];
        }
        return str.length;
      }

      // If not already recovering from an error, report this error.
      if (s.shift_token_error_message_threshold === undefined) {
        s.error_count += 1;

        if (YY.error_verbose) {
          s.truc = YY.table_dict.set_state_action[s.current_state];
          if (truc > YY.flag && truc > YY.last) {
            count = 0;

            // sizeof(YY.table_dict.token_number_of_token)/YY.char_pointer_size
            len = Math.ceil(
              listLen(YY.table_dict.token_number_of_token)/YY.char_pointer_size
            );

            for (i = setCounter(Y.truc); i < len; i += 1) {
              if (YY.table_dict.state_action_valid[i + s.truc] === i) {
                count += 1;
              }
            }
            message = "parse error, unexpected " +
              YY.table_dict.token_number_of_token[YY.translate(s.char)];
            if (count < 5) {
              count = 0;
              for (i = setCounter(Y.truc); i < len; i += 1) {
                if (YY.table_dict.state_action_valid[i + s.truc] === i) {
                  if (count === 0) {
                    message += "expecting ";
                  } else {
                    message += " or ";
                  }
                  message += YY.table_dict.token_number_of_token[i];
                  count += 1;
                }
              }
            }
            YY.error(message);
          }
        } else {
          YY.error("parse error", s.error_count);
        }
      }
      context.errorLabExtended();
    };

    //----------------------------------------------------
    // errorLabExtended -- error raised explicitly by an action
    //----------------------------------------------------
    context.errorLabExtended = function () {
      var s = context.scope;

      // If just tried and failed to reuse lookahead token after error, discard
      if (s.shift_token_error_message_threshold === 3) {
        if (s.char == YY.end_of_file_reached) {
          context.abortLab();
        }
        
        // return failure if at the end of input
        console.log("[info] Discarding token " + s.char + " (" + 
          YY.table_dict.token_number_of_token[s.lookahead_token_number] + ").");
        s.char = YY.empty;
      }
  
      // Else will try to reuse lookahead token after shifting the error token.
      // Each real token shifted decrements this
      s.shift_token_error_message_threshold = 3;
      context.errorHandle();
    };
    
    //--------------------------------------------------------------------------
    // errorDefault - current state does not do anything special for error token                                     |
    //--------------------------------------------------------------------------
    context.errorDefault = function () {
      //if (0) {
      //  // This is wrong; only states that explicitly want error tokens
      //  // should shift them.
      //  truc = YY.table_dict.default_reduction_rule[s.current_state];
      //  if (truc) {
      //   yydefault();
      //  }
      //}
      return;
    };

    //--------------------------------------------------------------------------
    // errorPop -- pop current state because it cannot handle the error token                                   |
    //--------------------------------------------------------------------------
    context.errorPop = function () {
      var s = context.scope,
        temp_state_top;
      if (s.state_top === s.state_bottom) {
        context.abortLab();
      }
      s.semantic_top = s.semantic_top - 1;

      // XXX *--yyssp?
      s.current_state = s.state_top - 1;
      if (YY.lsp_needed) {
        s.location_top = s.location_top - 1;
      }
      
      if (YY.debug) {
       temp_state_bottom = s.state_bottom - 1;
       console.log("[error] state stack now");
       while (temp_state_bottom !== s.state_top) {
         console.log("[error]" + temp_state_bottom);
         temp_state_bottom += 1;
       }
      }
    };

    //----------------------------------------------------
    // errorHandle 
    //----------------------------------------------------
    context.errorHandle = function () {
      var s = context.scope;

      s.truc = YY.table_dict.set_state_action[s.current_state];
      if (s.truc === YY.flag) {
        context.errorDefault();
      }

      s.truc = s.truc + YY.terror;
      if (s.truc < 0 || s.truc > YY.last ||
        YY.table_dict.state_action_valid[s.truc] !== YY.terror) {
        context.errorDefault();
      }
      s.truc = YY.table_dict.state_action[s.truc];
      if (s.truc < 0) {
        if (s.truc == YY.flag) {
          context.errorPop();
        }
        s.truc = -s.truc;
        context.reduceState();
      } else if (s.truc === 0) {
        context.errorPop();
      }
      if (s.truc == YY.final) {
        context.acceptLab();
      }

      console.log("[info] - Shifting error token.");
      console.log(s)
      console.log(s.truc)
      console.log(s.lval)
      console.log(s.loco)
      
      // XXX ? set new entries as top of the stack
      s.semantic_view[s.semantic_top] = s.lval; // yylval
      if (YY.lsp_needed) {
        s.location_view[s.semantic_top] = s.loco; // yyloc;
      }
      s.current_state = s.truc;
      context.newState();
    };

    //--------------------------------------------
    // return -- done
    //--------------------------------------------
    context.returnResult = function() {
      if (YY.overflow === undefined) {
        YY.purge("state", context.scope);
        YY.purge("semantic", context.scope);
        if (YY.lsp_needed) {
          YY.purge("location", context.scope);
        }
      }
      return context.result;
    };

    //--------------------------------------------------------------------------
    // defaultAction -- do the default reduction (action) for the current state.
    //--------------------------------------------------------------------------
    context.defaultAction = function () {
      s.truc = YY.table_dict.default_reduction_rule[s.current_state];
      if (s.truc === 0) {
        context.errorLab();
      }
      context.reduceState();
    };
    
    //------------------------------------------------------------
    // newState -- Push a new state, which is found in current_state.
    //------------------------------------------------------------
    context.newState = function () {
      
      // In all cases, when you get here, the value and location stacks
      // have just been pushed. so pushing a state here evens the stacks.
      context.scope.state_top = context.state_top + 1;
    };

    //------------------------------------------------------------
    // setstate -- set a new state
    //------------------------------------------------------------
    context.setState = function () {
      var s = context.scope,
        overflow_info_list,
        current_stack_size,
        copy_state_view,
        copy_semantic_view,
        copy_location_view;

      s.state_top = s.current_state;

      // Introduce a pile of code for handlinge memory overflow
      if (s.state_top >= s.state_bottom + s.stack_size - 1) {

        // Get the current used size of the three stacks, in elements.
        current_stack_size = s.state_top - s.state_bottom + 1;
        if (YY.overflow !== undefined) {

          // Give user a chance to reallocate the stack. Use copies of
          // these so that the &'s don't force the real ones into memory.
          copy_state_view = s.state_view;           // yyss1 = yyss
          copy_semantic_view = s.semantic_view;     // yyvs1 = yyvs

          // Each stack pointer address is followed by the size of the
          // data in use in that stack, in bytes.
          s.state_bottom = copy_state_view;         // yyss = yyss1
          s.semantic_bottom = copy_semantic_view;   // yyvs = yyvs1;

          if (YY.lsp_needed) {
            copy_location_view = s.location_view;   // yyls1 = yyls;
            s.location_bottom = copy_location_view; //yyls = yyls1;
          }

          overflow_info_list = [];
          overflow_info_list.push("parser stack overflow");
          
          // &yyss1, yysize * sizeof (*yyssp) => &we don't have address
          overflow_info_list.push("no &adress, " + current_stack_size *
            s.semantic_view.getInt8(s.semantic_stack_top).byteLength);
          overflow_info_list.push("no &adress, " + current_stack_size *
            s.state_view.getInt8(s.state_stack).byteLength);
          if (YY.lsp_needed) {
            overflow_info_list.push("no &address, " + current_stack_size *
              s.location_view.getInt8(s.location_stack).byteLength);
          }
          overflow_info_list.push(s.stack_size);
          
          // rrring!
          YY.overflow.apply(YY, overflow_info_list);
        } else {

          if (relocateStack === undefined) {
            context.overflowLab();
           } else {
      
            // Extend the stack our own way.

            // honor or succumb to max_depth
            if (s.stack_size >= YY.stack_list_max_depth) {
              context.overflowLab();
            }
            s.stack_size = s.stack_size * 2;
            if (s.stack_size > YY.stack_list_max_depth) {
              s.stack_size = YY.stack_list_max_depth;
            }
            
            // we don't really need alloc(getStackTotalBytes(s.stack_size))...
            // we just copy the old arrays into new ones with the larger stack 
            // size. This replaces calls to YYSTACK_RELOCATE and YYSTACK_FREE.
            setParserStackList(context.scope, s.stack_size);
          }
        }

        s.state_top = s.state_bottom + current_stack_size - 1;
        s.semantic_top = s.semantic_bottom + current_stack_size - 1;
        if (YY.lsp_needed) {
         s.location_top = s.location_bottom + current_stack_size - 1;
        }
        console.log("Stack size increased to " + s.stack_size);

        if (s.state_top >= s.state_bottom + s.stack_size - 1) {
         s.abortLab();
        }
      }

      console.log("Entering state: " + s.current_state);
      s.backup();
    };

    //------------------------------------------------------------
    // backup --  the main parsing code starts here
    //------------------------------------------------------------
    context.backup = function () {
      var s = context.scope;

      // Do appropriate processing given the current state. Read a lookahead 
      // token if we need one and don't already have one.

      // First try to decide what to do without reference to lookahead token.
      // Refer to what yypact is saying about the current state
      s.truc = YY.table_dict.set_state_action[s.current_state];
      if (s.truc == YY.flag) {
        context.defaultAction();
      }

      // Not known => get a lookahead token if don't already have one.

      // YY.char  is either YY.empty or YY.end_of_file_reached or a valid token 
      // in external form. Note, lexer will also set YY.lval(!)
      if (YY.char == YY.empty) {
        console.log("[info] - Reading a token: ");
        YY.lexer(YY.ival, YY.loco, "YYLEX_PARAM");
        console.log("XXX CHAR =", YY.char);
        console.log("XXX LVAL =", YY.lval);
      }

      // Convert token to internal form (in s.lookahead_token_number) for 
      // indexing tables with

      // This is the end of the input.
      if (YY.char <= 0) {
        s.lookahead_token_number = 0;

        // Don't call YYLEX any more.
        YY.char = YY.end_of_file_reached;
        console.log("[info] - Now at end of input.");
      } else {
        s.lookahead_token_number = YY.translate(YY.char);

        if (YY.debug) {
          console.log("[info] - Next token is " + YY.char + " (" +
            YY.table_dict.token_number_of_token[s.lookahead_token_number]);

          // Give the individual parser a way to print the precise meaning 
          // of a token, for further debugging info.
          console.log("[info] " + YY.char + " " + YY.lval);
        }
      }

      // add character to s.truc. ah, math...
      s.truc += s.lookahead_token_number;
      if (s.truc < 0 || s.truc > YY.last || YY.table_dict.state_action_valid[s.truc] !== s.lookahead_token_number) {
        context.defaultAction();
      }
      s.truc = YY.table_dict.state_action[s.truc];

      // s.truc can be rule or state, now it is what to do for this token type 
      // in this current state.
      //  Negative => reduce, -s.truc is rule number.
      //  Positive => shift, s.truc is new state.
      //  if new state is final state => don't bother shift, just return success
      //  if 0 or most negative number => error.
      if (s.truc < 0) {
         if (s.truc == YY.flag) {
          context.errorLab();
         }
         s.truc = -s.truc;
         context.reduceState();
      } else if (s.truc === 0) {
        context.errorLab();
      }

      if (s.truc === YY.final) {
        context.acceptLab();
      }

      // Shift the lookahead token.
      if (YY.verbose) {
        console.log("[info] - Shifting token " + YY.char + " (" + YY.table_dict.token_number_of_token[s.lookahead_token_number] + ")");
      }

      // Discard the token being shifted unless it is eof.
      if (YY.char !== YY.end_of_file_reached) {
        YY.char = YY.empty;
      }
      s.semantic_view.setInt8(s.semantic_top, s.lval);
      if (YY.lsp_needed) {
        s.location_view.setInt8(s.location_top, s.lloc);
      }

      // Count tokens shifted since error; after three, turn off error status.
      if (s.shift_token_error_message_threshold) {
        s.shift_token_error_message_threshold--;
      }
      s.current_state = s.truc;
      context.newState();
    };

    //----------------------------------------------------------
    // reduceState -- Do a reduction.
    //----------------------------------------------------------
    context.reduceState = function () {
      var i,
        tmp_semantic_top;

      // truc is the number of a rule to reduce with.
      s.right_hand_side_length =
        YY.table_dict.rule_right_hand_side_symbol_length[s.truc];

      // If YYLEN (s.right_hand_side_length) is nonzero, implement the default 
      // value of the action:
      // $$ = $1
      // Otherwise, the following line sets YYVAL to the semantic value of
      // the lookahead token.  This behavior is undocumented and Bison
      // users should not rely upon it.  Assigning to YYVAL
      // unconditionally makes the parser a bit smaller, and it avoids a
      // GCC warning that YYVAL may be used uninitialized.
      s.ival = s.semantic_view.getInt8(1 - s.right_hand_side_length);

      if (YY.lsp_needed) {

        // Similarly for the default location.  Let the user run additional
        // commands if for instance locations are ranges.
        s.loco = s.location_view.getInt8(1 - s.right_hand_side_length);
        YY.loco_default(
          s.loco,
          (s.location_top - s.right_hand_side_length),
          s.right_hand_side_length
        );   
      }

      if (YY.debug) {
        console.log(
          "[info] - Reducing via rule " + s.truc + " (line " +
            YY.table_dict.rule_line_pointer[s.truc] + ")"
        );

        // Print the symbols being reduced, and their result.
        for (i = YY.table_dict.right_hand_side_index[s.truc]; YY.table_dict.right_hand_side[i] > 0; i++) {
          console.log("[info] " + YY.table_dict.token_number_of_token[YY.table_dict.right_hand_side[i]] + " ");
        }
        console.log("[info] ->" + YY.table_dict.token_number_of_token[YY.table_dict.rule_left_hand_side_symbol_number[s.truc]]);
      }
  
    switch (s.truc) {
      case 7: //#line 59 "gram.y"
        context.errorAccept();
        break;
      case 9: //#line 66 "gram.y"
        YY.custom_dict.block_reservse_switch = 0;
        if (YY.custom_dict.is_mode_assign_accept) {
         
          // it should be from top, but I guess it's view
          outputHeader(s.semantic_view.getInt8(0));
        }
        break;
      case 10: //#line 71 "gram.y"
        YY.custom_dict.block_reservse_switch = 1;
        if (YY.custom_dict.is_mode_assign_accept === 0) {
          outputHeader(s.semantic_view.getInt8(0));
        }
       break;
      case 13: //#line 79 "gram.y"
        YY.custom_dict.appendNonTerminalSymbol(
          YY.custom_dict.head_name,
          YY.custom_dict.is_mode_assign_accept ^ YY.custom_dict.block_reservse_switch
        );
        break;
      case 14: //#line 83 "gram.y"
        YY.custom_dict.enterNonTerminalSymbol(
          YY.custom_dict.head_name,
          null,
          YY.custom_dict.is_mode_assign_accept ^ YY.custom_dict.block_reservse_switch,
          0,
          1,
          0
        );
        break;
      case 16: //#line 89 "gram.y"
        YY.custom_dict.appendNonTerminalSymbol(
          YY.custom_dict.head_name,
          YY.custom_dict.is_mode_assign_accept
        );
        break;
      case 17: //#line 93 "gram.y"
        YY.custom_dict.appendNonTerminalSymbol(
          YY.custom_dict.head_name,
          !YY.custom_dict.is_mode_assign_accept
        );
        break;
      case 21: //#line 102 "gram.y"
        // XXX strcpy(YY.custom_dict.head_name, yyvsp[0]);
        YY.custom_dict.head_name += s.semantic_view.getInt8(context.semantic_top);
        break;
      case 22: //#line 106 "gram.y"
        YY.custom_dict.start_flag = 1;
        YY.custom_dict.head_name += s.semantic_view.getInt8(context.semantic_top);
        break;
      case 23: //#line 112 "gram.y"
        // XXX ? what is BodyName strcpy(BodyName[YY.custom_dict.body_count++], yyvsp[0]);
        YY.custom_dict.body_count = YY.custom_dict.body_count + 1;
        YY.custom_dict.body_buffer_list.setInt8(YY.custom_dict.body_count, s.semantic_view.getInt8(context.semantic_top));
        break;
      case 24: //#line 117 "gram.y"
        YY.custom_dict.is_mode_assign_accept = 1;
        break;
      case 25: //#line 121 "gram.y"
        YY.custom_dict.is_mode_assign_accept = 0;
        break;
      }
  
      //#line 705 "/usr/share/bison/bison.simple"
      s.semantic_top -= s.right_hand_side_length;
      s.state_top -= s.right_hand_side_length;
      if (YY.lsp_needed) {
        s.location_top -= s.right_hand_side_length;   
      }

    if (YY.debug) {
       tmp_semantic_top = s.semantic_bottom - 1;
       console.log("[info] - State stack now");
       while (tmp_semantic_top != s.semantic_top) {
        console.log("[info] -", " " + s.semantic_view.getInt8(tmp_semantic_top));
        tmp_semantic_top++;
       }
    }

    // XXX *++yyvsp => *p = arr, *(++p) => arr[0] = 10, arr[1] = 20, *p = 20
    // XXX *++yylsp = yyval
    s.semantic_top = s.semantic_top + 1;
    s.semantic_view.setInt8(s.semantic_top, s.ival);
    if (YY.lsp_needed) {
      s.location_top = s.location_top + 1;
      s.location_view.setInt8(s.location-top, s.loco);
    }
  
    // Now `shift' the result of the reduction.  Determine what state
    // that goes to, based on the state we popped back to and the rule
    // number reduced by.
  
    s.truc = YY.table_dict.rule_left_hand_side_symbol_number[s.truc];
    s.current_state = YY.table_dict.non_terminal_goto_method[s.truc - YY.nt_base] + s.state_top;
    if (s.current_state >= 0 && s.current_state <= YY.last && YY.table_dict.state_action_valid[s.current_state] === s.semantic_top) {
      s.current_state = YY.table_dict.state_action[s.current_state];
    } else {
      s.current_state = YY.table_dict.default_goto_method[truc - YY.nt_base];
    }
    context.newState();
   };

    //context.state_view      //yyssa
    //context.state_top       //yyssp
    //context.state_bottom    //yyss
    //context.semantic_view   //yyvsa
    //context.semantic_top    //yyvsp
    //context.semantic_bottom //yyvs
    //context.location_view   //yylsa
    //context.location_top    //yylsp
    //context.location_bottom //yyls
    //context.eval            //yyval
    //context.loco            //yyloc
    //context.right_hand_side_length; //ylen

    // Here! we go
    context.setState();
  };

  window.YY = YY;

}(window, Math));

