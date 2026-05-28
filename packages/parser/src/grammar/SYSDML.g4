grammar SYSDML;

// ─── Parser Rules ────────────────────────────────────────────────────────────

file
    : modelDecl+ decl* EOF
    ;

modelDecl
    : (SFD | CLD) IDENT
    ;

decl
    : timeDecl
    | stockDecl
    | auxDecl
    | flowDecl
    | connectionDecl
    | gfDecl
    ;

// SFD constructs

timeDecl
    : TIME LBRACE timeProp+ RBRACE
    ;

timeProp
    : START COLON number
    | END   COLON number
    | STEP  COLON number
    ;

stockDecl
    : STOCK IDENT LBRACE stockProp+ RBRACE
    ;

stockProp
    : INIT     COLON expr
    | POSITION COLON posLiteral
    ;

flowDecl
    : FLOW IDENT LBRACE flowProp+ RBRACE
    ;

flowProp
    : FROM     COLON endpoint
    | TO       COLON endpoint
    | RATE     COLON expr
    | POSITION COLON posLiteral
    | VIA      COLON posArray
    ;

auxDecl
    : AUX IDENT EQ expr (LBRACE auxMetaProp+ RBRACE)?
    ;

auxMetaProp
    : POSITION COLON posLiteral   # AuxMetaPos
    ;

endpoint
    : IDENT
    | NULL
    ;

// CLD constructs

connectionDecl
    : IDENT ARROW_POS  IDENT (LBRACE connProp+ RBRACE)?    # PositiveCausal
    | IDENT ARROW_NEG  IDENT (LBRACE connProp+ RBRACE)?    # NegativeCausal
    | IDENT ARROW_FLOW IDENT (LBRACE connProp+ RBRACE)?    # FlowConnection
    ;

gfDecl
    : GF IDENT LBRACE gfProp+ RBRACE
    ;

gfProp
    : KIND     COLON gfKindValue  # GfKindProp
    | XSCALE   COLON numList      # GfXScaleProp
    | XPTS     COLON numList      # GfXPtsProp
    | YPTS     COLON numList      # GfYPtsProp
    | YSCALE   COLON numList      # GfYScaleProp
    ;

// gfKindValue accepts all valid kind literals; STEP is a reserved keyword so
// it cannot appear as IDENT — list it explicitly alongside the IDENT catch-all.
gfKindValue
    : IDENT
    | STEP
    ;

numList
    : LBRACKET (signedNumber (COMMA signedNumber)*)? RBRACKET
    ;

signedNumber
    : (PLUS | MINUS)? number
    ;

posLiteral
    : LBRACE IDENT COLON signedNumber COMMA IDENT COLON signedNumber RBRACE
    ;

posArray
    : LBRACKET (posLiteral (COMMA posLiteral)*)? RBRACKET
    ;

connProp
    : ANGLE COLON signedNumber
    | VIA   COLON posLiteral
    ;

// Expressions — rule hierarchy encodes precedence (no ambiguity)
// Precedence, lowest → highest:
//   IF/THEN/ELSE → OR → AND → NOT → equality (= <>) → relational (< <= > >=)
//   → additive (+ -) → multiplicative (* / MOD) → unary (- + NOT) → exponent (^) → primary

expr
    : IF expr THEN expr ELSE expr      # IfThenElseExpr
    | orExpr                           # OrFallthrough
    ;

orExpr
    : andExpr ( ( OR | PIPE_PIPE ) andExpr )*
    ;

andExpr
    : notExpr ( ( AND | AMP_AMP ) notExpr )*
    ;

notExpr
    : ( NOT | BANG ) notExpr           # NotOp
    | eqExpr                           # EqFallthrough
    ;

eqExpr
    : relExpr ( ( EQ | EQ_EQ | NE | BANG_EQ ) relExpr )*
    ;

relExpr
    : addExpr ( ( LT | LE | GT | GE ) addExpr )*
    ;

addExpr
    : mulExpr ( ( PLUS | MINUS ) mulExpr )*
    ;

mulExpr
    : unaryExpr ( ( STAR | SLASH | MOD ) unaryExpr )*
    ;

