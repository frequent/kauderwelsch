(function (window) {
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

  // ------------------------------ setup --------------------------------------

  // one YY to yyuck them all
  var YY = {};

  // https://en.wikipedia.org/wiki/Liskov_substitution_principle
  // depending on whether we use a pure parser, context is YY (global) or parse
  // (local)
  function setNonLspVariableListForParse(my_context) {

    // lookahead symbol
    my_context.char;

    // semantic value of lookahead symbol => lval = rval => key
    my_context.lval;

    // error count (my_context.error_count)
    my_context.error_count;

    // location data for the lookahead symbol.
    if (YY.lsp_needed) {
      my_context.lloc;
    }
  }
  
  // Stack is an area of memory that holds all local variables and parameters 
  // used by any function, and remembers the order in which functions are called
  // so that function returns occur correctly.
  // Refer to the stacks through separate pointers to allow overflow to
  // reallocate them elsewhere.
  // using ArrayBuffer http://www.javascripture.com/ArrayBuffer
  
  // var baffer = new ArrayBuffer(200);
  // var bafferView = new DataView(baffer);
  // bafferView.setInt8(0, 15)
  // bafferView.setInt8(100, 12)
  // bafferView.setInt8(150, 11)
  // bafferView.setInt8(199, 10)
  // console.log(bafferView.getInt8(0).toString(8)); 
  // console.log(bafferView.getInt8(100).toString(8)); 
  // console.log(bafferView.getInt8(150).toString(8));
  // console.log(bafferView.getInt8(199).toString(8)); 

  function setParserStackList(my_context) {

    // The state stack: Does not shift symbols on to the stack. 
    // Only a stack of states is maintained.
    my_context.state_stack = new ArrayBuffer(YY.stack_initial_depth);

    // (yyss) 
    my_context.state_view = new DataView(my_context.state_stack);

    // (yyssa)
    my_context.state_bottom = 0;

    // (yyssp)
    my_context.state_top = 199;

    // This semantic stack: Grows parallel to the state stack. At 
    // each reduction, semantic values are popped off this stack and the 
    // semantic action is executed.
    my_context.semantic_stack = new ArrayBuffer(YY.stack_initial_depth);

    // (yyvs) 
    my_context.semantic_view = new DataView(my_context.semantic_stack);

    // (yyvsa)
    my_context.semantic_bottom = 0;

    // (yyvsp)
    my_context.semantic_top = 199;

    // The location stack: only used when lsp_needed is set and I'm 
    // not sure at this moment how it behaves.
    if (YY.lsp_needed) {
      my_context.location_stack = new ArrayBuffer(YY.stack_initial_depth);
      
      // (yyls)
      my_context.location_view = new DataView(my_context.location_stack);

      // (yylsa)
      my_context.location_bottom = 0;

      // (yylsp)
      my_context.location_top = 199;
    }

    // (YYPOPSTACK)
    my_context.popStack = function (n) {
      my_context.semantic_top = my_context.semantic_top - n || 1;
      my_context.state_top = my_context.state_top - n || 1;
      if (YY.lsp_needed) {
        my_context.location_top = my_context.location_top - n || 1;
      }
    };

    my_context.stack_size = YY.stack_initial_depth;  
  }

  // Identify Bison output.
  YY.bison = 1;

  // Hardcoded now. Pure parser = reeentrant = can be called during modification
  // https://www.gnu.org/software/bison/manual/html_node/Pure-Decl.html
  YY.pure = 0;

  // Use locations, from: https://fbb-git.github.io/bisoncpp/bisonc++api.html
  // LTYPE__ d_loc__ The location type value associated with a terminal token.
  // It can be used by, e.g., lexical scanners to pass location information
  // of a matched token to the parser in parallel with a returned token.
  // It is available only when %lsp-needed, %ltype or %locationstruct is set.

  // Bonus: http://acronymsmeanings.com/full-meaning-of/yylsp/
  YY.lsp_needed = 0;

  // (YYINITDEPTH) Initial size of the parser's stacks.
  YY.stack_initial_depth = 200;

  // (YY.empty)
  YY.empty = -2;
  
  // Lookahead token? or symbol
  YY.char;

  // If nonreentrant, generate the variables and stacks here.
  if (!YY.pure) {
   setNonLspVariableListForParse(YY);
   setParserStackList(YY);
  }

  // #line 315 "/usr/share/bison/bison.simple"
  // The user can define parse_param_dict as the name of an argument to be passed
  // into parse. It should actually point to an object. Grammar actions can 
  // access the variable by casting it to the proper pointer type.
  
  YY.parse = function (my_parse_param_dict) {
    var context = this;
    
    // (yystate) Flex uses as alias for YY_START (that's used by AT&T lex) :)
    context.current_state;

    // (yyerrstatus) Number of tokens to shift before error messages enabled.
    context.shift_token_error_message_threshold;

    // (yychar1) Lookahead token as an internal (translated) token number.
    context.lookahead_token_number = 0;

    // (yyn) An all purpose variable! May represent state, rule or ... truc 
    context.truc;
    
    // (yyval) Variable used to return result of semantic evaluation 
    // from action routine, let's call that eval :)
    context.eval;
    
    // (yylen) When reducing, the number of symbols on the RHS (right hand 
    // side) of the reduced rule (length of RHS of a rule).
    context.right_hand_side_length;

    // (yyloc) Variable used to return result of location evaluation 
    // from action routine, loco. 
    if (YY.lsp_needed) {
      context.loco;
    }

    // If reentrant, generate the variables locally (set on this)
    if (YY.pure) {
      setNonLspVariableListForParse(context);
      setParserStackList(context);
    }

    // Ok done declaring variables. Set the ball rolling!
    // XXX find way to output this
    console.log("Starting parse.");

    // Initial state
    current_state = 0;

    shift_token_error_message_threshold = 0;

    if (YY.pure) {
      context.error_count = 0;
    } else {
      YY.error_count = 0;
    }

    // Cause a token to be read.
    YY.char = YY.empty;
    
    

    //context.state_view      //yyss
    //context.state_top       //yyssp
    //context.state_bottom    //yyssa
    //context.semantic_view   //yyvs
    //context.semantic_top    //yyvsp
    //context.semantic_bottom //yyvsa
    //context.location_view   //yyls
    //context.location_top    //yylsp
    //context.location_bottom //yylsa
    //context.eval            //yyval
    //context.loco            //yyloc
    //context.right_hand_side_length; //ylen


   // Initialize stack pointers.
   // Waste one element of value and location stack
   // so that they stay on the same level as the state stack.
   // The wasted elements are never initialized.
   yyssp = yyss;
   yyvsp = yyvs;
   if (YY.lsp_needed) {
    yylsp = yyls;
   }
   yysetstate();

   //------------------------------------------------------------
   // yynewstate -- Push a new state, which is found in current_state.
   //------------------------------------------------------------
   function yynewstate() {
      
    // In all cases, when you get here, the value and location stacks
    // have just been pushed. so pushing a state here evens the stacks.
    yyssp++;
   }
  
   //------------------------------------------------------------
   // yysetstate -- Set a new state
   //------------------------------------------------------------
   function yysetState() {
    yyssp = current_state;
  
    if (yyssp >= yyss + yystacksize - 1) {
      
      // Get the current used size of the three stacks, in elements.
      yysize = yyssp - yyss + 1;
      
      if (yyoverflow) {
  
       // Give user a chance to reallocate the stack. Use copies of
       // these so that the &'s don't force the real ones into memory.
       yyvs1 = yyvs;
       yyss1 = yyss;
  
       // Each stack pointer address is followed by the size of the
       // data in use in that stack, in bytes.
       if (YY.lsp_needed) {
        yyls1 = yyls;
  
        // This used to be a conditional around just the two extra args,
        // but that might be undefined if yyoverflow is a macro.
        yyoverflow(
          "parser stack overflow",
          (yyss1, yysize * allocator.sizeof(yyssp)),
          (yyvs1, yysize * allocator.sizeof(yyvsp)),
          (yyls1, yysize * allocator.sizeof(yylsp)),
          yystacksize
        );
        yyls = yyls1;
       } else {
        yyoverflow(
          "parser stack overflow",
          (yyss1, yysize * allocator.sizeof(yyssp)),
          (yyvs1, yysize * allocator.sizeof(yyvsp)),
          yystacksize
        );
       }
       yyss = yyss1;
       yyvs = yyvs1;
      } else {
  
       if (YYSTACK_RELOCATE === undefined) {
        yyoverflowlab();
       } else {
  
        // Extend the stack our own way.
        if (yystacksize >= YYMAXDEPTH) {
          yyoverflowlab();
        }
  
        // XXX https://www.tutorialspoint.com/cprogramming/c_operators.htm
        yystacksize = yystacksize * 2;
        if (yystacksize > YYMAXDEPTH) {
          yystacksize = YYMAXDEPTH;
        }
        
        // XXX not sure this is supposed to be outside the if
        // and the below also escape comprehension at this point
        yyss1 = yyss;
        yyalloc[yyptr] = YYSTACK_ALLOC(YYSTACK_BYTES(yystacksize));
        if (!yyptr) {
          yyoverflowlab();
        }
        YYSTACK_RELOCATE(yyss);
        YYSTACK_RELOCATE(yyvs);
        if (YY.lsp_needed) {
          YYSTACK_RELOCATE(yyls);
        }
        // #undef
        YYSTACK_RELOCATE = null;
        if (yyss1 != yyssa) {
          YYSTACK_FREE(yyss1);
        }
       }
      }
   
      yyssp = yyss + yysize - 1;
      yyvsp = yyvs + yysize - 1;
      if (YY.lsp_needed) {
       yylsp = yyls + yysize - 1;
      }
  
      YYDPRINTF("info", "Stack size increased to " + yystacksize + "\n");
  
      if (yyssp >= yyss + yystacksize - 1) {
       YYABORT();
      }
    }
  
    YYDPRINTF("info", "Entering state " + current_state + "\n");
    yybackup();
   }
  
   //-----------
   // yybackup.
   //-----------
   function yybackup() {
      
    // Do appropriate processing given the current state.
    // Read a lookahead token if we need one and don't already have one.
    // yyresume:
   
    // First try to decide what to do without reference to lookahead token.
    truc = yypact[current_state];
    if (truc == YYFLAG) {
      yydefault();
    }
   
    // Not known => get a lookahead token if don't already have one.
   
    // yychar is either YY.empty or YYEOF or a valid token in external form.
    if (yychar == YY.empty) {
      YYDPRINTF("info", "Reading a token: ");
      yychar = YYLEX();
    }
   
    // Convert token to internal form (in lookahead_token_number) for indexing tables with 
    if (yychar <= 0) {	// This means end of input.
      lookahead_token_number = 0;
      yychar = YYEOF;		// Don't call YYLEX any more.
      YYDPRINTF("info", "Now at end of input.\n");
    } else {
      lookahead_token_number = YYTRANSLATE(yychar);
   
      if (YYDEBUG) {
      
       // We have to keep this `#if YYDEBUG', since we use variables
       // which are defined only if `YYDEBUG' is set.  */
       if (yydebug) {
        YYDPRINTF("info", "Next token is " + yychar + " (" + yytname[lookahead_token_number]);
       
        // Give the individual parser a way to print the precise meaning 
        // of a token, for further debugging info.
        if (YYPRINT) {
          YYPRINT("info", yychar, yylval);
        }
        YYDPRINTF("info", ")\n");
       }
      }
    }
   
    // XXX add character to truc
    truc += lookahead_token_number;
    if (truc < 0 || truc > YYLAST || yycheck[truc] !== lookahead_token_number) {
      yydefault();
    }
    truc = yytable[truc];
   
    // truc is what to do for this token type in this state.
    //  Negative => reduce, -truc is rule number.
    //  Positive => shift, truc is new state.
    //    New state is final state => don't bother to shift, just return success.
    //  0, or most negative number => error.
   
    if (truc < 0) {
       if (truc == YYFLAG) {
        yyerrlab();
       }
       truc = -truc;
       yyreduce();
    } else if (truc === 0) {
      yyerrlab();
    }
   
    if (truc == YYFINAL) {
      YYACCEPT();
    }
   
    // Shift the lookahead token.
    YYDPRINTF("info", "Shifting token " + yychar + " (" + yytname[lookahead_token_number] + ")");
   
    // Discard the token being shifted unless it is eof.
    if (yychar != YYEOF) {
      yychar = YY.empty;
    }
    yyvsp[yyvsp.length] = yylval;
    if (YY.lsp_needed) {
      yylsp[yylsp.length] = yylloc;
    }
   
    // Count tokens shifted since error; after three, turn off error status.
    if (shift_token_error_message_threshold) {
      shift_token_error_message_threshold--;
    }
    current_state = truc;
    yynewstate();
   }
  
   //-----------------------------------------------------------
   // yydefault -- do the default action for the current state.
   //-----------------------------------------------------------
   function yydefault() {
    truc = yydefact[current_state];
    if (truc == 0) {
      yyerrlab();
    }
    yyreduce();
   }
  
   //------------------------------
   // yyreduce -- Do a reduction.
   //------------------------------
   function yyreduce() {
    var yyi;
   
    // truc is the number of a rule to reduce with.
    yylen = yyr2[truc];
   
    // If YYLEN is nonzero, implement the default value of the action:
    // `$$ = $1'.
    //
    //  Otherwise, the following line sets YYVAL to the semantic value of
    //  the lookahead token.  This behavior is undocumented and Bison
    //  users should not rely upon it.  Assigning to YYVAL
    //  unconditionally makes the parser a bit smaller, and it avoids a
    //  GCC warning that YYVAL may be used uninitialized.  */
    yyval = yyvsp[1 - yylen];
   
    if (YLSP_NEEDED) {
      
      // Similarly for the default location.  Let the user run additional
      // commands if for instance locations are ranges.
      yyloc = yylsp[1 - yylen];
      YYLLOC_DEFAULT(yyloc, (yylsp - yylen), yylen);   
    }
   
    if (YYDEBUG) {
      
      // We have to keep this `#if YYDEBUG', since we use variables which
      // are defined only if `YYDEBUG' is set.
      if (yydebug) {
       YYDPRINTF("info", "Reducing via rule " + truc + " (line " + yyrline[truc] + ")");
    
       // Print the symbols being reduced, and their result.
       for (yyi = yyprhs[truc]; yyrhs[yyi] > 0; yyi++) {
        YYDPRINTF("info", yytname[yyrhs[yyi]] + " ");
       }
       YYDPRINTF("info", " -> " + yytname[yyr1[truc]] + "\n");
      }
    }
  
    switch (truc) {
      case 7:
       //#line 59 "gram.y"
       yyerrok();
       break;
      case 9:
       //#line 66 "gram.y"
       BlockReverseSw = 0;
       if(ModeAssignAccptFlag) {
        outputHeader(yyvsp[0]);
       }
       break;
      case 10:
       //#line 71 "gram.y"
       BlockReverseSw = 1;
       if(!ModeAssignAccptFlag) {
        outputHeader(yyvsp[0]);
       }
       break;
      case 13:
       //#line 79 "gram.y"
       appendNonTerm(HeadName, ModeAssignAccptFlag ^ BlockReverseSw);
       break;
      case 14:
       //#line 83 "gram.y"
       entryNonTerm(HeadName, NULL, ModeAssignAccptFlag ^ BlockReverseSw, 0, 1, 0 );
       break;
      case 16:
       //#line 89 "gram.y"
       appendNonTerm(HeadName, ModeAssignAccptFlag);
       break;
      case 17:
       //#line 93 "gram.y"
       appendNonTerm(HeadName, !ModeAssignAccptFlag);
       break;
      case 21:
       //#line 102 "gram.y"
       strcpy(HeadName, yyvsp[0]);
       break;
      case 22:
       //#line 106 "gram.y"
       StartFlag = 1;
       strcpy(HeadName, yyvsp[0]);
       break;
      case 23:
       //#line 112 "gram.y"
       strcpy(BodyName[BodyNo++], yyvsp[0]);
       break;
      case 24:
       //#line 117 "gram.y"
       ModeAssignAccptFlag = 1;
       break;
      case 25:
       //#line 121 "gram.y"
       ModeAssignAccptFlag = 0;
       break;
    }
  
    //#line 705 "/usr/share/bison/bison.simple"
    yyvsp -= yylen;
    yyssp -= yylen;
    if (YY.lsp_needed) {
      yylsp -= yylen;   
    }
  
    if (YYDEBUG) {
      if (yydebug) {
       yyssp1 = yyss - 1;
       YYDPRINTF("info", "state stack now");
       while (yyssp1 != yyssp) {
        YYFPRINTF ("error", " " + yyssp1);
        yyssp++;
       }
       YYDPRINTF("info", "\n");
      }
    }
    
    // XXX *++yyvsp => *p = arr, *(++p) => arr[0] = 10, arr[1] = 20, *p = 20
    // XXX *++yylsp = yyval
    yyvsp[yyvsp.length] = yyval;
    if (YY.lsp_needed) {
      yylsp[yylsp.length] = yyloc;
    }
  
    // Now `shift' the result of the reduction.  Determine what state
    // that goes to, based on the state we popped back to and the rule
    // number reduced by.
  
    truc = yyr1[truc];
    current_state = yypgoto[truc - trucTBASE] + yyssp;
    if (current_state >= 0 && current_state <= YYLAST && yycheck[current_state] === yyssp) {
      current_state = yytable[current_state];
    } else {
      current_state = yydefgoto[truc - trucTBASE];
    }
    yynewstate();
   }
  
   //-------------------------------------
   // yyerrlab -- here on detecting error
   // ------------------------------------
   // XXX ojojoj
   function yyerrlab() {
    var yymsg,
      yysize,
      yyx,
      yycount;
   
    // If not already recovering from an error, report this error.
    if (!shift_token_error_message_threshold) {
      my_context.error_count++;
      
      if (YYERROR_VERBOSE) {
       truc = yypact[current_state];
       if (truc > YYFLAG && truc < YYLAST) {
        //YYSIZE_T yysize = 0;
        yysize = 0;
        yycount = 0;
        
        // Start YYX at -truc if negative to avoid negative indexes in YYCHECK.
        // XXX char* pointer to char, but what is char???
        for (yyx = truc < 0 ? -truc : 0; yyx < allocator.sizeof(yytname) / allocator.sizeof(char *)); yyx++) {
          if (yycheck[yyx + truc] == yyx) {
           yysize += yystrlen(yytname[yyx]) + 15, yycount++;
          }
        }
        yysize += yystrlen("parse error, unexpected ") + 1;
        yysize += yystrlen(yytname[YYTRANSLATE(yychar)]);
        yymsg = (char *) YYSTACK_ALLOC (yysize);
        if (yymsg !== 0) {
          yyp = yystpcpy(yymsg, "parse error, unexpected ");
          yyp = yystpcpy(yyp, yytname[YYTRANSLATE (yychar)]);
          if (yycount < 5) {
   	       yycount = 0;
           for (yyx = truc < 0 ? -truc : 0; yyx < (int) (sizeof (yytname) / sizeof (char *)); yyx++) {
   	        if (yycheck[yyx + truc] == yyx) {
          			yyq = !yycount ? ", expecting " : " or ";
          			yyp = yystpcpy (yyp, yyq);
          			yyp = yystpcpy (yyp, yytname[yyx]);
          			yycount++;
   	        }
           } 
   	      }
          yyerror(yymsg);
          YYSTACK_FREE(yymsg);
        } else  {
          yyerror("parse error; also virtual memory exhausted");
        }
       }
      } else { // defined (YYERROR_VERBOSE)
       yyerror("parse error");
      }
    }
    yyerrlab1();
   }
  
   //----------------------------------------------------
   // yyerrlab1 -- error raised explicitly by an action
   //----------------------------------------------------
   function yyerrlab1() {
    
    if (shift_token_error_message_threshold === 3) {
      // If just tried and failed to reuse lookahead token after error, discard
      if (yychar == YYEOF) {
   	   YYABORT;
      }
      
      // return failure if at end of input */
      YYDPRINTF("info", "Discarding token " + yychar + " (" + yytname[lookahead_token_number] + ").\n");
      yychar = YY.empty;
    }
   
    // Else will try to reuse lookahead token after shifting the error token.
    shift_token_error_message_threshold = 3;		// Each real token shifted decrements this
    yyerrhandle();
   }
   
   //----------------------------------------------------------------------------
   // yyerrdefault -- current state does not do anything special for error token.                                     |
   //----------------------------------------------------------------------------
   function yyerrdefault() {
    //if (0) {
    //  // This is wrong; only states that explicitly want error tokens
    //  // should shift them.
    //  truc = yydefact[current_state];
    //  if (truc) {
    //   yydefault();
    //  }
    //}
   }
  
   //----------------------------------------------------------------------------
   // yyerrpop -- pop the current state because it cannot handle the error token                                   |
   //----------------------------------------------------------------------------
   function yyerrpop() {
    if (yyssp === yyss) {
      YYABORT();
    }
    yyvsp = yyvsp - 1;
    current_state = --yyss; // XXX what is *--yyss?
    if (YY.lsp_needed) {
      yylsp = yylsp - 1;
    }
    
    if (YYDEBUG) {
      if (yydebug) {
       yyssp1 = yyss - 1;
       YYDPRINTF("info", "state stack now");
       while (yyssp1 !== yyssp) {
        YYDPRINTF("info", yyssp1[yyssp1.length])
        yyssp1++;
        YYDPRINTF("info", "\n");
       }
      }
    }
   }
  
   //-------------
   // yyerrhandle. 
   //-------------
   function yyerrhandle() {
    truc = yypact[current_state];
  
    if (truc === YYFLAG) {
      yyerrdefault();
    }
    truc = truc + YYTERROR;
    if (truc < 0 || truc > YYLAST || yycheck[truc] !== YYTERROR) {
      yyerrdefault();
    }
    truc = yytable[truc];
    if (truc < 0) {
      if (truc == YYFLAG) {
   	   yyerrpop();
      }
      truc = -truc;
      yyreduce();
    } else if (truc == 0) {
      yyerrpop();
    }
    if (truc == YYFINAL) {
      YYACCEPT();
    }
    YYDPRINTF("info", "Shifting error token.");
    yyvsp[yyvsp.length] = yylval;
    if (YY.lsp_needed) {
      yylsp[yylsp.length] = yyloc;  
    }
  
    current_state = truc;
    yynewstate();
   }
  
   //------------------------------------
   // yyacceptlab -- YYACCEPT comes here.
   //------------------------------------
   function yyacceptlab() {
    result = 0;
    yyreturn();
   }
  
   //----------------------------------
   // yyabortlab -- YYABORT comes here.
   //----------------------------------
   function yyabortlab() {
    result = 1;
    yyreturn();
   }
  
   //--------------------------------------------
   // yyoverflowab -- parser overflow comes here.
   //--------------------------------------------
   function yyoverflowlab() {
    yyerror("parser stack overflow");
    result = 2;
    // fall through
   }
  
   //--------------------------------------------
   // yyreturn .
   //--------------------------------------------
   function yyreturn() {
    if (yyoverflow === undefined) {
      if (yyss !== yyssa) {
       YYSTACK_FREE(yyss);
      }
    }
    return result;
   }
  
  } // end of parse.... SIGH

  // ==========================================================================
  // ==========================================================================
  // ==========================================================================
  // ==========================================================================


  var CTRL_ASSIGN = 257;
  var CTRL_IGNORE = 258;
  var OPEN = 259;
  var CLOSE = 260;
  var REVERSE = 261;
  var STARTCLASS = 262;
  var LET = 263;
  var TAG = 264;
  var SYMBOL = 265;
  var REMARK = 266;
  var NL = 267;
  
  // ------------------------------ mkfa.h -------------------------------------
  var symbol_len = 256;
  var body_class_flag = 0;
  var body_class_flag_max = body_class_flag * 8;

  var body_list = {
   "body": {},
   "next": {}
  };
  var arc = {
   "inp": 0,
   "finite_automaton": {},
   "body_class_flag_start": 0,
   "body_class_flag_accept": 0,
   "next": {}
  };
  var unify_arc = {
   "inp": 0,
   "finite_automaton": {},
   "body_class_flag_start": 0,
   "body_class_flag_accept": 0,
   "next": {},
   "flag_reserved": 0
  };
  var finite_automaton_list = {
   "finite_automation": {},
   "next": {}
  };
  var finite_automaton = {
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

  function createBody() {
   return {
    "name": null,
    "flag_abort": 0,
    "next": {}
   };
  }
  function createBodyClass(my_name) {
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
  }

  // external parameters, should be defined
  CLASS_LIST = null; // Linear list of classes
  CLASS_LIST_TAIL = null; // The last node of the linear list of classes
  START_SYMBOL = null; // Class of start symbol
  FA_LIST = null; // Pointer of start FA in FA network

  // CLASS_LIST;
  // CLASS_LIST_TAIL;
  // current_state_SYMBOL;
  // NO_NEW_LINE;
  // GramFile [1024]
  // HeaderFile [1024]
  // SW_COMPAT_I;
  // SW_QUIET;
  // SW_SEMI_QUIET;
  // VERSION_NUMBER;
  // SYMBOL_LEN => 0;

  var body_class_number = 100;
  var head_name = []; // HEAD_NAME[symbol_len];
  var body_name = []; // BODY_NAME[body_class_number][symbol_len];
  var body_count = 0;
  var class_count = 0;
  var current_class_count = 0;
  var is_assign_accept_flag = 1;
  var is_block_start_or_end = 0;
  var is_block_reversed;
  var body_class_flag_start = 0;
  var error_count = 0;
  var grammar_modification_number = 0;

  // -------------------------- Declarations ----------------------------------

  // whywhy? 
  var YYSTYPE;
  var YYSTYPE_IS_TRIVIAL = 1;
  var YYDEBUG = 0;
  var YYERROR_VERBOSE;
  var YYFINAL = 43;
  var YYFLAG = -32768;
  var trucTBASE = 14;
  var YYLAST = 53;
  
  // memory
  var allocator;
  //var fakeMemoryAlloc;  // allocator.alloc
  //var fakeMemoryFree;  // allocator.free
  //var sizeof;        // allocator.sizeof
  var size_t;
  var unsigned_int = new ArrayBuffer(4);  // 4 bytes size of unsigned int
  var short = new ArrayBuffer(2);      // 2 bytes size of short -32,768 to 32,767
  var __STDC__;
  var __GNUC__ = 0;     // never want
  var __SIZE_TYPE__;
  var __cplusplus;
  var __builtin_memcpy;
  var yyptr;          // https://opensource.apple.com/source/cc/cc-798/bison/bison.hairy.auto.html
  var YYCOPY;
  var YYSTACK_RELOCATE;
  var YYSIZE_T;
  var YYSTACK_USE_ALLOCA;
  var YYSTACK_ALLOC;
  var YYSTACK_ALLOCA;
  var YYSTACK_FREE;
  var YYSTACK_BYTES;
  var YYLTYPE_IS_TRIVIAL;
  var YY.lsp_needed;
  var YYSTYPE;
  var YYLTYPE;
  var YYSTACK_GAP_MAX;
  var YYTRANSLATE;
  var YYEOF = 0;
  var YYTERROR = 1;
  var YYERRCODE = 256;
  var YYPOPSTACK;
  var YYBACKUP;
  var YYRECOVERING;
  var YYFAIL;  
  var YYABORT;
  var YYACCEPT;  
  var YYERROR;
  var YYDPRINTF;

  var my_context.error_count;
  var yytranslate;
  var yyr1;
  var yyr2;
  var yydefact;
  var yydefgoto;
  var yypact;
  var yypgoto;
  var yytable;
  var yycheck;
  var yyoverflow;
  var yyprhs;
  var yyrhs;
  var yyrline;
  var yyi;
  var trucewbytes;
  var yyerrlab1;
  var yyacceptlab;
  var yyabortlab;
  var yyoverflowlab;
  var yybackup;
  var yychar;
  var yylval;
  var yyerror;
  var yydebug;
  var yyerrok;
  var yyreturn;
  var yyss;
  var yyssa;
  var yyerrhandle;
  var truc;
  var yypact;
  var yyerrpop;
  var yyreduce;
  var yyvsp;
  var yylloc;
  var yylsp;
  var yyssp;
  var yyssp1;
  var yydefact;

  // ------------------------ Lookup Tables ------------------------------------
  
  // YYTRANSLATE[YYLEX] -- Bison token number corresponding to YYLEX.
  yytranslate = [
     0,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    2,    2,    2,    2,
     2,    2,    2,    2,    2,    2,    1,    3,    4,    5,
     6,    7,    8,    9,   10,   11,   12,   13  
  ];

  // YYR1[truc] -- Symbol number of symbol that rule truc derives.
  yyr1 = [
     0,   14,   14,   15,   15,   15,   15,   15,   16,   17,
    17,   18,   18,   19,   19,   19,   20,   20,   21,   22,
    22,   23,   23,   24,   25,   25,   26,   26  
  ];

  // YYR2[truc] -- Number of symbols composing right hand side of rule truc.
  yyr2 = [
     0,    1,    2,    1,    1,    1,    1,    2,    6,    1,
     2,    1,    2,    1,    2,    1,    1,    2,    4,    1,
     2,    1,    2,    1,    2,    1,    1,    1  
  ];

  // YYDEFACT[S] -- default rule to reduce with in state S when YYTABLE
  // doesn't specify something else to do.  Zero means the default is an
  // error.
  yydefact = [
     0,    0,    0,   25,    0,    0,    9,   21,   26,   27,
     0,    3,    0,    4,   16,    0,    5,    6,    7,   24,
    10,   17,   22,    2,    0,    0,    0,   23,    0,   19,
     0,   11,   13,    0,   15,   18,   20,    0,   12,   14,
     8,    0,    0,    0
   
  ];

  yydefgoto = [
    23,   10,   11,   12,   30,   31,   13,   14,   28,   15,
    29,   16,   17  
  ];

  YYDPRINTF("info"[
    29,   14,    5,-32768,   36,    0,-32768,-32768,-32768,-32768,
     2,-32768,   20,-32768,-32768,   25,-32768,-32768,-32768,-32768,
  -32768,-32768,-32768,-32768,    5,   34,    8,-32768,    5,   34,
    42,    8,-32768,   -5,-32768,-32768,-32768,    5,-32768,-32768,
  -32768,   49,   50,-32768

  ];

  yypgoto = [
    51,-32768,-32768,-32768,   21,-32768,-32768,   -3,   24,   12,
  -32768,-32768,   -2  
  ];

  yytable = [
    19,   21,   -1,    1,   25,    2,    3,    8,    9,    4,
     5,   22,    6,    7,    8,    9,    5,    8,    9,    7,
     8,    9,   26,   32,   34,   24,   35,   18,   32,   34,
     1,   39,    2,    3,   25,   40,    4,    5,   33,    6,
     7,    8,    9,   33,    5,   27,   20,    7,   37,   42,
    43,   41,   38,   36
  ];

  yycheck = [
     2,    4,    0,    1,    9,    3,    4,   12,   13,    7,
     8,   11,   10,   11,   12,   13,    8,   12,   13,   11,
    12,   13,   24,   26,   26,    5,   28,   13,   31,   31,
     1,   33,    3,    4,    9,   37,    7,    8,   26,   10,
    11,   12,   13,   31,    8,   11,   10,   11,    6,    0,
     0,    0,   31,   29
  
  ];

  if (YYDEBUG) {
   yyprhs = [
     0,    0,    2,    5,    7,    9,   11,   13,   16,   23,
    25,   28,   30,   33,   35,   38,   40,   42,   45,   50,
    52,   55,   57,   60,   62,   65,   67,   69
   ];
   yyrhs = [
    15,    0,   15,   14,    0,   16,    0,   20,    0,   25,
     0,   26,    0,    1,   13,    0,   17,    5,   26,   18,
     6,   26,    0,   10,    0,    7,   10,    0,   19,    0,
    19,   18,    0,   21,    0,   23,   26,    0,   26,    0,
    21,    0,    7,   21,    0,   23,    9,   22,   26,    0,
    24,    0,   24,   22,    0,   11,    0,    8,   11,    0,
    11,    0,    3,   26,    0,    4,    0,   12,    0,   13,
     0
   ];
   // YYRLINE[truc] -- source line where rule number truc was defined.
   yyrline = [
     0,   55,   55,   57,   57,   57,   57,   58,   63,   65,
    70,   76,   76,   78,   82,   86,   88,   92,   97,   99,
    99,  101,  105,  111,  116,  120,  125,  125   
   ];
  }
  
  if (YYDEBUG || YYERROR_VERBOSE) {

   // YYTNAME[TOKEN_NUM] -- String name of the token TOKEN_NUM.
   yytname = [
    "$", "error", "$undefined.", "CTRL_ASSIGN", "CTRL_IGNORE", "OPEN", 
    "CLOSE", "REVERSE", "STARTCLASS", "LET", "TAG", "SYMBOL", "REMARK", 
    "NL", "src", "statement", "block", "tag", "members", "member", "single", 
    "define", "bodies", "head", "body", "contol", "remark", 0  
   ];
  }

  // -*-C-*-  Note some compilers choke on comments on `#line' lines.
  // #line 3 "/usr/share/bison/bison.simple"

  

  // ---------------------------- MEMORY ---------------------------------------

  if (yyoverflow !== undefined && (__cplusplus !== undefined || (YYLTYPE_IS_TRIVIAL && YYSTYPE_IS_TRIVIAL))) {

   // XXX declare allocator here

   
   // A type that is properly aligned for any stack member
   // Union stores one different types in same type and memory
   // XXX: mh no...
   function yyalloc (yyss, yyvs, yyls) {
    truc = {
      "short": yyss,
      "YYSTYPE": yyvs
    };
    if (YY.lsp_needed) {
      truc.YYLTYPE = yyls;
    }
    return truc;
   };
   
   // The size of the maximum gap between one aligned stack and the next.
   // XXX: make one, set the size...
   // YYSTACK_GAP_MAX = allocator.sizeof(yyalloc - 1);
   
   // Size of array large to enough to hold all stacks, each with N elements.
   if (YY.lsp_needed) {
    YYSTACK_BYTES = function(N) {
      return N * (short.byteLength + allocator,sizeof(YYSTYPE) + 
       allocator.sizeof(YYLTYPE)) + 2 * YYSTACK_GAP_MAX;
    }
   } else {
    YYSTACK_BYTES = function(N) {
      return N * (short.byteLength + allocator,sizeof(YYSTYPE)) + 
       YYSTACK_GAP_MAX;
    }
   }
   
   // Copy STACK COUNT objects FROM to TO. source and destination don't overlap
   // XXX uhm, now what?
   if (YYCOPY === undefined) {
    if (1 < __GNUC__) {
      YYCOPY = function (To, From, Count) {
       __builtin_memcpy(To, From, (Count) * allocator.sizeof(*(From)));
      }
    } else {
      YYCOPY = function (To, From, Count) {
       //do {
       for (yyi = 0; yyi < Count; yyi += 1) {
        To[yyi] = From[yyi];
       }
       YYSIZE_T = yyi; // XXX what for?
       //} while (0);
      }
    }
   }
   
   // Relocate STACK from its old location to the new one. The local variables 
   // YYSIZE and YYSTACKSIZE give the old and new number of elements in the 
   // stack, and YYPTR gives the new location of the stack. Advance YYPTR to 
   // a properly aligned location for the next stack.
   YYSTACK_RELOCATE = function (Stack) {
    // do {
    var yysize,
      yystacksize;

    // XXX hm in theory
    YYCOPY(yyptr[Stack], Stack, yysize);
    Stack = yyptr[Stack]; // XXX what for?
    trucewbytes = yystacksize * allocator.sizeof(Stack) + YYSTACK_GAP_MAX;
    YYSIZE_T = trucewbytes;
    yyptr = yyptr + trucewbytes / allocator.sizeof(yyptr)
    // } while (0);
   }
  }

  if (yyoverflow === undefined || YYERROR_VERBOSE) {

   // The YYDPRINTF("info"r invokes alloca or malloc; define the necessary symbols.
   //if (YYSTACK_USE_ALLOCA) {
   //  YYSTACK_ALLOC = allocator.alloc;
   //} else {
   //  if (...) {
   //   YYSTACK_ALLOC = allocator.alloc;
   //  }
   //}
   
   // size_t 64bit max unsigned 65535?
   // Pacify GCC's `empty if-body' warning.
   //if (YYSTACK_ALLOC) {
   YYSTACK_FREE = function (pointer) {
      //do {
       /* empty */
      //} while 0;
   }
   //} else {
   //  if (__STDC__ || __cplusplus) {
   //   YYSIZE_T = size_t;
   //  }
    YYSTACK_ALLOC = allocator.alloc;
    YYSTACK_FREE = allocator.free;
   //}
  }
  
  // really really really make sure YYSIZE_T is defined
  //if (YYSIZE_T === undefined && __SIZE_TYPE__) {
  //  YYSIZE_T = __SIZE_TYPE__;
  //}
  //if (YYSIZE_T === undefined && size_t) {
  //  YYSIZE_T = size_t;
  //}
  //if (YYSIZE_T === undefined) {
  //  if (__STDC__) || __cplusplus) {
  //   YYSIZE_T = size_t;
  //  }
  //} 
  if (YYSIZE_T === undefined) {
   YYSIZE_T = unsigned_int.byteLength;
  }

  // ---------------------------- "ROUTING" ------------------------------------
  yyerrok = function () {
   shift_token_error_message_threshold = 0;
  }
  yyclearin = function () {
   yychar = YY.empty;
  }
  // YYTRANSLATE(YYLEX) -- Bison token number corresponding to YYLEX.
  YYTRANSLATE = function(x) {
   if (x <= 267) {   // XXX unsigned(x)
    return yytranslate[x];
   }
   return 27;
  }
  YYACCEPT = function () {
   yyacceptlab();
  }
  YYABORT = function () {
   yyabortlab();
  }
  YYERROR = function () {
   yyerrlab1();
  }
  yyerror = function(my_message) {
   error_count++;
   console.log("[yyerror] (#:" + error_count + "): " + my_message);
   //return 0;
  }

  // Like YYERROR except do call yyerror.  This remains here temporarily
  // to ease the transition to the new meaning of YYERROR, for GCC.
  // Once GCC version 2 has supplanted version 1, this can go
  YYFAIL = function () {
   yyerrlab();
  }
  YYRECOVERING = function () {
   return !!shift_token_error_message_threshold;
  }
  YYBACKUP = function (Token, Value) {
   // do {
   if (yychar === YY.empty && yylen === 1) {
    yychar = Token;
    yylval = Value;
    lookahead_token_number = YYTRANSLATE(yychar);
    YYPOPSTACK();
    yybackup();
   } else {
    yyerror("Syntax error: Cannot back up.");
    YYERROR();
   }
   // } while (0);
  }


  // ---------------------------- paser stuf -----------------------------------
  // YYLLOC_DEFAULT -- Compute the default location (before the actions are run).
  // When YYLLOC_DEFAULT is run, CURRENT is set the location of the
  // first token.  By default, to implement support for ranges, extend
  // its range to the last symbol.
  
  if (!YYLLOC_DEFAULT) {
   YYLLOC_DEFAULT = function(Current, Rhs, N) {
    Current.last_line = Rhs[N].last_line;
    Current.last_column = Rhs[N].last_column;
   };
  }

  // YYLEX -- calling `yylex' with the right arguments.
  if (YY.pure) {
   if (YY.lsp_needed) {
    if (YYLEX_PARAM) {    
      YYLEX = function () {
       return yylex(yylval, yylloc, YYLEX_PARAM);
      };
    } else {
      YYLEX = function () {
       return yylex(yylval, yylloc);
      };
    }
   } else {
    if (YYLEX_PARAM) {
      YYLEX = function () {
       return yylex(yylval, YYLEX_PARAM);
      };
    } else {
      YYLEX = function () {
       return yylex(yylval);
      };
    }
   } // !YY.lsp_needed
  } else {
   // !YY.pure
   YYLEX = function() {
    return yylex();
   };
  } // YY.pure

  // Enable debugging if requested
  if (YYDEBUG) {
   if (!YYFPRINTF) {
    YYFPRINTF = console.log;
   }
   YYDPRINTF = function () {
    // do {
    if (yydebug) {
      YYFPRINTF(arguments);
    }
    // } while (0);
   };

   // Nonzero means print parse trace. It is left uninitialized so that
   // multiple parsers can coexist.
   // yydebug;
  } else {
   YYDPRINTF(Args);
  }
  
  // YYMAXDEPTH -- maximum size the stacks can grow to (effective only
  // if the built-in stack extension method is used).

  // Do not make this value too large; the results are undefined if
  // SIZE_MAX < YYSTACK_BYTES (YYMAXDEPTH)
  // evaluated with infinite-precision integer arithmetic.
  if (YYMAXDEPTH === 0) {
   YYMAXDEPTH = null;
  }

  if (!YYMAXDEPTH) {
   YYMAXDEPTH = 10000;
  }
  
  if (!YYERROR_VERBOSE) {
   if (yystrlen === undefined) { 
    if (__GLIBC__ && _STRING_H) {
      yystrlen = strlen;
    } else {
     
      // Return the length of YYSTR.
      // XXX lost again...
      YYSIZE_T = (function () {
      
       if (__STDC__ || __cplusplus) {
        yystrlen = yystr;
       } else {
        yystrlen = yystr;
       }
       yys = yystr;
      
       while (yys[yys.length] !== '\0') {
        continue;
       }
       return yys - yystr - 1;
      })();
    }
   }

   if (!yystpcpy) {
    if (__GLIBC__ && _STRING_H && _GNU_SOURCE) {
      yystpcpy = stpcpy;
    } else {
      
      // Copy YYSRC to YYDEST, returning the address of the terminating '\0' in
      // YYDEST.
      // XXX sigh...
      YYDEST = (function () {
       if (__STDC__ || __cplusplus) {
        yystpcpy(yydest, yysrc);
       } else {
        yystpcpy(yydest, yysrc);
        // char *yydest;
        // const char *yysrc;
       }

       yyd = yydest;
       yys = yysrc;

       while (yyd !== '\0') {
        yyd = yys++;
        continue;
       }
       return yyd - 1;
      }());
    }
   }
  }


  // ---------------------------- The rest -------------------------------------
  
  
  
  function checkNoInstantClass() {
   var current_class = CLASS_LIST;
   while (current_class !== null) {
    if (current_class.branch === undefined) {
      return current_class.name;
    }
    current_class = current_class.next;
   }
   return null;
  }

  function getNewClassName(my_key_name) {
   var tmp_class_count = 0,
    class_name = my_key_name + "#" + tmp_class_count;

   if (!SW_SEMI_COMPAT) {
    console.log("Now modifying grammar to minimize states[", grammar_modification_number + "]");
    NO_NEW_LINE = 1;
   }
   grammar_modification_number++;
   return (1);
  }

  function unifyBody(my_class_name, my_body, my_new_body) {
   var body_next,
    new_body_next,
    body_class,
    new_body,
    new_class_name;
    
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
    my_body = body_next;
    my_new_body = new_body_next;
    body_next = body.next;
    new_body_next = new_body.next;
   }

   body_class = createBodyClass(); // ?
   if (body_class !== null && body_class.tmp) {
    enterNonTerminalSymbol(my_body.name, new_body_next, 0, 0, 0, 1);
   } else {
    new_class_name = getNewClassName(my_class_name);
    enterNonTerminalSymbol(new_class_name, body_next, 0, 0, 0, 1);
    enterNonTerminalSymbol(new_class_name, new_body_next, 0, 0, 0, 1);
    my_new_body.name = new_class_name;
    my_new_body.abort = 0;
    my_new_body.next = null;
    my_body.next = newBody;
    body_next.next = body_next;
   }
   return 0;
  }

  function pushBody(my_body_class, my_new_body) {
   var body_list = my_body_class.body_list,
    pre_body_list = null,
    new_body_list,
    body,
    cmp,
    define_number = 1;
   
   while (body_list !== null) {
    body = body_list.body;
    cmp = body.name === my_new_body.name;
    if (cmp > 0) {
      break;
    }
    if (cmp === 0) {
      if (unifyBody(body_class.name, body, my_new_body)) {
       console.warn("Redefining class: ", body_class.name, body.name);
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
    body_class.body_list = new_body_list;
   }
   new_body_list.next = body_list;
   body_class.branch++;
  }

  function outputHeader(my_name) {
   if (class_count >= body_class_flag_max) {
    if (SW_COMPAT_I) {
      console.warn("Class accepted flag overflow, " + my_name);
    }
   } else {
    if (SW_COMPAT_I === undefined) {
      FP_HEADER.push("#define ACCEPT_" + my_name + "0x%08x\n",  1 << class_count );
    }
    current_class_count = class_count++;
   }
  }

  function enterNonTerminalSymbol(my_name, my_body, my_mode_accept, my_start, my_member, my_tmp) {
   var body_class = createBodyClass();
   
   // when does this happen? initial?
   if (body_class === null) {
    if (my_member) {
      error_count++;
      throw Error("Accepted fla of class is reassigned:", head_name);
    }
   } else {
    body_class.name = my_name;
    if (my_mode_accept) {
      if (my_member) {
       body_class.number = current_class_count;
      } else {
       if (!my_tmp) {
        outputHeader(name);
        body_class.number = current_class_count;
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
    if (CLASS_LIST_TAIL === null) {
      CLASS_LIST = body_class;
    } else {
      CLASS_LIST_TAIL.next = body_class;
    }
    CLASS_LIST_TAIL = body_class;
   }
   if (my_body === null) {
    pushBody(body_class, my_body);
    if (my_start) {
      body_class_flag_start = 0;
      if (START_SYMBOL === null) {
       START_SYMBOL = body_class;
      } else {
       error_count++;
       throw Error("Start symbol is redefined: ", body_class.name);
      }
    }
   }
   return body_class;
  }

  function configureNonTerminalSymbol(my_body) {
   var first_body = null,
    previous_body = null,
    i;
   for (i = 0; i < body_count; i += 1) {
    my_body.name = body_name[i];
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
  }

  function appendNonTerminalSymbol(my_name, my_mode_assign) {
   var body = configureNonTerminalSymbol(createBody());
   enterNonTerminalSymbol(my_name, body, my_mode_assign, body_class_flag_start, is_block_start_or_end, 0);
   body_count = 0;
  }





  window.YY = YY;

}(window));

