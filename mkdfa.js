/*
  Copyright (c) 1991-2011 Kawahara Lab., Kyoto University
  Copyright (c) 2000-2005 Shikano Lab., Nara Institute of Science and Technology
  Copyright (c) 2005-2011 Julius project team, Nagoya Institute of Technology
  All rights reserved
*/
// =============================================================================
// ================================= YY ========================================
// =============================================================================
(function (window, Math, Error) {
  "use strict";

  function setBuffer (my_size) {
    return new ArrayBuffer(my_size);
  }

  function setView (my_array) {
    return new DataView(my_array);
  }

  function getFileByType(my_dict, my_type) {
    var dict = my_dict,
      file;
    for (file in dict) {
      if (dict.hasOwnProperty(file)) {
        if (dict[file].type === my_type) {
          return dict[file];
        }
      }
    }
  }

  function extendDict(my_existing_dict, my_new_dict) {
    var key;
    for (key in my_new_dict) {
      if (my_new_dict.hasOwnProperty(key)) {
        if (my_existing_dict.hasOwnProperty(key)) {
          throw new Error("[error] Redefining property: " + key);
        } else {
          my_existing_dict[key] = my_new_dict[key];
        }
      }
    }
    return my_existing_dict;
  }

  // the one whywhy to yyuck them all
  window.YY = {"util_dict": extendDict({}, {

    // combine two objects into one
    "extendDict": extendDict,

    // retrieve a specific file from the file dict. as user can pass his own
    // name prefix like "sample", the file "type" (grammar, voca, etc) is set
    // as type on the a file object, this way we don't care for the name a
    // file is given.
    "getFileByType": getFileByType,

    // create a new array buffer
    "setBuffer": setBuffer,

    // create the view for an array buffer
    "setView": setView

  })};

}(window, Math, Error));

// =============================================================================
// ================================= Table =====================================
// =============================================================================