unaryExpr
    : MINUS unaryExpr                  # UnaryMinus
    | PLUS  unaryExpr                  # UnaryPlus
    | powExpr                          # PowFallthrough
    ;

powExpr
    : primary CARET powExpr            # PowerExpr
    | primary                          # PowPrimary
    ;

primary
    : number                                           # NumberLiteral
    | IDENT LPAREN (expr (COMMA expr)*)? RPAREN        # FunctionCall
    | IDENT                                            # IdentRef
    | LPAREN expr RPAREN                               # GroupedExpr
    ;

number
    : INT
    | DECIMAL
    ;

// ─── Lexer Rules ─────────────────────────────────────────────────────────────

// Keywords (must come before IDENT so they are never tokenised as identifiers)
// Casing policy: SFD/GF block-property keywords use lowercase literals;
//                logical/conditional keywords use UPPERCASE literals.
SFD     : 'sfd'   ;
CLD     : 'cld'   ;
TIME    : 'time'  ;
STOCK   : 'stock' ;
AUX     : 'aux'   ;
FLOW    : 'flow'  ;
FROM    : 'from'  ;
TO      : 'to'    ;
RATE    : 'rate'  ;
INIT    : 'init'  ;
START   : 'start' ;
END     : 'end'   ;
STEP    : 'step'  ;
NULL    : 'null'  ;

// Graphical function keywords — reserved exactly like the SFD block-property
// keywords above (from, to, rate, init, start, end, step): users may not use
// these as variable names.
GF      : 'gf'       ;
KIND    : 'kind'     ;
XSCALE  : 'xscale'  ;
XPTS    : 'xpts'    ;
YPTS    : 'ypts'    ;
YSCALE  : 'yscale'  ;
POSITION : 'position' ;
VIA      : 'via'      ;
ANGLE    : 'angle'    ;

// Logical and conditional keywords (uppercase-only, like other sysdml keywords)
IF      : 'IF'    ;
THEN    : 'THEN'  ;
ELSE    : 'ELSE'  ;
AND     : 'AND'   ;
OR      : 'OR'    ;
NOT     : 'NOT'   ;
MOD     : 'MOD'   ;

// CLD operators — defined before MINUS and EQ so longest-match wins:
//   '->+' is never split into '-', '>', '+'
//   '=>'  is never split into '=', '>'
ARROW_POS  : '->+' ;
ARROW_NEG  : '->-' ;
ARROW_FLOW : '=>'  ;

// Structural tokens
LBRACE   : '{' ;
RBRACE   : '}' ;
LBRACKET : '[' ;
RBRACKET : ']' ;
LPAREN   : '(' ;
RPAREN   : ')' ;
COMMA    : ',' ;
COLON    : ':' ;
PLUS   : '+' ;
MINUS  : '-' ;
STAR   : '*' ;
SLASH  : '/' ;
CARET  : '^' ;

// Comparison operators — multi-char tokens BEFORE single-char so longest-match wins
LE      : '<=' ;
GE      : '>=' ;
NE      : '<>' ;
EQ_EQ   : '==' ;
BANG_EQ : '!=' ;
LT      : '<'  ;
GT      : '>'  ;
EQ      : '='  ;
BANG    : '!'  ;

// C-style logical aliases — `&&`, `||` for AND, OR; `!` (BANG) above for NOT.
// These are pure surface syntax: the AST builder folds them to canonical
// 'AND' / 'OR' / 'NOT' / '=' / '<>' so the IR is unaware of the alias.
AMP_AMP   : '&&' ;
PIPE_PIPE : '||' ;

// Identifiers and literals
IDENT
    : [a-zA-Z_] [a-zA-Z0-9_]*
    ;

INT
    : [0-9]+
    ;

DECIMAL
    : [0-9]+ '.' [0-9]*
    | '.' [0-9]+
    ;

// Skipped tokens
COMMENT       : '#'  ~[\r\n]*    -> skip ;
LINE_COMMENT  : '//' ~[\r\n]*    -> skip ;
BLOCK_COMMENT : '/*' .*? '*/'   -> skip ;
WS            : [ \t\r\n]+      -> skip ;