(function (window, YY, Error) {
  "use strict";

  var TOKEN_DICT = {
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
  }, 
  
    TRANSLATE_TOKEN = [
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

    NON_TERMINAL_GOTO_METHOD = [
      51,-32768,-32768,-32768,   21,-32768,-32768,   -3,   24,   12,
    -32768,-32768,   -2  
    ],

    DEFAULT_GOTO_METHOD = [
      23,   10,   11,   12,   30,   31,   13,   14,   28,   15,
      29,   16,   17  
    ],

    RULE_LEFT_HAND_SIDE_SYMBOL_NUMBER = [
       0,   14,   14,   15,   15,   15,   15,   15,   16,   17,
      17,   18,   18,   19,   19,   19,   20,   20,   21,   22,
      22,   23,   23,   24,   25,   25,   26,   26  
    ],

    RIGHT_HAND_SIDE = [
      15,     0,    15,    14,     0,    16,     0,    20,     0,    25,
       0,    26,     0,     1,    13,     0,    17,     5,    26,    18,
       6,    26,     0,    10,     0,     7,    10,     0,    19,     0,
      19,    18,     0,    21,     0,    23,    26,     0,    26,     0,
      21,     0,     7,    21,     0,    23,     9,    22,    26,     0,
      24,     0,    24,    22,     0,    11,     0,     8,    11,     0,
      11,     0,     3,    26,     0,     4,     0,    12,     0,    13,
       0
    ],    

    RULE_RIGHT_HAND_SIDE_SYMBOL_LENGTH = [
      0,    1,    2,    1,    1,    1,    1,    2,    6,    1,
      2,    1,    2,    1,    2,    1,    1,    2,    4,    1,
      2,    1,    2,    1,    2,    1,    1,    1  
    ],

    DEFAULT_REDUCTION_RULE = [
       0,    0,    0,   25,    0,    0,    9,   21,   26,   27,
       0,    3,    0,    4,   16,    0,    5,    6,    7,   24,
      10,   17,   22,    2,    0,    0,    0,   23,    0,   19,
       0,   11,   13,    0,   15,   18,   20,    0,   12,   14,
       8,    0,    0,    0
    ],

    LINE_POINTER = [
       0,    55,    55,    57,    57,    57,    57,    58,    63,    65,
      70,    76,    76,    78,    82,    86,    88,    92,    97,    99,
      99,   101,   105,   111,   116,   120,   125,   125
    ],

    SET_STATE_ACTION = [
          29,    14,     5,-32768,    36,     0,-32768,-32768,-32768,-32768,
           2,-32768,    20,-32768,-32768,    25,-32768,-32768,-32768,-32768,
      -32768,-32768,-32768,-32768,     5,    34,     8,-32768,     5,    34,
          42,     8,-32768,    -5,-32768,-32768,-32768,     5,-32768,-32768,
      -32768,    49,    50,-32768
    ],

    STATE_ACTION_VALID = [
       2,    4,    0,    1,    9,    3,    4,   12,   13,    7,
       8,   11,   10,   11,   12,   13,    8,   12,   13,   11,
      12,   13,   24,   26,   26,    5,   28,   13,   31,   31,
       1,   33,    3,    4,    9,   37,    7,    8,   26,   10,
      11,   12,   13,   31,    8,   11,   10,   11,    6,    0,
       0,    0,   31,   29
    ],

    STATE_ACTION = [
      19,   21,   -1,    1,   25,    2,    3,    8,    9,    4,
       5,   22,    6,    7,    8,    9,    5,    8,    9,    7,
       8,    9,   26,   32,   34,   24,   35,   18,   32,   34,
       1,   39,    2,    3,   25,   40,    4,    5,   33,    6,
       7,    8,    9,   33,    5,   27,   20,    7,   37,   42,
      43,   41,   38,   36
    ],

    TOKEN_NUMBER_OF_TOKEN = [
      "$", "error", "$undefined.", "CTRL_ASSIGN", "CTRL_IGNORE", "OPEN", 
      "CLOSE", "REVERSE", "STARTCLASS", "LET", "TAG", "SYMBOL", "REMARK", 
      "NL", "src", "statement", "block", "tag", "members", "member", "single", 
      "define", "bodies", "head", "body", "contol", "remark", 0  
    ],

    RIGHT_HAND_SIDE_INDEX = [
       0,     0,     2,     5,     7,     9,    11,    13,    16,    23,
      25,    28,    30,    33,    35,    38,    40,    42,    45,    50,
      52,    55,    57,    60,    62,    65,    67,    69
    ],

    LEX_EC = [
      0,
      1,    1,    1,    1,    1,    1,    1,    1,    2,    3,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    2,    4,    1,    5,    1,    6,    1,    1,    1,
      1,    7,    1,    1,    1,    1,    1,    8,    8,    8,
      8,    8,    8,    8,    8,    8,    8,    9,    1,    1,
      1,    1,    1,   10,   11,    8,    8,    8,   12,    8,
     13,    8,   14,    8,    8,    8,    8,   15,   16,    8,
      8,   17,   18,    8,    8,    8,    8,    8,    8,    8,
      1,    1,    1,    1,    8,    1,    8,    8,    8,    8,
  
      8,    8,    8,    8,    8,    8,    8,    8,    8,    8,
      8,    8,    8,    8,    8,    8,    8,    8,    8,    8,
      8,    8,   19,    1,   20,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
  
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1
    ],

    LEX_ACCEPT = [
        0,
        0,    0,   15,   13,   12,   10,    7,   13,   13,    8,
        2,    9,   13,    3,    4,    0,   11,    0,    0,    2,
        1,    0,    0,    0,    0,    0,    0,    0,    0,    5,
        6,    0
    ],

    LEX_BASE = [
      0,
      0,    0,   39,   40,   40,   40,   40,   35,   10,   40,
      0,   40,    0,   40,   40,   34,   40,   18,   22,    0,
      0,   16,   18,   18,   15,   17,   12,   13,   15,   40,
     40,   40,   24,   21,   20
    ],

    LEX_META = [
      0,
      1,    1,    1,    1,    1,    1,    1,    2,    1,    1,
      2,    2,    2,    2,    2,    2,    2,    2,    1,    1
    ],

    LEX_DEF = [
       0,
       32,    1,   32,   32,   32,   32,   32,   33,   32,   32,
       34,   32,   35,   32,   32,   33,   32,   32,   32,   34,
       35,   32,   32,   32,   32,   32,   32,   32,   32,   32,
       32,    0,   32,   32,   32
    ],

    LEX_NXT = [
      0,
      4,    5,    6,    7,    8,    9,   10,   11,   12,   13,
     11,   11,   11,   11,   11,   11,   11,   11,   14,   15,
     18,   21,   20,   19,   16,   16,   31,   30,   29,   28,
     27,   26,   25,   24,   23,   22,   17,   17,   32,    3,
     32,   32,   32,   32,   32,   32,   32,   32,   32,   32,
     32,   32,   32,   32,   32,   32,   32,   32,   32,   32
    ],

    LEX_CHK = [
      0,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      1,    1,    1,    1,    1,    1,    1,    1,    1,    1,
      9,   35,   34,    9,   33,   33,   29,   28,   27,   26,
     25,   24,   23,   22,   19,   18,   16,    8,    3,   32,
     32,   32,   32,   32,   32,   32,   32,   32,   32,   32,
     32,   32,   32,   32,   32,   32,   32,   32,   32,   32
    ];

  function translate(my_x) {
    if (my_x <= 267) {
      return YY.table_dict.translate_token[my_x];
    }
    return 27;
  }

  // (YYTRANSLATE) [gram.tabl.c]
  YY.table_dict = YY.util_dict.extendDict({}, {

    // --------------------------- token values ----------------------------------
    //
    // YYText() is supplied by flex, which auto-generates the lexical analyzer
    // from the description in gram.l. The return value of YYText() is the 
    // single token that was just recognized.
    //
    // (1) Lexical analysis is the stage that breaks up the raw 
    // character stream into such "tokens".  For example,
    //
    // float foo[3];
    // 
    // gets split into 6 tokens: typename "float", identifier: "foo", open 
    // bracket "[", integer "3", close bracket "]", and semicolon ";".
    //
    // (2) The next stage is parsing, which takes that token list and realizes 
    // that it's a variable declaration statement.
  
    // Here is the definitions section for the flex(yacc) input file:
    // %token INTEGER
    //
    // This definition declares a token called INTEGER. Yacc generates a parser in 
    // file y.tab.c and and an include file y.tab.h, like:
    //
    // #ifndef YYSTYPE
    // #define YYSTYPE int
    // #endif
    // #define INTEGER 258
    // extern YYSTYPE yylval;
    //
    // Lex includes this file and utilizes the definitions for token values. 
    // To obtain tokens yacc calls yylex. Each call to yylex() returns an 
    // integer value which represents a token type. This tells YACC what kind 
    // of token it has read. The token may optionally have a value (and location),
    // which should be placed in the variable yylval and yyloc. For example:
    //
    // [0-9]+      {
    //                yylval = atoi(yytext);
    //                return INTEGER;
    //             }
    //
    // (note the atoi() function takes a string (which represents an integer) 
    // as an argument and returns its value) This would store the value of the 
    // integer in yylval, and return token INTEGER to yacc. The type of yylval 
    // is determined by YYSTYPE. Since the default type is integer this works 
    // well in this case. Token values 0-255 are reserved for character values. 
    // For example, if you had a rule such as:
    //
    // [-+]       return *yytext;    /* return operator */
    //
    // the character value for minus or plus is returned. Note that we placed 
    // the minus sign first so that it wouldnât be mistaken for a range 
    // designator. Generated token values typically start around 258 because lex 
    // reserves several values for end-of-file and error processing.
  
    // #defines
    "token_dict": TOKEN_DICT,
    
    // (yy_ec) [lex.yy.c]
    "ec": LEX_EC,

    // (yy_accept) [lex.yy.c] used to set yy_act = action to run, so this
    // should be list of actions, probably corresponding to the
    // number of rules available (15, 14+1)
    "accept": LEX_ACCEPT,

    // (yy_base) [lex.yy.c]
    "base": LEX_BASE,

    // (yy_meta) [lex.yy.c]
    "meta": LEX_META,

    // (yy_def) [lex.yy.c]
    "def": LEX_DEF,

    // (yy_nxt) [lex.yy.c]
    "nxt": LEX_NXT,

    // (yy_chk) [lex.yy.c] checks current state, probably to validate
    "check": LEX_CHK,

    // (yytranslate) [gram.tab.c]
    // This table maps lexical token numbers to their symbol numbers. If you 
    // have %token declarations in your grammar, Bison assigns token numbers to 
    // the different tokens; If you just use character representations, Bison 
    // just maps their ASCII values to the symbol numbers. Example of the latter
    // is yytranslate[97] = 5 which is 'a'. Full listing of yytranslate is below.
    "translate_token": TRANSLATE_TOKEN,

    // (yypgoto) [gram.tab.c] accounts for non-default GOTOs for all 
    // non-terminal symbols.
    "non_terminal_goto_method": NON_TERMINAL_GOTO_METHOD,

    // (yydefgoto) [gram.tab.c] Lists default GOTOs for each non-terminal 
    // symbol. It is only used after checking with yypgoto.
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
    "default_goto_method": DEFAULT_GOTO_METHOD,

    // (yyr1) [gram.tab.c] Symbol number of symbol that rule yyn derives.
    // Symbol number of lhs of each rule. Used at the time of a 
    // reduction to find the next state. yyr1 specifies the symbol number of 
    // the LHS of each rule. Remember that 0 is never used as a rule number, 
    // so this table has NRULES + 1 entries, where NRULES is the number of 
    // rules in the grammar. Here is the listing:
    // Other example:
    // {
    //   0,     8,     9,     9,    10,    10,    11,    11,    12,    12
    // };
    // So rule #1 has $accept as LHS, and hence rule_symbol_number[1] = 8 (see 
    // symbol table given previously) and so on. When a reduction takes place, 
    // We need to know the LHS symbol of the rule used for reduction to 
    // transition to an appropriate state. That is where this table comes into 
    // use.
    "rule_left_hand_side_symbol_number": RULE_LEFT_HAND_SIDE_SYMBOL_NUMBER,

    // (yyrhs) [gram.tab.c] A -1 separated list of RHS (right hand side/key) 
    // symbol numbers of all rules. yyrhs[n] is first symbol on the RHS (right 
    // hand side of rule #n)
    // Not generated anymore in Bison > 2014
    "right_hand_side": RIGHT_HAND_SIDE,

    // (yyr2) [gram.tab.c] length of RHS of each rule (Number of symbols 
    // composing right hand side of rule. Used at the time of reduction to pop 
    // the stack. yyr2 specifies the length (number of symbols) of the right 
    // hand side of each rule. Here is a listing produced by Bison:
    // {
    //   0,     2,     3,     1,     3,     1,     1,     3,     0,     1
    // };
    // Rule #2 (L â L;E) has 3 symbols on the RHS, and hence yyr2[2] = 3. This 
    // table is also used at the time of a reduction. The number of states to 
    // be popped off the stack is same as the number of symbols on the right 
    // hand side of the reducing rule.
    "rule_right_hand_side_symbol_length": RULE_RIGHT_HAND_SIDE_SYMBOL_LENGTH,

    // (yydefact) [gram.tab.c] default reduction rules for each state = default 
    // rule to reduce with in state S when YYTABLE doesn't specify something 
    // else to do.
    "default_reduction_rule": DEFAULT_REDUCTION_RULE,

    // (yyrline[n]) [gram.tab.c] Line # in .y grammar source file where rule 
    // n is defined. This table lists default reductions for each state. 
    // yydefact[state] = rule number to use for a default reduction in that 
    // state. Here is the yydefact table produced for our a sample grammar:
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
    "line_pointer": LINE_POINTER,

    // (yypact) [gram.tab.c] Directory into yytable indexed by state number. 
    // Displacements in yytable are indexed by symbol number.
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
    "set_state_action": SET_STATE_ACTION,

    // (yycheck) [gram.tab.c] guard used to check legal bounds within portions 
    // yytable. This is like a guard table. This table is used for various 
    // checks. Again this table is another mixed bag - of symbol numbers and 
    // state numbers. There is a very good explanation for this table inside 
    // Bison source code (src/tables.h): YYCHECK = a vector indexed in parallel 
    // with YYTABLE.  It indicates, in a roundabout way, the bounds of the 
    // portion you are trying to examine.
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
    "state_action_valid": STATE_ACTION_VALID,

    // (yytable) [gram.tab.c] highly compressed representation of the actions 
    // in each state. Negative entries represent reductions. There is a negative 
    // infinity to detect errors.
    // This table is a mixed bag of state numbers and rule numbers in some 
    // pre-calculated order. This is the table T we discussed in the previous 
    // section. yytable works closely with yycheck, yypact and yypgoto tables 
    // to indicate to the parser either the state to pushed next on to the 
    // parse stack or a rule to use for reduction.
    // One thing worth noting here is the definition of YYTABLE_NINF - the 
    // "negative infinity" value for yytable is the highest negative entry 
    // which in our case is -1 (since there are no negative values in yytable). 
    // This value is used to determine explicit error situations.
    "state_action": STATE_ACTION,

    // (yytname) [gram.tab.c]  String specifying the symbol for symbol number n. 
    // ~ yytoknum[n] - Token number of token n (String name of token TOKEN_NUM)
    "token_number_of_token": TOKEN_NUMBER_OF_TOKEN,

    // (yyprhs) [gram.tabl.c] Index in yyrhs of the first RHS symbol of rule n.
    // Not generated anymore in Bison > 2014
    "right_hand_side_index": RIGHT_HAND_SIDE_INDEX,

    // (YYTRANSLATE) [gram.tabl.c] - fetch Bison token number corresponding to YYLEX.
    "translate": translate,
  });

}(window, YY, Error));

// =============================================================================
// ================================= State =====================================
// =============================================================================

(function (window, YY, Error) {
  "use strict";

  /* not used so far

  // (FAList) Pointer of start FA in FA network
  YY.state_dict.finite_automaton_list = null;

  YY.state_dict.flag_body_class_accept = 0;

  // [mkfa.h]
  YY.state_dict.arc = {
    "inp": 0,
    "finite_automaton": {},
    "flag_body_class_start": 0,
    "flag_body_class_accept": 0,
    "next": {}
  };

  // [mkfa.h]
  YY.state_dict.unify_arc = {
    "inp": 0,
    "finite_automaton": {},
    "flag_body_class_start": 0,
    "flag_body_class_accept": 0,
    "next": {},
    "flag_reserved": 0
  };

  // [mkfa.h]
  YY.state_dict.finite_automaton_list = {
    "finite_automation": {},
    "next": {}
  };

  // [mkfa.h]
  YY.state_dict.finite_automaton = {
    // common
    "stat": 0,
    "arc": [],
    "flag_body_class_start": 0,
    "flag_body_class_accept": 0,
    "flag_traversed": 0,
    // for DFA
    "psNum": 0,
    "unify_arc_list": [],
    "finite_automaton_list": [],
    "flag_volatiled": 0
  };
  
  */

  function getClass(my_dict, my_head_string) {
    var dict = my_dict,
      body_class;

    if (dict.class_tree === null) {
      return null;
    }

    // loop through tree
    body_class = dict.class_tree;
    while (1) {
      if (body_class.name === my_head_string) {
        body_class.flag_used = 1;
        return body_class;
      }
      body_class = body_class.next;
      if (body_class === null) {
        return null;
      }
    }
  }

  function getNewClassName (my_dict, my_name) {
    var dict = my_dict;

    // overwrite static
    dict.static_class_name = my_name + "#" + dict.static_tmp_class_count;
    dict.static_tmp_class_count += 1;
  }
  
  function checkNoInstantClass(my_dict) {
    var dict = my_dict,
      current_class = dict.class_tree,
      class_node_without_branch;

    while (current_class !== null) {
      if (current_class.branch === undefined) {
        class_node_without_branch = current_class.name;
      }
      current_class = current_class.next;
    }
    if (class_node_without_branch !== undefined) {
      throw new Error(
        "[error] Prototype-declared Class '" + class_node_without_branch +
        "' has no instant definitions."
      );
    }
  }

  function createTerminalSymbolBody() {
   return {
     "name": null,
     "next": {},
     "flag_abort": 0,
     };
  }

  function appendTerminalSymbol(my_dict, my_body_list, my_name) {
    var dict = my_dict;
      new_term_body;

    new_term_body = dict.createTerminalSymbolBody();
    new_term_body.name = my_name;
    new_term_body.abort = 0;
    new_term_body.next = my_body_list;

    return new_term_body;
  }

  function createBodyList() {
    return {
      "body": {},
      "next": null
    };
  }
  
  function createBodyClass() {
    return {
      "number": null,
      "name": null,
      "next": {},
      "body_list": {},
      "branch": null,
      "flag_used_finite_automaton": 0,
      "flag_used": 0,
      "flag_tmp": 0,
    };
  }

  function enterTerminalSymbol(my_dict, my_name, my_body_list, my_counter) {
    var dict = my_dict,
      input_number = dict.static_enter_terminal_symobol_input_number,
      body_class = dict.createBodyClass(),
      body_list = dict.createBodyList();

    if (dict.getClass(dict, my_name) !== null) {
      throw new Error("[error] - Class redefined '" + my_name + "'");
    }

    body_class.name = my_name;
    body_class.number = input_number;
    dict.static_enter_terminal_symobol_input_number += 1;

    // note: negative! why?
    body_class.branch = -my_counter;
    body_class.flag_used_finite_automaton = 0;
    body_class.flag_used = 0;
    body_class.flag_tmp = 0;

    // store this symbol in the class tree!
    if (dict.class_tree_tail === null) {
      dict.class_tree = body_class;
    } else {
      dict.class_tree_tail.next = body_class;
    }
    dict.class_tree_tail = body_class;

    // create a new root
    dict.root_body_list.body = my_body_list;
    dict.root_body_list.next = null;
  }

  function createNonTerminalSymbolBody(my_dict) {
    var dict = my_dict, 
      body = dict.createTerminalSymbolBody(),
      prev = null,
      next = null,
      i;

    // alloc nonterminal list buffer, make sure this is a name!
    for (i = 0; i < dict.body_number; i += 1) {
      body.name = dict.body_class_name_buffer_view.getInt8(i);
      body.flag_abort = 0;
      if (prev !== null) {
        prev.next = body;
      } else {
        first = body;
      }
      prev = body;
    }
    body.next = null;
    return body;
  }

  function appendNonTerminalSymbol(my_dict, my_flag_is_mode_assign_accept) {
    var dict = my_dict,
      name = dict.head_string,
      body = createNonTerminalSymbolBody(dict),
      accept = my_flag_is_mode_assign_accept || dict.flag_is_mode_assign_accept,
      start = dict.flag_body_class_start,
      member = dict.flag_is_block_start_or_end,
      tmp = 0;

    dict.enterNonTerminalSymbol(dict, name, body, accept, start, member, tmp);
    dict.body_number = 0;
  }

  function outputHeader(my_dict, my_semantic_stack_value) {
    var dict = my_dict,
      header = YY.util_dict.getFileByType(YY.file_dict, "header");

    if (dict.class_number >= dict.flag_body_class_max) {
      //if (dict.is_compat_i === 0) {
        console.log(
          "[info] Class accept flag overflow: " + my_semantic_stack_value
        );
        dict.current_body_class_number = -1;
      //}
    } else {
      //if (dict.is_compat_i === 0) {

        // fprintf(FPheader, "#define ACCEPT_%s 0x%08x\n", name, 1 << ClassNo)
        // http://www.cplusplus.com/reference/cstdio/fprintf/
        // 0x%08x = pointer http://stackoverflow.com/a/33324713/536768
        // %08x expects an unsigned int as argument, ~ 1 << dict.class_number
        // http://www.c4learn.com/c-programming/c-bitwise-left-shift-operator/
        // https://en.wikipedia.org/wiki/Bitwise_operations_in_C#Left_shift_.3C
        // can be used to multiply a number, 1 => 1,2,4,8
        header += "#define ACCEPT_" + my_semantic_stack_value + 
          "0x%08x\n", 1 << dict.class_number;
      //}
      dict.current_body_class_number = dict.class_number = dict.class_number + 1;
   }
  }

  function enterNonTerminalSymbol(
    my_dict,
    my_name,
    my_body,
    my_accept,
    my_start,
    my_member,
    my_tmp
  ) {
    var dict = my_dict,
      state_dict = YY.state_dict,
      body_class = state_dict.getClass(state_dict, my_name);

    if (body_class === null) {
      if (my_member) {
        throw new Error(
          "[error] Accepted flag of class " + my_name + "is reassigned"
        );
      }
    } else {
      body_class.name = my_name;
      if (my_accept) {
        if (my_member) {
          body_class.number = dict.current_body_class_number;
        } else {
          if (my_tmp === 0) {
            dict.outputHeader(dict, name);
            body_class.number = dict.current_body_class_number;
          }
        }  
      } else {
        body_class.number = -1;
      }
      body_class.branch = 0;
      body_class.flag_used_finite_automaton = 0;

      // non-terminal: does not appear in voca
      body_class.flag_used = 1;
      body_class.body_list = null;
      body_class.flag_tmp = tmp;
      body_class.next = null;
      if (dict.class_tree_tail === null) {
        dict.class_tree = body_class;
      } else {
        dict.class_tree_tail.next = body_class;
      }
      dict.class_tree_tail = body_class;
    }
    if (my_body !== null) {
      pushBody(dict, body_class, my_body);
    }
    if (my_start) {
      dict.flag_body_class_start = 0;
      if (dict.start_symbol === null) {
        dict.start_symbol = body_class;
      } else {
        throw new Error("[error] Start symbol redefined: " + body_class.name);
      }
    }
    return body_class;
  }


  function unifyBody(my_dict, my_class_name, my_body, my_new_body) {
    var dict = my_dict,
      body = my_body,
      new_body = my_new_body,
      body_next = my_body.next,
      new_body_next = my_new_body.next,
      body_class,
      new_class_name;

    while (1) {
      if (body.next === null && new_body_next === null ) {
        return -1;
      }
      if (new_body_next === null) {
        if (body.abort) {
          return -1;
        } else {
          body.abort = 1;
          return 0;
        }
      }
      if (body_next === null) {
        body.abort = 1;
        body.next = new_body_next;
        return 0;
      }
      if (body_next.name === new_body_next.name) {
        break;
      }
      body = body_next;
      new_body = new_body_next;
      body_next = body.next;
      new_body_next = new_body.next;
    }

    // and now for something different
    body_class = dict.getClass(dict, body.name);

    if (body_class !== null && body_class.flag_tmp) {
      dict.enterNonTerminalSymbol(body.name, new_body_next, 0, 0, 0, 1);
    } else {
      new_class_name = dict.getNewClassName(dict, my_class_name);

      // used to be semi-quiet, let's just call it
      console.log("[info] - Now modifying grammar to minimize states[" +
        dict.grammar_modification_number + "]"
      );

      dict.grammar_modification_number++;
      dict.enterNonTerminalSymbol(new_class_name, body_next, 0, 0, 0, 1 );
      dict.enterNonTerminalSymbol(new_class_name, new_body_Next, 0, 0, 0, 1 );

      // "Can't alloc body buffer of tmp class, \"%s\".", newClassName
      new_body.name = new_class_name;
      new_body.abort = 0;
      new_body.next = null;
      body.next = new_body;
        new_body.next = new_body;
      }
      return 0;
  }

  function pushBody(my_body, my_new_body) { 
    var body_list = my_body.body_list,
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
        if (unifyBody(my_body.name, body, my_new_body)) {
          console.log("[info] Redefining class: ", my_body.name, body.name);
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
      my_body.body_list = new_body_list;
    }
    new_body_list.next = body_list;
    my_body.branch++;
  }

  // -------------------------------- config------------------------------------
  YY.state_dict = YY.util_dict.extendDict({}, {

    // (chkNoInstantClass) [gram.tab.c], go through the tree of classes and
    // verify the class passed in has branches (meaning ?)    
    "checkNoInstantClass": checkNoInstantClass,

    // (getClass) [voca.c] loop through the class tree and retrieve a class
    // if it exists.
    "getClass": getClass,

    // (getNewClassName) - note this is where the "#" comes into play which
    // does not denote a comment. heureka...
    "getNewClassName": getNewClassName,

    // (_BODY) [mkfa.h] term list? it's a typedef struct, a terminal body, this
    // seems to be recreated on every call
    "createTerminalSymbolBody": createTerminalSymbolBody,

    // (setNonTerm) [gram.tab.c]
    "createNonTerminalSymbolBody": createNonTerminalSymbolBody,

    // (class) [mkfa.h], this is a class finite automaton, but because it's 
    // always being pointed too
    "createBodyClass": createBodyClass,

    // (BODYLIST) [mkfa.h] - this is a nonterminal list buffer, actually it's
    // a tree, rename later.
    "createBodyList": createBodyList,

    // (appendTerm) [voca.c] I assume this the end of a ... branch? Throws
    // "Can't alloc term list buffer" when no memory available. It's called
    // on the voca file, maybe this works with the values a variable can take?
    // the return value is set to body_list, which is also passed in as 
    // my_body_list, so on a tree it adds a new node on top and places existing 
    // nodes below on "next".
    "appendTerminalSymbol": appendTerminalSymbol,

    // (entryTerm) [voca.c] - char *name, BODY *body, int listLen (body-number)
    // throwing "Can't allocate memory for class finite automaton" if a 
    // body_class cannot be allocated and "Can't alloc nonterminal list buffer"
    // if a body_list cannot be allocated. Same thing as appending a symbol, the
    // passed in body_list is set to next, so the terminal symbol entry goes on
    // top of the tree/body_list. The method returns a BODY supposedly, but it
    // is never set to anything. The only "global" parameters updated are the
    // class_tree and class_tree_tail so this is where a terminal symbols will
    // show up eventually. Not sure what happens with bodyList, it is defined
    // within setVoca and set/reset to null, so for now I assume it's not 
    // relevant beyond. It's only called on virgin (...) and at the end of
    // parsing the voca file, still the body_list inside setVoca should be
    // updated, so put body_list is set on the state_dict.
    "enterTerminalSymbol": enterTerminalSymbol,

    // (appendNonTerm) [gram.tab.c] - only resets body_number and calls
    // enterNonTerminalSymbol. Not sure what this is doing yet.
    "appendNonTerminalSymbol": appendNonTerminalSymbol,

    // (enterNonTerm) - Class Finite Automaton.
    "enterNonTerminalSymbol": enterNonTerminalSymbol,

    // (outputHeader) [gram.tab.c], writes to header file. Not sure what.
    "outputHeader": outputHeader,

    // (unifyBody) [gram.tab.c]
    "unifyBody": unifyBody,

    // (pushBody) [gram.tab.c]
    "pushBody": pushBody,

    // (ClassList) Linear list of classes
    "class_tree": null,

    // (ClassListTail) The last node of the linear list of classes
    "class_tree_tail": null,

    // (tmpClassNo) [gram.tab.c] - int from (getNewClassName)
    "static_tmp_class_count": 0,
    
    // (classname) [gram.tab.c] - char array [256] from (getNewClassName)
    // it's static but gets overwritten on every call, leave here in case
    // it needs to be accessed.
    "static_class_name": "",

    // (InputNo) [voca.c] counter set on (entryTerm)
    "static_enter_terminal_symobol_input_number": 0,

    // [voca.c]
    "root_body_list": null,

    // (BodyName) [mkfa.h] - what is this for?
    // "Can't alloc nonterminal list buffer" a buffer for non-terminals?
    // but initialized as static char BODY_NAME[body_class_number][symbol_len];
    // an array buffer with 100 elements each 256 bytes space!
    "body_class_name_buffer_array": null,

    // corresponding DataView
    "body_class_name_buffer_view": null,

    // (BodyNo) - [] beware there are both an internal body_number in
    // setVocaFile as well as a "global" one, being used to fill the class_name
    // array buffer/view. Not sure they should not be the same.
    "body_number": 0,

    // (StartFlag) []
    "flag_body_class_start": 0,

    // (HeadName) [] - 256 character string?
    "head_string": "",

    // (ModeAssignAccptFlag) [???] - ?
    "flag_is_mode_assign_accept": 1,

    // (ModeBlock) [], stays zero, only used in appendNonTerminalSymbol
    "flag_is_block_start_or_end": 0,

    // (BlockReverseSw) [gram.tab.c]] - what does it do?
    "flag_is_reverse_block": null,

    // (CurClassNo) [gram.tab.c] - current class number, only used in
    // outputHeader where it is increased. Else set to -1. Not sure what for.
    "current_body_class_number": 0,

    // (START_SYMBOL) [gram.tab.c] Class of start symbol, we should just say 
    // start_class or change all class names to symbol.
    "start_symbol": null,

    // (classNo) [gram.tab.c] - static, counter for classes, only used in
    // outputHeader, never increased after being set to 0.
    "class_number": 0,

    // (CLASSFLAGS) [mkfa.h] - this is a type... typedef unsigned int CLASSFLAGS
    // "flag_body_class": 0,

    // (CLASSFLAG_MAX) [mkfa.h], so in bytes this should/would be 2, going by
    // https://www.tutorialspoint.com/cprogramming/c_data_types.htm, but it
    // could also mean a max value of 0 to 65,535
    // only used in output header
    "flag_body_class_max": 2 * 8,

    // (GramModifyNum) [gram.tab.c] - no idea what good for, only used on 
    // messaging
    "grammar_modification_number": 0,

  });

}(window, YY, Error));

// =============================================================================
// ===============================  Set Voca ===================================
// =============================================================================

(function (window, YY) {
  "use strict";

  // ported from:
  // https://goo.gl/H4slFg
  // resources:
  // http://cpp.sh/

  // ~ (fgets)
  // The C library function char *fgets(char *str, int n, FILE *stream) reads 
  // a line from the specified stream and stores it into the string pointed to 
  // by str. It stops when either (n-1) characters are read, the newline 
  // character is read, or the end-of-file is reached, whichever comes first.
  function splitFileIntoLines(my_file) {
    return my_file.split(/[\r\n]/g).filter(Boolean);
  }

  // (gettoken)
  function getToken(my_string) {
    var str_len = my_string.length, 
      char,
      i = 0;

    // loop and return nul if implicit or any \0 (end of string) is reached?
    // char c = '\0', it's the same aschar c = 0;
    // char c = 'A', it's the same as char c = 65
    // there is no \0 in JavaScript, so end of a string will never be reached.
    // but we'll just loop over the line we have anyway,
    //do {
    //  i = i + 1;
    //  char = my_string[i];
    //  if (char === '\0') {
    //    return null;
    //  }
    //} while (char === ' ' || char == '\t' || ch == '\r' || ch == '\n');

    for (i = 0; i < str_len; i += 1) {
      char = my_string[i];

      // any of these mean we'll look no further, replace with nul and return)
      if (char === ' ' || char == '\t' || ch == '\r' || ch == '\n') {
        // char = '\0';
        return (my_string.substring(0, i - 1));        
      }

      // end of string, return it
      //if (char === '\0') {
      //  // char = '\0';
      //  return (my_string - 1);
      //}
      // 
      if (i === str_len - 1) {
        return my_string;
      }
    }
  }



  // ------------------------------ start --------------------------------------
  function setVocaFile() {
    var util_dict = YY.util_dict,
      state_dict = YY.state_dict,
      voca = util_dict.getFileByType(YY.file_dict, "voca"); 
      voca_line_list,
      voca_line_len,
      voca_line,
      i,
      virgin = 1,
      internal_body_number = 0,
      identifier = "",
      token1,
      token2;

    if (voca === null) {
      throw new Error("Can't open vocabulary file.");
    }

    if (dict.is_debug === 1) {
      console.log("[info] - Now parsing vocabulary file.");
    }

    // start with root body_list
    state_dict.root_body_list = state_dict.createBodyList();

    voca_line_list = splitFileIntoLines(voca);
    voca_line_len = voca_line_list.length;

    for (i = 0; i < voca_line_len; i += 1) {
      voca_line = voca_line_list[i];

      // nul character, end of string/empty line, go to next line?
      //if (voca_line[0] === '\0') {
      //  continue;
      //}
      if (voca_line === "") {
        continue;
      }

      // comments?
      if (voca_line[0] === '#') {
        token1 = getToken(voca_line);
        //if (token1 === null) {
        //  continue;
        //}
        if (virgin === 0) {
          state_dict.enterTerminalSymbol(state_dict, identifier, state_dict.root_body_list, internal_body_number);
          state_dict.root_body_list = null;
          internal_body_number = 0;
        } else {
          virgin = 0;
        }

        // token1 + 1; ~ omits first character from token1, probably the "#"?
        // http://www.cplusplus.com/doc/tutorial/ntcs/
        identifier = token1.substring(1);
        continue;

      // "beef" to handle
      } else {
        token1 = getToken(voca_line);
        //if (token1 === null) {
        //  continue;
        //}

        // not sure what token2 is for, on first token I replace a space
        // with nul and on second token I stumble over that nul or the regular
        // one at the end of the string and return the token. Thus I think it
        // only splits/terminates a string on the first space/tab/line break
        token2 = getToken(token1);
        if (token2 === null) {
          state_dict.root_body_list = state_dict.appendTerminalSymbol(state_dict, state_dict.root_body_list, token1);
        } else {
          state_dict.root_body_list = state_dict.appendTerminalSymbol(state_dict, state_dict.root_body_list, token2);
        }
        internal_body_number += 1;
      }
    }

    // end of array, needed?
    state_dict.enterTerminalSymbol(state_dict, identifier, state_dict.root_body_list, internal_body_number);
  }

}(window, YY));

// =============================================================================
// =============================  Set Grammer ==================================
// =============================================================================

// =============================================================================
//                                  Parser
// =============================================================================
(function (window, YY, Math, Error) {
  "use strict";

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

  // ported from:
  // https://goo.gl/2koggK
  // resources:
  // http://www.javascripture.com/ArrayBuffer
  // http://www.cs.man.ac.uk/~pjj/cs212/ex5_hint.html
  // https://en.wikipedia.org/wiki/LALR_parser#LR_parsers
  // https://goo.gl/9BbDd0
  // https://zaa.ch/jison/try
  // https://www.cs.uic.edu/~spopuri/cparser.html
  // https://en.wikipedia.org/wiki/Shift-reduce_parser
  // https://en.wikipedia.org/wiki/Terminal_and_nonterminal_symbols


  function parseError (my_dict, my_message) {
    var dict = my_dict;
    dict.current_error_count++;
    console.log("[error] (#" + dict.current_error_count + "): " + my_message);
  }

  function sizeOf(my_list) {
    var str = "",
      i,
      len;
    for (i = 0, len = my_list.length; i < len; i += 1) {
      str += my_list[i];
    }
    return str.length * 4;
  }

  function relocateStack(my_old_view, my_new_view, my_len) {
    var i;
    for (i = 0; i < my_len; i += 1) {
      my_from.setInt8(i, my_to.getInt8(i)); 
    }
  }

  function setParserStackList(my_dict, my_depth) {
    function setStack(my_param) {
      var util_dict = YY.util_dict, 
        stack = my_param + "_stack",
        view = my_param + "_view",
        top = my_param + "_top",
        bottom = my_param + "_bottom",
        tmp,
        len,
        few;

      // initialize new or move existing arraybuffer to new (larger) one
      if (my_dict[stack] === undefined) {
        my_dict[stack] = util_dict.setBuffer(my_depth);
      } else {
        tmp = util_dict.setBuffer(my_depth);
        len = my_dict.state_stack.byteLength;
        few = util_dict.setView(tmp);
        my_dict[stack] = relocateStack(my_dict[view], few, len);
      }

      // (yyssa/yyvsa/yylsa)
      my_dict[view] = util_dict.setView(my_dict[stack]);

      // (yyss/yyvs/yyls)
      my_dict[bottom] = 0;
      
      // (yyssp/yyvsp/yylsp)
      my_dict[top] = my_dict.stack_size - 1;
    }

    // The state stack: Does not shift symbols on to the stack. 
    // Only a stack of states is maintained.
    setStack("state");
    
    // This semantic stack: Grows parallel to the state stack. At 
    // each reduction, semantic values are popped off this stack and the 
    // semantic action is executed.
    setStack("semantic");

    my_dict.stack_size = my_dict.stack_initial_depth;
    my_dict.popStack = function (my_dict, n) {
      my_dict.semantic_top = my_dict.semantic_top - n || 1;
      my_dict.state_top = my_dict.state_top - n || 1;
    };
  }

  function backupState(my_dict) {
    var dict = my_dict,
      lookup = YY.table_dict;

    // First try to decide without looking at lookahead symbol by looking
    // at what is set in current_state
    dict.truc = lookup.set_state_action[dict.parse_current_state];
    if (dict.truc == dict.is_state_default_action) {
      defaultAction(dict);
      return;
    }

    // No default action => get lookahead token if don't already have one

    // the lookahead_symbol is either an empty_token or end_of_file_reached 
    // or a valid token in external form. Note: lex should also set the
    // lookahead_symbol_semantic_value (it doesn't)
    if (dict.lookahead_symbol === dict.empty_token) {

      // note, passing addresses of semantic_stack_evaluation_result_pointer
      // and location_stack_evaluation_result_pointer and not the actual values
      // plus nothing being passed is being used in YYLEX so we might aswell
      // not pass anything until we find out whether the parameters are used...
      // http://www.cplusplus.com/doc/tutorial/pointers/
      dict.lookahead_symbol = YY.Lexer();

      // curiousity kills the cat
      if (dict.is_debug === 1) {
        console.log("[info] Reading a token: ");
        console.log(dict.lookahead_symbol);
        console.log(dict.lookahead_symbol_semantic_value);
      }
    }

    // Convert token to internal form (in lookahead_symbol_as_number) for 
    // indexing tables with

    // This is the end of the input. Don't call YYLEX any more.
    if (dict.lookahead_symbol <= 0) {
      dict.lookahead_symbol_as_number = 0;
      dict.lookahead_symbol = dict.end_of_file_reached;
      if (dict.is_debug === 1) {
        console.log("[info] Now at end of input.");
      }
    } else {
      dict.lookahead_symbol_as_number = translate(dict.lookahead_symbol);
      if (dict.is_debug === 1) {
        console.log(
          "[info] Next token is " + dict.lookahead_symbol + " (" +
          lookup.token_number_of_token[dict.lookahead_symbol_as_number] + ")"
        );

        // Give the individual parser a way to print the precise meaning 
        // of a token, for further debugging info.
        console.log(
          "[info] Symbol: " + dict.lookahead_symbol + ". Semantic value: " +
          dict.lookahead_symbol_semantic_value
        );
      }
    }

    // add character to truc. ah...?
    dict.truc += dict.lookahead_symbol_as_number;

    // do the default action (and stop) if any of these are met
    if (dict.truc < 0 || dict.truc > dict.index_last_state_action ||
      lookup.state_action_valid[dict.truc] !== dict.lookahead_symbol_as_number
    ) {
      defaultAction(dict);
      return;
    }

    // else improvise
    dict.truc = dict.lookup.state_action[dict.truc];

    // truc can be rule or state, now it is what to do for this token type 
    // in this current state.
    // 1) Negative => reduce, -truc is rule number.
    // 2) Positive => shift, truc is new state.
    // 3) if new state is final state => no shift, just return success
    // 4) if 0 or most negative number => error.
    if (dict.is_debug === 1) {
      console.log("[info] Truc was set to :" + dict.truc);
    }

    if (dict.truc < 0) {
      if (dict.truc == dict.is_state_default_action) {
        errorLab(dict);
        return;
      }
      dict.truc = -dict.truc;
      reduceState(dict);
      return;
    }

    if (dict.truc === 0) {
      errorLab(dict);
      return;
    }

    // the end
    if (dict.truc === dict.final_rule) {
      acceptLab(dict);
      return;
    }

    // Shift the lookahead token.
    if (dict.is_verbose) {
      console.log(
        "[info] - Shifting token " + dict.lookahead_symbol + " (" + 
        lookup.token_number_of_token[dict.lookahead_symbol_as_number] + ")"
      );
    }

    // Discard the token being shifted unless it is eof.
    if (dict.lookahead_symbol !== dict.end_of_file_reached) {
      dict.lookahead_symbol = dict.empty_token;
    }

    // Adjust stacks
    dict.semantic_top = dict.semantic_top + 1;
    dict.semantic_view.setInt8(
      dict.semantic_top,
      dict.lookahead_symbol_semantic_value
    );

    // Count tokens shifted since error; after three, turn off error status.
    if (dict.shift_token_error_message_threshold) {
      dict.shift_token_error_message_threshold--;
    }
    dict.parse_current_state = dict.truc;
    newState(dict);
  }

  function reduceState (my_dict) {
    var dict = my_dict,
      lookup = YY.table_dict,
      tmp_semantic_top,
      i;

    // truc is the number of a rule to reduce with.
    dict.reduced_rule_right_hand_side_symbol_len =
      lookup.rule_right_hand_side_symbol_length[dict.truc];

    // If reduced_rule_right_hand_side_symbol_len (yylen) is nonzero, implement 
    // the default value of the action:
    // $$ = $1
    // Otherwise, this line sets semantic_stack_evaluation_result_pointer to 
    // the semantic value of the lookahead token. This behavior is undocumented
    // and Bison users should not rely upon it. Assigning to yyval
    // unconditionally makes the parser a bit smaller, and it avoids a
    // GCC warning that yyval may be used uninitialized.
    // Question is what this is used for...
    dict.semantic_stack_evaluation_result_pointer = dict.semantic_view.getInt8(
      1 - dict.reduced_rule_right_hand_side_symbol_len
    );

    if (dict.is_debug === 1) {
      console.log(
        "[info] - Reducing via rule " + dict.truc + " (line " +
        lookup.rule_line_pointer[dict.truc] + ")"
      );

      // Print the symbols being reduced, and their result.
      for (
        i = dict.lookup.right_hand_side_index[dict.truc];
        lookup.right_hand_side[i] > 0;
        i += 1
      ) {
        console.log(
          "[info] " + lookup.token_number_of_token[lookup.right_hand_side[i]]
        );
      }
      console.log(
        "[info] => " +
        lookup.token_number_of_token[
          lookup.rule_left_hand_side_symbol_number[dict.truc]
        ]
      );
    }

    // hum
    switch (dict.truc) {
      case 7:
        errorAccept(dict);
        break;
      case 9:
        YY.state_dict.flag_is_reverse_block = 0;
        if (YY.state_dict.flag_is_mode_assign_accept) {
          YY.state_dict.outputHeader(YY.state_dict, dict.semantic_view.getInt8(0));
        }
        break;
      case 10:
        YY.state_dict.flag_is_reverse_block = 1;
        if (YY.state_dict.flag_is_mode_assign_accept === 0) {
          YY.state_dict.outputHeader(YY.state_dict, dict.semantic_view.getInt8(0));
        }
       break;
      case 13:
        YY.state_dict.appendNonTerminalSymbol(
          YY.state_dict,
          YY.state_dict.flag_is_mode_assign_accept ^ YY.state_dict.flag_is_reverse_block
        );
        break;
      case 14:
        YY.state_dict.enterNonTerminalSymbol(
          dict,
          YY.state_dict.head_string,
          null,
          YY.state_dict.flag_is_mode_assign_accept ^ YY.state_dict.flag_is_reverse_block,
          0,
          1,
          0
        );
        break;
      case 16:
        YY.state_dict.appendNonTerminalSymbol(YY.state_dict);
        break;
      case 17:
        YY.state_dict.appendNonTerminalSymbol(YY.state_dict);
        break;
      case 21:
        YY.state_dict.head_string += dict.semantic_view.getInt8(dict.semantic_top);
        break;
      case 22:
        YY.state_dict.flag_body_class_start = 1;
        YY.state_dict.head_string += dict.semantic_view.getInt8(dict.semantic_top);
        break;
      case 23:

        // strcpy(BodyName[dict.body_number++], yyvsp[0]); this must return a
        // name (identifier), so it can be set later
        YY.state_dict.body_class_name_buffer_view.setInt8(
          YY.state_dict.body_number,
          dict.semantic_view.getInt8(dict.semantic_top)
        );
        YY.state_dict.body_number = YY.state_dict.body_number + 1;
        break;
      case 24:
        YY.state_dict.flag_is_mode_assign_accept = 1;
        break;
      case 25:
        YY.state_dict.flag_is_mode_assign_accept = 0;
        break;
    }

    // why?
    s.semantic_top -= dict.reduced_rule_right_hand_side_symbol_len;
    s.state_top -= dict.reduced_rule_right_hand_side_symbol_len;

    if (dict.is_debug === 1) {
      tmp_semantic_top = dict.semantic_bottom - 1;
      console.log("[info] - State stack now");
      while (tmp_semantic_top !== stack.semantic_top) {
        console.log(
          "[info]", " " + dict.semantic_view.getInt8(tmp_semantic_top)
        );
        tmp_semantic_top++;
       }
    }

    // up semantic and location stack, value stack will be done in newState
    // this is the only place yyval and yyloc are used, so they are
    // stack pointers? For n or value?
    dict.semantic_top = dict.semantic_top + 1;
    dict.semantic_view.setInt8(
      dict.semantic_top,
      semantic_stack_evaluation_result_pointer
    );

    // Now `shift' the result of the reduction.  Determine what state
    // that goes to, based on the state we popped back to and the rule
    // number reduced by.

    dict.truc = lookup.rule_left_hand_side_symbol_number[dict.truc];
    dict.parse_current_state = lookup.non_terminal_goto_method[
      dict.truc - dict.nt_base
    ] + dict.state_top;

    if (dict.parse_current_state >= 0 &&
      dict.parse_current_state <= dict.index_last_state_action && 
        dict.lookup.state_action_valid[dict.parse_current_state] ===
          dict.semantic_top) {
      dict.parse_current_state = dict.lookup.state_action[
        dict.parse_current_state
      ];
    } else {
      dict.parse_current_state = dict.lookup.default_goto_method[
        dict.truc - dict.nt_base
      ];
    }
    newState(dict);
  }

  function defaultAction(my_dict)  {
    var dict = my_dict,
      lookup = YY.table_dict;

    dict.truc = lookup.default_reduction_rule[dict.parse_current_state];
    if (dict.truc === 0) {
      errorLab(dict);
    }
    reduceState(dict);
  }

  function setState(my_dict) {
    var dict = my_dict;

    // intially set top to bottom to 0
    dict.state_top = dict.parse_current_state;
    if (dict.is_debug === 1) {
      console.log("[info] - Entering state: " + dict.parse_current_state);
    }
    backupState(dict);
  }

  function newState(my_dict) {

    // In all cases, when you get here, the value and location stacks
    // have just been pushed. so pushing a state here evens the stacks.
    my_dict.state_top = my_dict.state_top + 1;  
  }

  function acceptLab(my_dict) {
    my_dict.parse_result = 0;
    returnResult(my_dict);
  }

  function abortLab(my_dict) {
    my_dict.parse_result = 1;
    returnResult(dict);
  }

  function returnResult(my_dict) {
    return my_dict.parse_result;
  }

  function errorLab(my_dict) {
    var dict = my_dict,
      lookup = YY.table_dict,
      message,
      count,
      len,
      i;

    // Start i at -truc if negative, avoid negative indexes in YYCHECK
    function setCounter(my_truc) {
      if (my_truc < 0) {
        return -dict.truc;
      }
      return 0;
    }

    // If not already recovering from an error, report this error.
    if (dict.shift_token_error_message_threshold === 0) {
      dict.current_error_count += 1;

      if (dict.is_debug === 1) {
        dict.truc = lookup.set_state_action[dict.parse_current_state];
        if (dict.truc > dict.is_state_default_action &&
          dict.truc > dict.index_last_state_action
        ) {
          count = 0;

          // bonkers, won't work
          len = Math.ceil(
            sizeOf(dict.lookup.token_number_of_token) / dict.lookahead_symbol_pointer_size
          );

          for (i = setCounter(dict.truc); i < len; i += 1) {
            if (lookup.state_action_valid[i + dict.truc] === i) {
              count += 1;
            }
          }

          message = "parse error, unexpected " +
            lookup.token_number_of_token[translate(dict.lookahead_symbol)];

          if (count < 5) {
            count = 0;
            for (i = setCounter(dict.truc); i < len; i += 1) {
              if (dict.lookup.state_action_valid[i + dict.truc] === i) {

                // XXX ditch count and message
                if (count === 0) {
                  message += "expecting ";
                } else {
                  message += " or ";
                }
                message += dict.lookup.token_number_of_token[i];
                count += 1;
              }
            }
          }
          parseError(dict, message);
        }
      } else {
        parseError(dict, message);
      }
    }
    errorLabExtended(dict);
  }

  function errorLabExtended (my_dict) {
    var dict = my_dict,
      lookup = YY.table_dict;

    // If just tried and failed to reuse lookahead token after an error, discard
    if (dict.shift_token_error_message_threshold === 3) {
      if (dict.lookahead_symbol == dict.end_of_file_reached) {
        abortLab(dict);
        return;
      }

      // return failure if at the end of input
      console.log(
        "[info] Discarding token " + dict.lookahead_symbol + " (" + 
        lookup.token_number_of_token[lookahead_symbol_as_number] + ")."
      );
      dict.lookahead_symbol = dict.empty_token;
    }

    // Else will try to reuse lookahead token after shifting the error token.
    // Each real token shifted decrements this
    dict.shift_token_error_message_threshold = 3;

    // single call only, can do this in here, too
    errorHandle(dict);
  }

  function errorHandle (my_dict) {
    var dict = my_dict,
      lookup = YY.table_dict;

    dict.truc = lookup.state_action[dict.truc];
    if (dict.truc < 0) {
      if (dict.truc == dict.is_state_default_action) {
        errorPop(dict);
      }
      dict.truc = -dict.truc;
      reduceState(dict);
      return;
    } 

    if (dict.truc === 0) {
      errorPop(dict);
    }
    if (dict.truc == dict.final_rule) {
      acceptLab(dict);
    }

    console.log("[info] - Shifting error token.");

    dict.semantic_top = dict.semantic_top + 1;
    dict.semantic_view.setInt8(
      dict.semantic_top,
      dict.lookahead_symbol_semantic_value
    );
    dict.parse_current_state = dict.truc;
    newState(dict);
  }

  function errorAccept(my_dict) {
    my_dict.shift_token_error_message_threshold = 0;
  }

  function errorPop (my_dict) {
    var dict = my_dict,
      temp_state_top;

    if (dict.state_top === dict.state_bottom) {
      abortLab(dict);
    }
    dict.semantic_top = dict.semantic_top - 1;

    // XXX yystate = *--yyssp;
    dict.parse_current_state = dict.state_top = dict.state_top - 1;

    if (dict.is_debug === 1) {
      temp_state_bottom = dict.state_bottom - 1;
      console.log("[info] state stack snapshot:");
      while (temp_state_bottom !== dict.state_top) {
       console.log("[info] state: " + temp_state_bottom);
       temp_state_bottom += 1;
      }
    }
  }

  // -------------------------------- config------------------------------------
  YY.parse_dict = YY.util_dict.extendDict({}, {

    // ----------------------------- options -----------------------------------

    // (YYDEBUG)
    "debug": 0,

    // (yyerror) this reports and bounces error count, so leave it for now
    "parseError": parseError,
  
    // build long string of everything we have, then get its length
    "sizeOf": sizeOf,

    // (YYFLAG) flag rerouting to default action in backup	
    "is_state_default_action": -32768,

    // (YYLAST)
    "index_last_state_action": 53,

    // (YYFINAL (rule?)
    "final_rule": 43,
    
    // (yychar*) - YY.char_pointer_size - size of char*, we set it at 4 via:
    // http://stackoverflow.com/a/40679845/536768
    // only used once and we multiply * 4 to divide by 4. skip?
    "lookahead_symbol_pointer_size": 4,

    // ----------------------------- gotos -------------------------------------

    // (yybackup) -  the main parsing code starts here
    // Do appropriate processing given the current state. Read a lookahead 
    // token if we need one and don't already have one.
    "backupState": backupState,

    // (yysetstate) - set a new state, incrementing stacks no longer done here
    "setState": setState,

    // (yyreduce) - Do a reduction.
    "reduceState": reduceState,

    // (yynewstate) Push a new state, which is found in parse_current_state.
    "newState": newState,

    // (yyerrorlab) - detecting errors
    "errorLab": errorLab,

    // (yyerrlab1) - error raised explicitly by an action
    "errorLabExtended": errorLabExtended,

    // (yyerrhandle) - single call only
    "errorHandle": errorHandle,

    // (yyerrok)
    "errorAccept": errorAccept,

    // (yyerrpop) - pop current state because it cannot handle the error token                                   |
    "errorPop": errorPop,

    // (yyacceptlab) - YYACCEPT comes here
    "acceptLab": acceptLab,

    // (yyabortlab) - end too soon
    "abortLab": abortLab,

    // pass back 0, 1, 2 
    "returnResult": returnResult,

    // (yydefault) - do the default reduction (action) for the current state.
    "defaultAction": defaultAction,

    // (yystate) Flex uses as alias for YY_START (that's used by AT&T lex, ah.
    "parse_current_state": null,

    // (yyerrstatus) Number of tokens to shift before error messages enabled.
    "shift_token_error_message_threshold": 0,

    // (yynerrs) [gram.tab.c] - Error counter
    "current_error_count": 0,

    // (YYEMPTY) [gram.tab.c] empty flag, set when parse is called as initial
    // lookahead symbol
    "empty_token": -2,

    // (YYEOF) end of file
    "end_of_file_reached": 0,

    // (YYNTBASE) maybe the number of actual rules (Bison adds 1 for accept)
    "nt_base": 14,

    // (YYTERROR) the audacity... just write 1, no? also, only used inside 
    // errorHandle, why not just use 1?
    "terror": 1,

    // ---------------------------- stacks -------------------------------------
  
    // A stack is an area of memory that holds local variables and parameters 
    // used by any function and remembers the order in which functions are 
    // called so that function returns occur correctly. Refer to the stacks 
    // through separate pointers to allow overflow to reallocate them elsewhere.

    // quick reference:
    // state_view         yyssa
    // state_top          yyssp
    // state_bottom       yyss
    // semantic_view      yyvsa
    // semantic_top       yyvsp
    // semantic_bottom    yyvs

    // (YYPOPSTACK) [gram.tab.c] - remove n items off the top opf the stack.
    "popStack":  null,

    // (YYSTACK_RELOCATE)
    // Relocate STACK from its old location to the new one. The local variables 
    // (have been local to .parse()!!) YYSIZE) and YYSTACKSIZE give the old and 
    // new number of elements in the stack, and YYPTR gives the new location of 
    // the stack. Advance YYPTR to a properly aligned location for the next stack.
    // https://opensource.apple.com/source/cc/cc-798/bison/bison.hairy.auto.html
    // Mozilla has an arrayBuffer tranfer which extends without copying but not 
    // supported anywhere else
    // Copy STACK COUNT objects FROM to TO. source and destination don't overlap
    "relocateStack": relocateStack,

    // () [gram.tab.c] using ArrayBuffer
    // http://www.javascripture.com/ArrayBuffer
    "setParserStackList": setParserStackList,

    // (yystacksize) will also be overwritten externally, no need to update 
    // on relocates
    "stack_size": null,

    // (YYPURE) [gram.tab.c]
    // Hardcoded. Pure parser = reeentrant = can be called during modification
    // https://www.gnu.org/software/bison/manual/html_node/Pure-Decl.html
    "is_pure": 0,

    // (lsp_needed) [gram.tab.c] WE WON'T Use locations, as in: 
    // https://fbb-git.github.io/bisoncpp/bisonc++api.html
    // LTYPE__ d_loc__ The location type value associated with a terminal token.
    // It can be used by, e.g., lexical scanners to pass location information
    // of a matched token to the parser in parallel with a returned token.
    // It is available only when %lsp-needed, %ltype or %locationstruct is set.

    // Bonus: http://acronymsmeanings.com/full-meaning-of/yylsp/
    // "is_location_type_needed": 0,

    // (YYINITDEPTH) [gram.tab.c] Initial size of the parser's stacks.
    "stack_initial_depth": 200,

    // (YYMAXDEPTH) maximum size the stacks can grow to (effective only if the 
    // built-in stack extension method is used). Do not make this value too 
    // large, as results may be undefined if 
    // size_max < getStackTotalBytes(stack_list_max_depth) is called.
    "stack_list_max_depth": 10000,

  });

  // ----------------------------- PARSE ---------------------------------------

  // #line 315 "/usr/share/bison/bison.simple"
  // The user can define "my_unused_param" as name of an argument to be passed
  // into parse. It should actually point to an object. Grammar actions can 
  // access the variable by casting it to the proper pointer type.
  // https://en.wikipedia.org/wiki/Liskov_substitution_principle

  function parse(my_unused_param) {
    var parse_dict = YY.parse_dict,
      util_dict = YY.util_dict,
      state_dict = YY.state_dict,
      runtime_dict;

    // differentiate between reentrant non reentrant parser. Reentrant means
    // it can be called again while processing (anything real time), therefore
    // all variables should only be locally set. If this is not the case, 
    // variables can go onto the global option dict.
    if (parse_dict.is_pure) {
      runtime_dict = util_dict.extendDict({}, parse_dict);
    } else {
      runtime_dict = parse_dict;
    }

    // add runtime local parameters
    runtime_dict = util_dict.extendDict(runtime_dict, {
    
      // (yychar) [gram.tab.c] Lookahead symbol, upcoming token, this should be
      // the right hand side = value, this is the token returned, like INTEGER
      // in the token_dict examplem this is returned/set by the lexer
      "lookahead_symbol": null,

      // (yychar1) Lookahead token as an internal (translated) token number.
      // This is derived from what lookahead_symbol returned/set by the lexer
      "lookahead_symbol_as_number": 0,

      // (yylval) [gram.tab.c] Semantic value of lookahead symbol, l/rval stands
      // for left/right side value of a key/value pair, so this is left = key
      // Note: Careful: this is not yyval!, setting this to "TAG" or "SYMBOL"
      // in lexer = their number equivalents. this is the actual value detected.
      // This is returned/set by the lexer
      "lookahead_symbol_semantic_value": null,

      // (yylloc) [gram.tab.c] - Location data for the lookahead symbol. 
      // CAREFUL: not yyloc!. This is returned/set by lexer but not in this case.
      //"lookahead_symbol_location_value": null,

      // (yyresult) What eventually will be returned, spoiler: 0, 1, or 2...
      "parse_result": null,

      // (yyn) An all purpose variable... sigh. May represent state, rule or i
      // too bad is_it_a_bird_or_a_plane is too long
      "truc": null,

      // (yyval) Variable used to return result of semantic evaluation 
      // from action routine (this was ival), not passed to lexer, this is just
      // a pointer to where in the semantic stack we currently are..
      "semantic_stack_evaluation_result_pointer": null,

      // (yyloc) Variable used to return result of location evaluation 
      // from action routine, loco. Goes with yyval (this was loco), also not
      // passed to the lexer. This is a pointer, but one which also be ++/..ed
      //"location_stack_evaluation_result_pointer": null,

      // (yylen) When reducing, the number of symbols on the RHS (right hand 
      // side) of the reduced rule (length of RHS of a rule).
      "reduced_rule_right_hand_side_symbol_len": null,

    });

    // set name buffers
    state_dict.body_class_name_buffer_array = util_dict.setBuffer(100);
    state_dict.body_class_name_buffer_view = util_dict.setView(
      state_dict.body_class_name_buffer_array
    );

    // set parser stacks
    setParserStackList(runtime_dict, runtime_dict.stack_initial_depth);

    // Set the ball rolling!
    if (runtime_dict.is_debug === 1) {
      console.log("[info] Starting parse.");
    }

    // Initial state
    runtime_dict.parse_current_state = 0;
    runtime_dict.shift_token_error_message_threshold = 0;
    runtime_dict.current_error_count = 0;

    // Cause a token to be read by setting to -2
    runtime_dict.lookahead_symbol = runtime_dict.empty_token;

    // Initialize stack pointers.
    // Waste one element of value and location stack so that they stay on the 
    // same level as the state stack. The wasted elements are never initialized.
    // Note: setting top = bottom
    runtime_dict.state_top = runtime_dict.state_bottom;
    runtime_dict.semantic_top = runtime_dict.semantic_bottom;

    // ------------------------------ start ------------------------------------
    // make sure to pass runtime_dict around
    setState(runtime_dict);
  }

  YY.Parser = parse;

}(window, YY, Math, Error));

// =============================================================================
//                                  Lexer
// =============================================================================
(function (window, YY, Math, Error) {
  "use strict";

  // ported from:
  // https://goo.gl/c9vQOo
  // resources:
  // http://www.cs.man.ac.uk/~pjj/complang/usinglex.html
  // http://westes.github.io/flex/manual/FAQ.html#FAQ
  // https://goo.gl/9BbDd0
  // https://github.com/aaditmshah/lexer
  // https://ds9a.nl/lex-yacc/cvs/lex-yacc-howto.html
  // http://www.cs.man.ac.uk/~pjj/cs211/ho/node6.html
  // http://www.tldp.org/HOWTO/Lex-YACC-HOWTO-6.html

  function terminate (my_dict) {
    return my_dict.nullinger;
  }

  function setEofState(my_dict, my_state) {
    return my_dict.buffer_end + my_state + 1;
  }

  function echo (my_dict) {
    var dict = my_dict;
    dict.file_output.push(
      dict.file_input.substr(
        dict.input_position_being_read,
        dict.matched_string_len
      )
    ); 
  }

  function matchText (my_dict) {
    var dict = my_dict,
      lookup = YY.table_dict,
      counter;
    
    function getCount(my_counter) {
      return lookup.check[lookup.base[dict.current_state] + my_counter];
    }

    do {

      counter = lookup.ec[
        Math.abs(dict.current_run_character_position_address)
      ];

      if (lookup.accept[dict.current_state]) {
        dict.last_accepted_state = dict.current_state;
        dict.last_accepted_character_position =
          dict.current_run_character_position;
      }

      while (getCount(counter) !== dict.current_state) {
        dict.current_state = lookup.def[dict.current_state];
        if (dict.current_state >= 33 ) {
          counter = lookup.meta[counter];
        }
      }

      dict.current_state = lookup.nxt[lookup.base[dict.current_state] + counter];
      dict.current_run_character_position =
        dict.current_run_character_position + 1;

    } while (lookup.base[dict.current_state] !== 40);
  }

  function findAction (my_dict) {
    var dict = my_dict,
      lookup = YY.table_dict;

    // (yy_act) int only used within lexer
    dict.action_to_run = lookup.accept[dict.current_state];

    // have to back up
    if (dict.action_to_run === 0) {
      dict.current_run_character_position =
        dict.last_accepted_character_position;
      dict.current_state = dict.last_accepted_state;
      dict.action_to_run = lookup.accept[dict.current_state];
    }
    doBeforeAction(dict);
  }

  function doBeforeAction (my_dict) {
    var dict = my_dict;

    // setting pointer to current_run start position = "string starting from"
    dict.input_position_being_read = dict.current_run_buffer_start_position;
    dict.matched_string_len = dict.current_run_character_position -
      dict.current_run_buffer_start_position;
    dict.buffer_position_being_read = dict.current_run_character_position;

    // Note, here we backup the current character position address! and then 
    // add explicit null character? (*yy_cp = '\0'), the length of the string 
    // is +2 bytes, because the NUL character \0 still counts as a character 
    // and the string is still terminated with an implicit \0
    // Note: all strings end with implicit end of string \0!, words too!
    dict.backup_character = dict.current_run_character_position_address;
    //dict.current_run_character_position_address = "\0";
  }

  function restoreOriginalOffset (my_dict) {
    my_dict.input_position_being_read = null;
  }

  function attemptNulTransition (my_dict, my_lexer_current_state) {
    var dict = my_dict,
      table_dict = YY.table_dict,
      counter = 1;

    dict.current_run_character_position_address =
      dict.buffer_position_being_read;

    if (table_dict.accept[my_lexer_current_state]) {
      dict.last_accepted_state = my_lexer_current_state;
      dict.last_accepted_character_position =
        dict.current_run_character_position;
    }
    while (table_dict.check[table_dict.base[my_lexer_current_state] + counter] !==
      my_lexer_current_state
    ) {
      my_lexer_current_state = table_dict.def[my_lexer_current_state];
      if (my_lexer_current_state >= 33) {
        counter = table_dict.meta[counter];
      }
    }
    my_lexer_current_state = table_dict.nxt[
      table_dict.base[my_lexer_current_state] + counter
    ];

    // is jammed
    if (my_lexer_current_state === 32) {
      return 0;
    }
    return my_lexer_current_state;
  }

  function getPreviousState(my_dict) {
    var dict = my_dict,
      table_dict = YY.table_dict,
      tmp_lexer_current_state = dict.start_state,
      i = dict.current_run_character_position,
      init_pos = dict.input_position_being_read + dict.more_adjust, 
      counter;

    function lookup(my_state, my_counter) {
      return table_dict.check[table_dict.base[my_state] + my_counter];
    }

    for (i = init_pos; i < dict.buffer_position_being_read; i += 1) {
      if (dict.current_run_character_position_address) {
        counter = lookup.ec[
          Math.abs(dict.current_run_character_position_address)
        ];
      } else {
        counter = 1;
      }

      if (table_dict.accept[tmp_lexer_current_state]) {
        dict.last_accepted_state = tmp_lexer_current_state;
        dict.last_accepted_character_position =
          dict.current_run_character_position;
      }

      while (lookup(tmp_lexer_current_state, my_counter)
        !== tmp_lexer_current_state)
      {
        tmp_lexer_current_state = table_dict.def[tmp_lexer_current_state];
        if (tmp_lexer_current_state >= 33) {
          counter = table_dict.meta[counter];
        }
      }
      tmp_lexer_current_state = lookup(tmp_lexter_current_state, counter);
    }
    return tmp_lexer_current_state;
  }

  function readChunkFromInput(my_dict, my_buffer_top, my_chunk_size) {
    var input_len = dict.file_input.byteLength,
      view = dict.current_buffer.buffer_view,
      buffer_position_being_read,
      character,
      n;

    for (n = 0;
         n < my_chunk_size && (my_buffer_top + n) < input_len;
         n += 1
    ) {
      buffer_position_being_read = my_buffer_top + n;
      character = dict.file_input.charCodeAt(buffer_position_being_read);

      // line break
      if (character === '\n') {
        if (n >= 1 && view.getInt8(buffer_position_being_read - 1) === '\r') {
          view.setInt8(buffer_position_being_read - 1, character);
        } else {
          view.setInt8(buffer_position_being_read++, character);
        }

      // end of file, only here we set character_len?
      } else if (buffer_position_being_read === input_len) {
        dict.buffer_characters_read = buffer_position_being_read;

      // normal character
      } else {
        view.setInt8(buffer_position_being_read + character);
      }
    }
  }

  function getNextBuffer (my_dict) {
    var dict = my_dict,
      current_buffer_view = dict.current_buffer.buffer_view,
      current_buffer_characters_read = current_buffer_view.byteLength,
      content_pointer = dict.input_position_being_read,
      character_position = dict.buffer_position_being_read,
      current_buffer_offset,
      number_to_move,
      number_to_read,
      return_value,
      memory_address,
      new_size,
      i;
    
    if (character_position > dict.current_buffer.buffer_characters_read + 1) {
      throw new Error("[error] Fatal flex scanner - end of buffer missed");
    }

    // Don't try to fill the buffer, so this is an EOF (end of file).
    if (dict.current_buffer.buffer_fill === 0) {

      // We matched a single character, the EOB, treat this as a final EOF = 1
      if (character_position - content_pointer - dict.more_adjust === 1) {
        return dict.end_of_block_action_end_of_file;
      }

      // We matched some text prior to the EOB, first process it = 2
      return dict.end_of_block_action_last_match;
    }

    // Try to read more data - First move last chars to start of buffer.
    // //XXX *(dest++) = *(source++); totally not sure
    number_to_move = (character_position - content_pointer) - 1;
    for (i = 0; i < number_to_move; i++) {

      // XXX won't work depending on what is in pseudo_pointer to yytext
      current_buffer_view.setInt8(current_buffer_characters_read++, content_pointer++);
    }

    // don't read, it's not guaranteed to return an EOF, just force an EOF
    if (dict.current_buffer.buffer_status === dict.buffer_eof_pending) {
      dict.current_buffer.buffer_characters_read = dict.buffer_characters_read = 0;
    } else {
      number_to_read = dict.current_buffer.buffer_size -
        number_to_move - 1;

      while (number_to_read <= 0) {
        
        // not sure I can use len here, but can't subtract the DataView
        current_buffer_offset = character_position - current_buffer_characters_read;
        character_position =
          dict.current_buffer.buffer_view.getInt8(
            current_buffer_offset
          );

        number_to_read = dict.current_buffer.buffer_size - number_to_move - 1;

        if (number_to_read > dict.buffer_read_chunk_size) {
          number_to_read = dict.buffer_read_chunk_size;
        }

        // Read in more data ~ buffer top? yy_n_chars?
        // We have to pass in the correct position on the buffer, this should 
        // return buffer_characters_read or at least set it
        // XXX this will fail, because memory address is never initialized
        memory_address =
          dict.current_buffer.buffer_view.getInt8(number_to_move);
        readChunkFromInput(dict, memory_address, number_to_read);
        dict.current_buffer.buffer_characters_read = dict.buffer_characters_read;
      }
    
      
      if (dict.buffer_characters_read === 0) {
        if (number_to_move === dict.more_adjust) {
          return_value = dict.end_of_block_action_end_of_file;
          restartLex(dict, dict.file_input);
        } else {
          return_value = dict.end_of_block_action_last_match;
          dict.current_buffer.buffer_status = dict.buffer_eof_pending;
        }
      } else {
        return_value = dict.end_of_block_action_continue_scan;
      }

      dict.buffer_characters_read += number_to_move;
      dict.current_buffer.buffer_view.setInt8(
        dict.current_buffer.buffer_characters_read,
        dict.buffer_end_character
      );
      dict.current_buffer.buffer_view.setInt8(
        dict.current_buffer.buffer_characters_read + 1,
        dict.buffer_end_character
      );

      // XXX will fail because of undefined memory address
      content_pointer =
        dict.current_buffer.buffer_view.getInt8(0);
      return return_value;
    }
  }

  function doAction (my_dict) {
    var dict = my_dict,
      state_dict = YY.state_dict,
      parse_dict = YY.parse_dict,
      table_dict = YY.table_dict;

    switch (dict.action_to_run) {
      case 0:
        dict.current_run_character_position_address =
          dict.backup_character;
        dict.current_run_character_position =
          dict.last_accepted_character_position;
        dict.current_state = dict.last_accepted_state;

        // must back up, undo the effects of doBeforeAction
        return findAction(dict);
      case 1:
        parse_dict.lookahead_symbol =
          dict.input_position_being_read + 1;
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.TAG;
        return 1;
      case 2:
        parse_dict.lookahead_symbol =
          dict.input_position_being_read;
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.SYMBOL;
        return 1;
      case 3:
        state_dict.flag_is_block_start_or_end = 1;
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.OPEN;
        return 1;
      case 4: 
        state_dict.flag_is_block_start_or_end = 0;
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.CLOSE;
        return 1;
      case 5:
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.CTRL_ASSIGN;
        return 1;
      case 6: 
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.CTRL_IGNORE;
        return 1;
      case 7:
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.REVERSE;
        return 1;
      case 8:
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.STARTCLASS;
        return 1;
      case 9:
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.LET;
        return 1;
      case 10:
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.NL;
        return 1;
      case 11:
        parse_dict.lookahead_symbol_semantic_value =
          table_dict.token_dict.REMARK;
        return 1;
      case 12: 
        return 1;
      case 13:
        console.log(
          "[error] Lexical mistake: " + dict.input_position_being_read
        );
        return 1;
      case 14:
        echo();
        return 1;
      case setEofState(dict, dict.initial):
        return terminate(dict);

      // (set to 15) a buffer end can be the end of a line or file? 
      case dict.buffer_end:

        // Amount of text matched not including the EOB char.
        dict.amount_of_matched_text = (dict.current_run_character_position -
          dict.input_position_being_read) - 1;

        // Undo the effects of doBeforeAction.
        dict.current_run_character_position_address = dict.backup_character;
        restoreOriginalOffset(dict);

        if (dict.current_buffer.buffer_status === dict.buffer_is_new) {

          // We're scanning a new file or input source.  It's possible that 
          // this happened because the user just pointed file input (yyin) at 
          // a new source and called yylex().  If so, then we have to assure
          // consistency between dict.current_buffer and our
          // globals.  Here is the right place to do so, because this is the 
          // first action (other than possibly a back-up) that will match for 
          // the new input source.
          // Note: this will not happen for now, so not settting input_file
          // on current_buffer anymore
          dict.buffer_characters_read = dict.current_buffer.buffer_characters_read;
          dict.current_buffer.buffer_status = dict.buffer_is_normal;
        }

        // Note that here we test for buffer_position_being_read 
        // "<=" to the position of the first EOB (end of block!) in the buffer, 
        // since buffer_position_being_read will already have been 
        // incremented past the NUL character (since all states make 
        // transitions on EOB to the end-of-buffer state).  Contrast this with 
        // the test in input().

        // ~ test character position to position of first end of block in buffer
        // check what character-position (c_buf_p) is and use index!
        if (dict.buffer_position_being_read <= 
          dict.current_buffer.buffer_view.getInt8(
            dict.current_buffer.buffer_characters_read
        )) {

          // This was really a NUL. This means end of a word or something, 
          // we can now try to transition "over" it? Think of a space character?
          dict.buffer_position_being_read =
            dict.input_position_being_read + dict.amount_of_matched_text;
          dict.current_state = getPreviousState(dict);

          dict.next_state = attemptNulTransition(dict, dict.current_state);
          dict.current_run_buffer_start_position =
            dict.input_position_being_read + dict.more_adjust;

          // Consume the NUL.
          if (dict.next_state) {
            dict.current_run_character_position =
              dict.buffer_position_being_read++;
            dict.current_state = dict.next_state;
            matchText(dict);
          } else {
            dict.current_run_character_position =
              dict.buffer_position_being_read;
            findAction(dict);
          }
        } else {

          // reading more input file handler
          switch (getNextBuffer(dict)) {

            case dict.end_of_block_action_end_of_file:

              // removed check for thatsAWrap, always true

              // Note: because we've taken care in getNextBuffer() to have 
              // set up matched_string (yytext), we can now set up
              // buffer_position_being_read so that if some total
              // hoser (like flex itself) wants to call the scanner after we 
              // return the nullinger, it'll still work - another nullinger 
              // will get returned.
              dict.buffer_position_being_read =
                dict.input_position_being_read + dict.more_adjust;

              // XXXY why do I have to algebra state_state?
              // yy_act = YY_STATE_EOF(YY_START);
              // #define YY_START ((yy_start - 1) / 2)
              //function setEofState(my_dict, my_state) {
              //  return my_dict.buffer_end + my_state + 1;
              //}
  
              dict.action_to_run = setEofState(dict, (dict.start_state - 1)/2);
              doAction(dict);
              break;

            case dict.end_of_block_action_continue_scan:
              dict.buffer_position_being_read =
                dict.input_position_being_read +
                  dict.amount_of_matched_text;
              dict.current_state = getPreviousState(dict);
              dict.current_run_character_position =
                dict.buffer_position_being_read;
              dict.current_run_buffer_start_position =
                dict.input_position_being_read + dict.more_adjust;
              matchText(dict);
              break;

            case dict.end_of_block_action_last_match:

              // XXX this returns the character, not the buffer?
              dict.buffer_position_being_read =
                dict.current_buffer.buffer_view.getInt8(
                  dict.current_buffer.buffer_characters_read
                );
              dict.current_state = getPreviousState(dict);
              dict.current_run_character_position =
                dict.buffer_position_being_read;
              dict.current_run_buffer_start_position =
                dict.input_position_being_read + dict.more_adjust;
              findAction(dict);
              break;
          }
        }
        break;
      default:
        throw new Error("[error] Flex scanner internal error, no action found");
      }
  }

  YY.lex_dict = YY.util_dict.extendDict({}, {

    // -------------------------------- config------------------------------------

    // (yy_init) ensures lexer is initialized only once
    "init": 1,

    // (yy_start) Start state number, some weird algebra being applied to it
    "start_state": null,

    // (yyin) file input file
    "file_input": null,

    // the length of the file input
    "file_input_length": null,

    // (yyout) file output file
    "file_output": null,

    // (*yy_c_buf_p) = pointer to current character, initially set to (char *) 0; 
    // so pointing to null character, we don't have those in JS though.
    "getCurrentCharacterFromPointer": getCurrentCharacterFromPointer,

    // -------------------------------- buffer -----------------------------------

    // (yy_current_buffer)
    "current_buffer": null,

    // (yy_buffer_state)
    "getBufferDict": getBufferDict,

    // (yy_create_buffer) and (yy_init_buffer) load file into buffer state
    "createBuffer": createBuffer,

    // (yy_flush_buffer) - this adds two eof characters to the buffer signaling
    // end of file, then jamming it (?). Not a flush for me.
    "clogBuffer": clogBuffer,

    // (yy_load_buffer_state)
    "loadBuffer": loadBuffer,

    // actually put the input file into the buffer
    "fillBuffer": fillBuffer,

    // (YY_END_OF_BUFFER_CHAR)
    "buffer_end_character": 0,

    // (YY_BUFFER_NEW) what elaborate way to say 0...
    // declared inside buffer state dict, not sure this can be pulled out
    "buffer_is_new": 0,

    // (YY_BUFFER_NORMAL)
    // declare inside buffer state dict,not sure this can be pulled out
    "buffer_is_normal": 1,

    // (yy_n_chars) number of characters read into yy_ch_buf
    // CAREFUL, also defined inside state buffer.
    "buffer_characters_read": null,

    // (YY_BUF_SIZE) buffer created with this length to get
    // arbitrary inputs and requiring to handle overflows
    // (later...)
    "buffer_default_size": 16384,

    // (YY_BUFFER_EOF_PENDING)
    // When an EOF's been seen but there's still some text to process
    // then we mark the buffer as YY_EOF_PENDING, to indicate that we
    // shouldn't try reading from the input source any more.  We might
    // still have a bunch of tokens to match, though, because of
    // possible backing-up.
    //
    // When we actually see the EOF, we change the status to "new"
    // (via restartLex()), so that the user can continue scanning by
    // just pointing file input (yyin) at a new input file.
    // declared inside buffer state dict, not sure this can be pulled out
    "buffer_eof_pending": 2,

    // (yy_c_buf_p) => current run character position, this is the actual character
    // (position), index in dataView, not the character value itself!
    "buffer_position_being_read": 0,

    // (yytext_ptr) => #define yytext_ptr yytext, a macro pointing to yytext, 
    // line 286 why not use it directly? where is yytext itself defined?
    // external. Also this is a pointer and it is usually used in calculations
    // so this is probably an int
    "input_position_being_read": 0,

    // ----------------------------- gotos -------------------------------------
    // (GOTO yy_match)
    // not sure this is so easy to take out and the code is just executed 
    // disregarding the goto
    "matchText": matchText,
    
    // (GOTO yy_find_action)
    "findAction": findAction,

    // (YY_DO_BEFORE_ACTION) Done after the current pattern has been matched and 
    // before the corresponding action - sets up matched_string!! (yytext).
    "doBeforeAction": doBeforeAction,

    // (GOTO yy_do_action) - also called to access EOF actions. Must break lexer
    // method.
    "doAction": doAction,

    // (YY_RESTORE_YY_MORE_OFFSET) - XXX not really sure what this is supposed
    // to do.
    "restoreOriginalOffset": restoreOriginalOffset,

    // (ECHO fwrite (yytext, yyleng, 1, yyout)) 
    // Copy whatever the last rule matched to the standard output. Used to be 
    // fputs(), but since the string might contain NUL's, we now use fwrite(). 
    // This creates output file! Heureka. http://en.cppreference.com/w/c/io/fwrite
    // fwrite (
    //  pointer to first object of buffer to be writen ~ start position,
    //  size of each object,
    //  objects to write,
    //  destintion file
    // );
    "echo": echo,

    // (yyterminate) No semi-colon after return; correct usage is to write 
    // "yyterminate();" - we don't want an extra ';' after the "return" because 
    // that will cause some compilers to complain about unreachable statements.
    "terminate": terminate,

    // (YY_STATE_EOF) Action number for EOF rule of a given start state.
    "setEofState": setEofState,

    // (yy_get_previous_state) - get state just before the EOB char was reached.
    // EOB = Null/Nul character, we're talking end of word or space, which we 
    // need to transition "over" to continue. To do, we need to get what we
    // have now, which getPreviousState presumably does.
    "getPreviousState": getPreviousState,

    // (yy_try_NUL_trans) - try to make a transition on the NUL character
    // synopsis: next_state = yy_try_NUL_trans( current_state );
    "attemptNulTransition": attemptNulTransition,

    // (yytext) is the matched string (NULL-terminated) 
    // bref: yytext holds the text matched by the current token.
    // file defines yytext_ptr as yytext, not sure, but it returns a number
    // I thought atoi(yytext) would be the value?
    "matched_string": 0,

    // (yy_hold_char) holds the character lost when yytext is formed. It
    // really is a (static) char, so not pointer or int.
    "backup_character": null,

    // (yy_cp) int
    "current_run_character_position": null,

    // (*yy_cp) char - doesn't really make sense why this is the char and
    // cp is the int, but alas
    "current_run_character_position_address": null,

    // (yy_bp) int points to the position in yy_ch_buf of the start of
    // the current run.
    "current_run_buffer_start_position": null,

    // (yy_current_state) pulled out, declared in parse but used elsewhere
    "current_state": null,

    // (yy_last_accepted_state)
    "last_accepted_state": null,

    // (yy_last_accepted_cpos)
    "last_accepted_character_position": null,

    // (yy_act) - action_to_run
    "action_to_run": null,

    // (yyleng) is the length of the matched string
    // externals: http://epaperpress.com/lexandyacc/prl.html
    "matched_string_len": null,

    // (INITIAL) - #line 1 "gram.l"
    "initial": 0,

    // (YY_END_OF_BUFFER)
    "buffer_end": 15,

    // (YY_NULL) - returned upon end-of-file.
    "nullinger": 0,

    // (yy_amount_of_matched_text) int(!)
    "amount_of_matched_text": null,

    // (YY_MORE_ADJ)ust? this will never be set, could be 0, too?
    "more_adjust": 0,

    // (yy_next_state) only used in do_action
    "next_state": null,

    // (EOB_ACT_END_OF_FILE)
    "end_of_block_action_end_of_file": 1,

    // (EOB_ACT_LAST_MATCH)
    "end_of_block_action_last_match": 2,

    // (EOB_ACT_CONTINUE_SCAN) reached eg end of a word
    "end_of_block_action_continue_scan": 0,

    // (YY_READ_BUF_SIZE) - Amount of stuff to slurp up with each read.
    "buffer_read_chunk_size": 8192,

    // (YY_INPUT) Gets input and stuffs it into "buf". Number of characters read,
    // or nullinger is returned in "result". Why is c set to "*" in interactive?
    // note c is an integer, not a character, why not call it... i?, also
    // note there is yy_input, too, which is never called.
    "readChunkFromInput": readChunkFromInput,
  
    // (yy_get_next_buffer) - try to read in a new buffer (or block??)
    //  Returns a code representing an action:
    //   end_of_block_action_last_match (2) = goto? last match
    //   end_of_block_action_continue_scan (0) = continue from current position
    //   end_of_block_action_end_of_file (1) = end of file
    "getNextBuffer": getNextBuffer,
  });

  function getBufferDict() {
    return {

      // (yy_fill_buffer) Whether to try to fill the input buffer when we 
      // reach the end of it.
      "buffer_fill": null,

      // (yy_ch_buf) input buffer, only used to define view below
      "buffer": null,

      // data view for yy_ch_buf
      "buffer_view": null,

      // (yy_buf_size type = yy_size_t) - Size of input buffer in bytes, not 
      // including room for EOB characters.
      "buffer_size": null,

      // (yy_n_chars) Number of characters (or let's say elements) read into 
      // yy_ch_buf, not including EOB characters, which don't exist in JS
      // anyway. As data is read chunk by chunk, maybe this is the counter
      // on how many characters have been read into the buffer? Would make 
      // sense
      "buffer_characters_read": null,

      // (yy_buf_pos) current position in input buffer, this should then
      // be the position currently being scanned, DateView index?, it's 
      // initialized as *yy_buf_pos and char, not sure what it means, for
      // now we stay with position and use the index. starting at 0
      "buffer_position_being_read": 0,

      // (yy_buffer_status)
      "buffer_status": null,
    };
  }

  function fillBuffer(my_dict) {
    var dict = my_dict,
      buffer = dict.current_buffer,
      input = dict.file_input,
      len = dict.file_input_length = input.length,
      i;

    for (i = 0; i < len; i += 1) {
      buffer.buffer_view.setInt8(i, input.charCodeAt(i));
    }
  }

  function getCurrentCharacterFromPointer(my_dict) {
    var pos = my_dict.buffer_position_being_read;

    if (pos) {
      return my_dict.current_buffer.buffer_view.getInt8(pos);
    }

    // improvise.
    return '/0';
  }

  function loadBuffer(my_dict) {
    var dict = my_dict;

    // Not re-setting input file, and not filling the buffer here ether
    // fillBuffer(my_dict);

    dict.buffer_characters_read = dict.current_buffer.buffer_characters_read;

    // setting backup character to current character pointer, pointing to
    // null character, as this should return a char value, let's do 
    // it like this and return the value of char at this position
    // yy_hold_char = *yy_c_buf_p; It's really the only pointer this is used,
    // because *yy_c_buf_p is only in yy_input, yy_scan_buffer, yy_less, all
    // of which aren't used. So just write default null character here later.
    dict.backup_character = getCurrentCharacterFromPointer(dict);

    // yytext_ptr = yy_c_buf_p = yy_current_buffer->yy_buf_pos;
    // should likely begin at 0, so position being read is set appropriately
    // these should all be int (ah, the clarity...)
    dict.input_position_being_read =
      dict.buffer_position_being_read =
        dict.current_buffer.buffer_position_being_read;
  }

  function clogBuffer(my_dict, my_buffer) {
    var dict = my_dict;

    // We always need two end-of-buffer characters. The first causes
    // a transition to the end-of-buffer state. The second causes
    // a jam in that state. why at the beginning? Because this tells
    // we're at the end of the buffer, NOT at the end of the memory
    // and not at the end of the input file. It's the flag to read
    // more input. So much hassle.
    my_buffer.buffer_view.setInt8(0, dict.buffer_end_character);
    my_buffer.buffer_view.setInt8(1, dict.buffer_end_character);
    my_buffer.buffer_position_being_read = my_buffer.buffer_view.getInt8(0);
  }

  function createBuffer(my_dict) {
    var dict = my_dict,
      utils = YY.util_dict,
      buffer = getBufferDict();

    // http://stackoverflow.com/questions/36258224/what-is-isatty-in-c-for
    // my_file ? /* (isatty( fileno(file) ) > 0) */ 1 : 0;
    // not setting input on current_buffer, and no yy_is_interactive either
    // add 2 for EOF characters, although not really needed I think
    buffer.buffer_fill = 1;
    buffer.buffer_status = dict.buffer_is_new;
    buffer.buffer = utils.setBuffer(dict.buffer_default_size + 2);
    buffer.buffer_view = utils.setView(buffer.buffer);

    // clog it so input chunks can be read into buffer
    clogBuffer(dict, buffer);

    return buffer;
  }

  // ------------------------------ LEX ----------------------------------------

  // Default declaration of scanner
  function lexer() {
    var dict = YY.lex_dict,
      parse_dict = YY.parse_dict,
      i = 0;

    if (dict.init) {
      dict.init = 0;
      dict.file_input = parse_dict.file_in;
      dict.file_input_length = dict.file_input.length;
      dict.file_output = parse_dict.file_out || [];
      dict.start_state = 1;
      dict.current_buffer = createBuffer(dict);

      loadBuffer(dict);
    }

    // ------------------------------ start ------------------------------------
    // loop until end of file is reached, but will stop after reaching one token?
    while (1) {
      i++;
      console.log("iteration: " + i);
      if (i === 10) {
        break;
      }
      /*
      // set current position to current position in buffer
      dict.current_run_character_position = dict.buffer_position_being_read;

      // Support of yytext
      dict.current_run_character_position_address = dict.backup_character;

      // yy_bp points to the position in yy_ch_buf of the start of current run.
      dict.current_run_buffer_start_position = dict.current_run_character_position;

      // starts with 1
      dict.current_state = dict.start_state;

      // lint says don't declare inside a loop
      matchText(dict);

      // see if something was set
      findAction(dict);

      if (doAction(dict)) {
        break; 
      }
      */
    }
  }

  YY.Lexer = lexer;

}(window, YY, Math, Error));

// =============================================================================
// ================================  Start =====================================
// =============================================================================

(function (window, RSVP, YY, Error) {
  "use strict";

  // Finite automaton generator, mkfa %s programmed by 1995-1996 S.Hamada
  //
  // function:   grammar & vocabulary -> FA & header for parsing
  // usage:      mkfa <option>.. <file-spec1>..; or mkfa <option>.. <file-spec2>
  // option:     -dfa    DFA output(default)
  //             -nfa    NFA output
  //             -c      compatible FA output with g2fa
  //             -e[0|1] putting class reduction flag on edge(default on vertex)
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

  // ported from:
  // https://goo.gl/9ecYWU
  // resources:
  // https://julius.osdn.jp/juliusbook/en/

  // (setGram) [gram.tab.c]
  function setGrammarFile() {
    var dict = YY.parse_dict,
      state_dict = YY.state_dict,
      file_dict = YY.file_dict,
      grammar = YY.util_dict.getFileByType(file_dict, "grammar"),
      header = YY.util_dict.getFileByType(file_dict, "header");

    // set grammar file to input so parser (actually lexer) can pick it up
    dict.file_in = grammar.content;

    if (dict.is_compat_i) {
      header.content += "/dev/null\n";
    }

    header.content +=
      "// Header of class reduction flag for finite automaton parser\n\
       //                   made with mkfa " + "ver.1.44-flex-p1" + "\n\n\
       //        Do logical AND between label and FA's field #4, #5.\n\
       //\n\n";

    if (dict.is_debug === 1) {
      console.log("[info]: Now parsing grammar file\n");
    }

    // yyiha!
    YY.Parser();

    if (dict.is_debug === 1) {
      console.log(
        "[info] - Now modifying grammar to minimize states[" +
        YY.state_dict.grammar_modification_number + "]"
      );
    }
    state_dict.start_symbol = state_dict.start_symbol || state_dict.class_tree;
    header.content = header.content +
      "/* Start Symbol: " + state_dict.start_symbol.name + " */\n";
    state_dict.checkNoInstantClass(state_dict);
  }

  function setFileName(my_param, my_mode) {
    var dict = YY.file_dict,
      opts = YY.parse_dict,
      set_grammar= 0,
      set_voca = 0,
      set_output = 0,
      set_header = 0,
      key;

    function setFile(my_name, my_content) {
      return {"type": my_name, "content": my_content};
    }

    switch (my_mode) {

      // spec1, no file name provided
      case 1:
        dict.grammar = setFile("grammar", my_param);
        set_grammar = 1;
        break;
      case 2:
        dict.voca = setFile("voca", my_param);
        set_voca = 1;
        break;
      case 3:
        dict.output = setFile("output", my_param);
        set_output = 1;
        break;
      case 4:
        dict.header = setFile("header", my_param);
        set_header = 1;
        break;

      // spec2
      case 5:
        opts.is_init_with_filename = 1;
        dict.key = key = my_param[0];
        dict[key + ".grammar"] = setFile("grammar", my_param[1]);
        dict[key + ".voca"] = setFile("voca", my_param[2]);
        dict[key + ".header"] = setFile("header", my_param[4]);
        if (dict.is_nfa_output) {
          dict[key + ".nfa"] = setFile("output", my_param[3]);
        } else {
          dict[key + ".dfa"] = setFile("output", my_param[3]);
        }
        set_grammar = set_voca = set_output = set_header = 1;
        return 1;
    }

    // original file only returns 1 if all sets are 1. will not work?
    if (set_grammar + set_voca + set_output + set_header === 0) {
      return 0;
    }
    return 1;
  }

  // (setSwitch) [main.c]
  function setSwitch (my_input) {
    var dict = YY.parse_dict;
    switch (my_input) {
      case "l":
        dict.is_sent_list = 1;
        break;
      case "nw":
        dict.is_no_warning = 1;
        break;
      case "c":
        dict.is_compat_i = 1;
        break;
      case "db":
        dict.is_debug = 1;
        break;
      case "dfa":
        if (dict.is_init_with_filename && dict.is_debug === 1) {
          console.log("[info] dfa resolving option set");
        }
        dict.is_nfa_output = 0;
        break;
      case "nfa":
        if (dict.is_init_with_filename && dict.is_debug === 1) {
          console.log("[info] dfa resolving option set");
        }
        dict.is_nfa_output = 1;
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
        dict.is_verbose = 1;
        break;
      case "c":
        dict.is_compat_i = 1;
        break;
      case "e":
        dict.is_edge_start = 1;
        break;
      case "e1":
        dict.is_edge_start = 1;
        break;
      case "q0":
        dict.is_debug = 1;
        break;
      default:
        throw new Error("[error] Out of options...");
    }
  }

  // (getSwitch) [main.c]
  function getSwitch(my_parameter_list) {
    var len = my_parameter_list.length,
      file_mode = 0,
      file_finish = 0,
      parameter,
      i;

    // note, first parameter is skipped!
    for (i = 1; i < len; i += 1) {
      parameter = my_parameter_list[i];
      if (file_mode === 0) {
        if (parameter[0] === '-') {
          file_mode = setSwitch(parameter.slice(1));
        } else {
          throw new Error(
            "[error] first parameter character is not '-':" + parameter
          );
        }
      } else {
        file_finish = setFileName(parameter, file_mode);
        file_mode = 0;
      }
    }
    if (file_finish === 0) {
      throw new Error("[error] Something went wrong trying to set filenames.");
    }
  }

  // -------------------------------- config------------------------------------
  // makeshift file system
  YY.file_dict = {};

  // more YYucky options go here
  YY.parse_dict = YY.util_dict.extendDict({}, {

    // (optF) [main.c] when option -f is used (vs -fg) to fix issues with -dfa
    "is_init_with_filename": 0,

    // (SW_SentList) [main.c]
    "is_sent_list": 0,

    // (SW_NoWarning) [main.c]
    "is_no_warning": 0,

    // (NoNewLine) [main.c] - set new lines on logs, but we only console.log
    //"is_no_new_line": 0,

    // (SW_Compati) [main.c]
    "is_compat_i": 0,

    // (SW_Debug) [main.c]
    "is_debug": 0,

    // (SW_NFAoutput) [main.c]
    "is_nfa_output": 0,

    // (SW_Verbose) [main.c]
    "is_verbose": 0,

    // (SW_EdgeStart) [main.c]
    "is_edge_start": null,

    // (SW_EdgeAccpt) [main.c] - AcceptFlag on edge is under construction.
    // only set to 1 in setSwitch, then throws. Used in triplets where it
    // should be zero. So we can remove the checks.
    // "is_edge_accept": null,

    // (setGram) [gram.tab.c] - call parser
    "setGrammarFile": setGrammarFile,

    // (getSwitch) [main.c] naming and setting up files, two ways to call:
    //$mkfa -e1 -fg $rgramfile -fv $tmpvoca -fo $(dfafile).tmp -fh $headerfile
    //$mkfa -e1 -f ["sample" $rgramfile $tmpvoca $(dfafile).tmp $headerfile]
    "getSwitch": getSwitch,

    // (setSwitch) [main.c]
    "setSwitch": setSwitch
  });

  // ------------------------------ start --------------------------------------
  // initial call:
  //$mkfa -e1 -fg $rgramfile -fv $tmpvocafile -fo $(dfafile).tmp -fh $headerfile
  function createDfa() {
    var parameter_list = arguments;
    return new RSVP.Queue()
      .push(function () {

        // 1/6 main.c => set up files
        getSwitch(parameter_list);

        // 2/6 setGram => parse & lex
        setGrammarFile();
        console.log("grammared");
        // 3/6 setVoca
        setVocaFile();
        console.log("vocaed");
        console.log(YY);
        // 4/6 makeNFA
        //makeNFA();
        // 5/6 makeDFA
        //if (SWITCH_DICT.nfa_output === 0) {
        //  makeDFA();
        //}
        // 6/6 makeTriplets
        //makeTriplet();
      })
      .push(undefined, function (my_error) {
        console.log(my_error);
        throw my_error;
      });
  }

  window.createDfa = createDfa;

}(window, RSVP, YY, Error));


