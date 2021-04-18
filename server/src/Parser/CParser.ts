import { Diagnostic, DiagnosticSeverity, Position, TextDocument } from 'vscode-languageserver';
import { Script } from '../Script';

interface TokenRange {
	start :number;
	end :number;
}

class Token {
	m_Range :TokenRange;
	m_Text :string;
	constructor(text :string, range :TokenRange) {
		this.m_Range = range;
		this.m_Text = text;
	}
}

class Variable {
	m_Name :string;
	m_Scope :number;
	m_Type :string;
	constructor(name :string, scope :number, type :string) {
		this.m_Name = name;
		this.m_Scope = scope;
		this.m_Type = type;
	}
}

export class CParser {
	m_Tokens :Token[];
	getToken(pos :number) {
		if(this.m_Tokens[pos]) {
			return this.m_Tokens[pos];
		}
		while(pos >= 0 && !this.m_Tokens[pos]) {
			pos--;
		}
		throw this.m_Tokens[pos];
	}

	constructor() {
		this.m_Tokens = [];
	}

	ParseText(script :Script) {
		let text = script.m_scripttext;
		let pos = text.indexOf("\n");

		let startOfIdentifier = -1;
		while(pos < text.length) {
			let char = text.charAt(pos);
			if(char.match(/[ \t\n\r]/)) { 
				if(startOfIdentifier >= 0) {
					let token = new Token(text.substring(startOfIdentifier, pos), {start: startOfIdentifier, end: pos});

					this.m_Tokens.push(token);
					startOfIdentifier = -1;
				}
				pos++;
				continue;
			}

			if(char == "/") { 
				if((pos + 1 < text.length) && (text.charAt(pos + 1) == "/")) {
					let posTemp = text.indexOf("\n", pos);
					if(posTemp > pos) {
						pos = posTemp;
						startOfIdentifier = -1;
					} else {
						pos = text.length;
					}
					continue;
				}
				if((pos + 1 < text.length) && (text.charAt(pos + 1) == "*")) {
					pos++;
					let cont = false;
					while(pos < text.length) {
						if(cont) { break; }
						if(text.charAt(pos) == "*") {
							if(pos + 1 < text.length && text.charAt(pos + 1) == "/") {
								pos++;
								pos++;
								startOfIdentifier = -1;
								cont = true;
								continue;
							}
						}
						pos++;
					}
					continue;
				}
			}
			
			if(char.match(/[a-zA-Z_öäüÖÄÜß0-9]/)) {
				if(startOfIdentifier < 0) { startOfIdentifier = pos; }
			}
			else if(char.match(/[^a-zA-Z_öäüÖÄÜß0-9]/)) {
				if(startOfIdentifier >= 0) {
					let token = new Token(text.substring(startOfIdentifier, pos), {start: startOfIdentifier, end: pos});
					
					this.m_Tokens.push(token);
					startOfIdentifier = -1;
				}
				
				let token = new Token(text.substring(pos, pos + 1), {start: pos, end: pos + 1});
				this.m_Tokens.push(token);
			}

			pos++;
		}

		return this.processTokens(script);
	}

	addError(text :string, diag :Diagnostic[], doc :TextDocument, scriptPos :Position, token :Token, serverity :DiagnosticSeverity = DiagnosticSeverity.Error) {
		let posEnd = doc.positionAt(token.m_Range.end);
		let posStart = doc.positionAt(token.m_Range.start);
		diag.push({
			message: text,
			range: {
				end: {
					character: posEnd.character,
					line: posEnd.line + scriptPos.line
				},
				start: {
					character: posStart.character,
					line: posStart.line + scriptPos.line
				}
			},
			severity: serverity,
			source: "futurec"
		})
	}

	IsType(text :string) {
		if(text == "BOOL" || text == "void" || text == "CTable" || text == "CMoney" || text == "CDateTime" || text == "CString" || text == "int" || text == "double") {
			return true;
		}
		return false;
	}

	isKeyword(text :string) {
		if(text == "return" || text == "funcreturn" || text == "if" || text == "foreachrow" || text == "foreachrowreverse" || text == "while" || text == "else" || text == "OR" || text == "AND") {
			return true;
		}
		return false;
	}

	isControlChar(text :string) {
		if(text.match(/[;{}()=<>,!+-/*]/)) {
			return true;
		}
		return false;
	}

	isPredefinedContext(text :string) {
		if(text.match(/\b[DPFSH]\b/)) {
			return true;
		}
		return false;
	}

	IsVariable(text :string) {
		if(this.isControlChar(text) || this.isKeyword(text) || this.IsType(text) || this.isPredefinedContext(text)) {
			return false;
		}
		if(text.charAt(0).match(/[0-9]/)) {
			return false;
		}
		return true;
	}

	AddStandardVariables(vars :Map<string, Variable>) {
		vars.set("FALSE", new Variable("FALSE", 0, "BOOL"));
		vars.set("TRUE", new Variable("TRUE", 0, "BOOL"));
		vars.set("DIR_DOWN", new Variable("DIR_DOWN", 0, "BOOL"));
		vars.set("DIR_UP", new Variable("DIR_UP", 0, "BOOL"));
		vars.set("m_Rec", new Variable("m_Rec", 0, "CTable"));
		vars.set("m_Rec2", new Variable("m_Rec2", 0, "CTable"));
		vars.set("m_RecNr", new Variable("m_RecNr", 0, "int"));
		vars.set("m_TabNr", new Variable("m_TabNr", 0, "int"));
		vars.set("m_strFullProtocol", new Variable("m_strFullProtocol", 0, "int"));
		vars.set("m_strTextBox", new Variable("m_strTextBox", 0, "int"));

		vars.set("STRING_TAB", new Variable("STRING_TAB", 0, "CString"));
		vars.set("STRING_LINEBREAK", new Variable("STRING_LINEBREAK", 0, "CString"));
		vars.set("STRING_QUOTE", new Variable("STRING_QUOTE", 0, "CString"));
		vars.set("STRING_SLASH1", new Variable("STRING_SLASH1", 0, "CString"));
		vars.set("STRING_SLASH2", new Variable("STRING_SLASH2", 0, "CString"));
		vars.set("STRING_BACKSLASH1", new Variable("STRING_BACKSLASH1", 0, "CString"));
		vars.set("STRING_PARENTHESISOPEN", new Variable("STRING_PARENTHESISOPEN", 0, "CString"));
		vars.set("STRING_PARENTHESISCLOSE", new Variable("STRING_PARENTHESISCLOSE", 0, "CString"));
		vars.set("STRING_LINEFEED", new Variable("STRING_LINEFEED", 0, "CString"));

		vars.set("TYPE_INT", new Variable("TYPE_INT", 0, "CString"));
		vars.set("TYPE_MONEY", new Variable("TYPE_MONEY", 0, "CString"));
		vars.set("TYPE_VARSTRING", new Variable("TYPE_VARSTRING", 0, "CString"));
		vars.set("TYPE_FIXSTRING", new Variable("TYPE_FIXSTRING", 0, "CString"));
		vars.set("TYPE_BOOL", new Variable("TYPE_BOOL", 0, "CString"));
		vars.set("TYPE_BYTE", new Variable("TYPE_BYTE", 0, "CString"));
		vars.set("TYPE_LINK", new Variable("TYPE_LINK", 0, "CString"));
		vars.set("TYPE_DOUBLE", new Variable("TYPE_DOUBLE", 0, "CString"));
		vars.set("TYPE_CTABLE", new Variable("TYPE_CTABLE", 0, "CString"));
		vars.set("TYPE_DATETIME", new Variable("TYPE_DATETIME", 0, "CString"));
		vars.set("TYPE_PERCENT", new Variable("TYPE_PERCENT", 0, "CString"));
		vars.set("TYPE_SUBTABLE", new Variable("TYPE_SUBTABLE", 0, "CString"));

		vars.set("DLG_EDIT", new Variable("DLG_EDIT", 0, "CString"));
		vars.set("DLG_COMBO", new Variable("DLG_COMBO", 0, "CString"));
		vars.set("DLG_LINK_COMBO", new Variable("DLG_LINK_COMBO", 0, "CString"));
		vars.set("DLG_EDIT_PASSWORD", new Variable("DLG_EDIT_PASSWORD", 0, "CString"));
		vars.set("DLG_EDIT_MONEY", new Variable("DLG_EDIT_MONEY", 0, "CString"));
	}

	processTokens(script :Script) {
		let diag :Diagnostic[] = [];

		let found = script.m_scripttext.search(/#includescript\s+[0-9]+\b/);
		let hasIncludescript = found >= 0;

		let doc = TextDocument.create("", "", 0, script.m_scripttext);
		let scriptPos = script.m_Position;

		let definedVariables :Map<string, Variable>[] = [];
		let globalScope = new Map();
		this.AddStandardVariables(globalScope);
		definedVariables.push(globalScope);

		let variablesToAddToStackAfterScopeIncrement :Map<number, string[]> = new Map();

		let definedFunctions :string[] = [];

		let bIsInsideString = false;
		let scopeLevel = 0;
		let savedScopeLevel :number[] = [];
		let addNextTimeSameScope :boolean[] = [];

		try {
			
			for(let i = 0; i < this.m_Tokens.length; i++) {
				let currentToken = this.getToken(i);
				let currentTokenText = currentToken.m_Text;
				if(currentTokenText == "\"") {
					bIsInsideString = !bIsInsideString;
					continue;
				}
				
				if(bIsInsideString) { continue; }
				
				if(currentTokenText == "ENDFUNCTION") {
					let secondToken = this.getToken(i + 1);
					if(secondToken.m_Text != ";") {
						this.addError("; expected `"+secondToken.m_Text+"`", diag, doc, scriptPos, secondToken);
					}

					definedVariables.pop();
					scopeLevel--;
				}
				else if(currentTokenText == "FUNCTION") {
					definedVariables.push(new Map());
					scopeLevel++;

					let secondToken = this.getToken(i + 1);
					if(secondToken.m_Text != ":") {
						this.addError(": expected `"+secondToken.m_Text+"`", diag, doc, scriptPos, secondToken);
					} else {
						let thirdToken = this.getToken(i + 2);
						if(!this.IsType(thirdToken.m_Text)) {
							this.addError("Type (CString|int|double|CTable|CDateTime|CMoney|BOOL) was expected `"+thirdToken.m_Text+"`", diag, doc, scriptPos, thirdToken);
						} else {
							let functionText = this.m_Tokens[i + 3].m_Text;
							if(!definedFunctions.indexOf(functionText)) {
								this.addError("function `"+functionText+"` already defined", diag, doc, scriptPos, this.m_Tokens[i + 3]);
							}
							definedFunctions.push(functionText);
							
							if(this.m_Tokens[i + 4].m_Text != "(") {
								this.addError("`(` expected", diag, doc, scriptPos, this.m_Tokens[i + 4]);
							} else {
								let j = i + 5;
								let success = false;
								while(true) {
									let typeText = this.m_Tokens[j].m_Text;
									if(!this.IsType(typeText)) {
										this.addError("type expected `"+typeText+"`", diag, doc, scriptPos, this.m_Tokens[j]);
										break;
									}
									j++;
									
									
									if(this.m_Tokens[j].m_Text == "&") {
										j++;
										if(!this.IsVariable(this.m_Tokens[j].m_Text)) {
											this.addError("variablename expected `"+this.m_Tokens[j].m_Text+"`", diag, doc, scriptPos, this.m_Tokens[j]);
											break;
										}
										if(definedVariables[scopeLevel].get(this.m_Tokens[j].m_Text)) {
											this.addError("Another parameter is already named like this `"+this.m_Tokens[j].m_Text+"`", diag, doc, scriptPos, this.m_Tokens[j]);
											break;
										} else {
											definedVariables[scopeLevel].set(this.m_Tokens[j].m_Text, new Variable(this.m_Tokens[j].m_Text, scopeLevel, typeText));	
										}
									} else {
										if(!this.IsVariable(this.m_Tokens[j].m_Text)) {
											this.addError("variablename expected `"+this.m_Tokens[j].m_Text+"`", diag, doc, scriptPos, this.m_Tokens[j]);
											break;
										}
										if(definedVariables[scopeLevel].get(this.m_Tokens[j].m_Text)) {
											this.addError("Another parameter is already named like this `"+this.m_Tokens[j].m_Text+"`", diag, doc, scriptPos, this.m_Tokens[j]);
											break;
										} else {
											definedVariables[scopeLevel].set(this.m_Tokens[j].m_Text, new Variable(this.m_Tokens[j].m_Text, scopeLevel, typeText));	
										}
									}
									
									
									j++;
									
									if(this.m_Tokens[j].m_Text == ")") {
										j++;
										success = true;
										break;
									} else if(this.m_Tokens[j].m_Text != ",") {
										this.addError("`,` or `)` expected `"+this.m_Tokens[j].m_Text+"`", diag, doc, scriptPos, this.m_Tokens[j]);
										break;
									}
									j++;
								}
								
								if(success && this.m_Tokens[j].m_Text != ";") {
									this.addError("; expected `"+this.m_Tokens[j].m_Text+"`", diag, doc, scriptPos, this.m_Tokens[j]);
								}
								i = j;
							}
						}
					}
				} 
				else if(currentTokenText == "Call") {
					let secondToken = this.getToken(i + 1);
					if(secondToken.m_Text == ":") {
						let thirdToken = this.getToken(i + 2);
						if(definedFunctions.indexOf(thirdToken.m_Text) < 0) {
							this.addError("No Function with name `"+thirdToken.m_Text+"` found", diag, doc, scriptPos, thirdToken);
						}
					} else {
						this.addError(": expected `"+secondToken.m_Text+"`", diag, doc, scriptPos, secondToken);
					}
					i += 2;
				}
				else if(this.isPredefinedContext(currentTokenText)) {
					let secondToken = this.getToken(i + 1);
					if(secondToken.m_Text != ".") {
						this.addError("`.` expected", diag, doc, scriptPos, secondToken);
					} else {
						let thirdToken = this.getToken(i + 2);
						if(!this.IsVariable(thirdToken.m_Text)) {
							this.addError("Parserfunction expected `"+thirdToken.m_Text+"`", diag, doc, scriptPos, thirdToken);
							i += 1;
						} else {
							let fourtThoken = this.getToken(i + 3);
							if(fourtThoken.m_Text != "(") {
								this.addError("`(` expected", diag, doc, scriptPos, fourtThoken);
								i += 2;
								continue;
							}
	
							let isNegated = false;
							if(i >= 1) {
								isNegated = this.getToken(i - 1).m_Text == "!";
							}
							
							i += 3;
							if(thirdToken.m_Text == "IsVariableDefined") {
								let fifthToken = this.getToken(i + 1);
								if(this.IsVariable(fifthToken.m_Text)) {
									let map = variablesToAddToStackAfterScopeIncrement.get(scopeLevel);
									if(map) {
										map.push(fifthToken.m_Text);
									} else {
										variablesToAddToStackAfterScopeIncrement.set(scopeLevel, [fifthToken.m_Text]);
									}
								} else {
									this.addError("`"+fifthToken.m_Text+"` must be a variable", diag, doc, scriptPos, fourtThoken);
								}
	
								if(isNegated) {
									savedScopeLevel.push(scopeLevel);
									addNextTimeSameScope.push(true);
								}
								i+=1;
							}
						}

					}
				} else if(currentTokenText == "}") {
					let secondToken = this.getToken(i + 1);
					if(secondToken.m_Text != ";") {
						if(secondToken.m_Text != "else") {
							this.addError("`;` expected after `}`", diag, doc, scriptPos, currentToken);
						}
					}
					definedVariables.pop();
					scopeLevel--;
				}else if(currentTokenText == "{") {
					scopeLevel++;

					let newScope = new Map();

					if(addNextTimeSameScope.length > 0 && savedScopeLevel.length > 0) {
						let addNextTimeTmp = addNextTimeSameScope[addNextTimeSameScope.length - 1];
						let savedScopeLevelTmp = savedScopeLevel[savedScopeLevel.length - 1];
						if(savedScopeLevelTmp >= 0 && savedScopeLevelTmp == scopeLevel - 1) {
							if(addNextTimeTmp) {
								addNextTimeSameScope[addNextTimeSameScope.length - 1] = false;
							}
						} 
						if (!addNextTimeTmp) {
							let map = variablesToAddToStackAfterScopeIncrement.get(scopeLevel - 1);
							if(map) {
								map.forEach((val :string) => {
									newScope.set(val, new Variable(val, scopeLevel, "int"));
								});
								variablesToAddToStackAfterScopeIncrement.delete(scopeLevel - 1);
							}
							addNextTimeSameScope.pop();
							savedScopeLevel.pop();
						}
					} else {
						let map = variablesToAddToStackAfterScopeIncrement.get(scopeLevel - 1);
						if(map) {
							map.forEach((val :string) => {
								newScope.set(val, new Variable(val, scopeLevel, "int"));
							});
							variablesToAddToStackAfterScopeIncrement.delete(scopeLevel - 1);
						}
						addNextTimeSameScope.pop();
						savedScopeLevel.pop();
					}
					
					definedVariables.push(newScope);
				} else if(this.IsType(currentTokenText)) {
					let secondToken = this.getToken(i + 1);
					
					let nextIdent = secondToken.m_Text;
					if(this.isKeyword(nextIdent) || this.IsType(nextIdent) || this.isControlChar(nextIdent)) {
						this.addError("unexpected keyword, variable declaration or control character detected: `"+ nextIdent +"`", diag, doc, scriptPos, secondToken);
						i += 1;
					} else {
						let thirdToken = this.getToken(i + 2);
						if(thirdToken.m_Text == ";" || thirdToken.m_Text == "=") {
							
							let i = 0;
							let variable :Variable|undefined = undefined;
							while(variable == undefined && i < scopeLevel) {
								variable = definedVariables[i].get(nextIdent);
								i++;
							}

							if(variable) {
								this.addError("shadowing of variable `" + nextIdent + "` detected" , diag, doc, scriptPos, secondToken, DiagnosticSeverity.Warning);
							}
							else if(definedVariables[scopeLevel].get(nextIdent)) {
								this.addError("redifining variable `" + nextIdent + "`" , diag, doc, scriptPos, secondToken, DiagnosticSeverity.Warning);
							}
							definedVariables[scopeLevel].set(nextIdent, new Variable(nextIdent, scopeLevel, currentTokenText));
							
							// completly new expression-tree must be analysed

						} else {
							this.addError("`;` or `=` expected", diag, doc, scriptPos, secondToken);
						}
						i += 2;
					}
				}
				else if(this.isKeyword(currentTokenText)) {
					if(currentTokenText == "funcreturn") {
						let secondToken = this.getToken(i + 1);
						if(!this.IsVariable(secondToken.m_Text)) {
							this.addError("variable expected `"+secondToken.m_Text+"`", diag, doc, scriptPos, secondToken);
						}
					}
					if(currentTokenText == "foreachrow" || currentTokenText == "foreachrowreverse") {
						let secondToken = this.getToken(i + 1);
						if(secondToken.m_Text == "(") {
							let thirdToken = this.getToken(i + 2);
							if(this.IsVariable(thirdToken.m_Text)) {
								let fourthToken = this.getToken(i + 3);
								if(fourthToken.m_Text == ";") {
									let fifthToken = this.getToken(i + 4);
									if(this.IsVariable(fifthToken.m_Text)) {
										let map = variablesToAddToStackAfterScopeIncrement.get(scopeLevel);
										if(map) {
											map.push(fifthToken.m_Text);
										} else {
											variablesToAddToStackAfterScopeIncrement.set(scopeLevel, [fifthToken.m_Text]);
										}
										let sixthToken = this.getToken(i + 5);
										if(sixthToken.m_Text != ")") {
											if(sixthToken.m_Text != ";") {
												this.addError("`)` expected `"+sixthToken.m_Text+"`", diag, doc, scriptPos, sixthToken);
											} else {
												let seventhToken = this.getToken(i + 6);
												if(seventhToken.m_Text == "FALSE" || seventhToken.m_Text == "TRUE") {
													let eighthtoken = this.getToken(i + 7);
													if(eighthtoken.m_Text != ")") {
														this.addError("`)` expected `"+eighthtoken.m_Text+"`", diag, doc, scriptPos, eighthtoken);
													}
												} else {
													this.addError("Either `FALSE` or `TRUE` expected `"+seventhToken.m_Text+"`", diag, doc, scriptPos, seventhToken);
												}
											}
										}
									} else {
										this.addError("variable expected `"+fifthToken.m_Text+"`", diag, doc, scriptPos, fifthToken);
									}
								} else {
									this.addError("`;` expected `"+fourthToken.m_Text+"`", diag, doc, scriptPos, fourthToken);
								}
							} else {
								this.addError("variable expected `"+thirdToken.m_Text+"`", diag, doc, scriptPos, thirdToken);
							}
						} else {
							this.addError("`(` expected `"+secondToken.m_Text+"`", diag, doc, scriptPos, secondToken);
						}
						i += 5;
					}
					
				} 
				else if(currentTokenText == "#") {
					let secondToken = this.getToken(i + 1);
					if(secondToken.m_Text == "includescript") {
						let thirdToken = this.getToken(i + 2);
						if(!thirdToken.m_Text.match(/[0-9]+/)) {
							this.addError("Number expected `"+thirdToken.m_Text+"`", diag, doc, scriptPos, secondToken);
						}
					} else {
						this.addError("`includescript` expected `"+secondToken.m_Text+"`", diag, doc, scriptPos, secondToken);
					}
					i += 2;
				}
				else if(currentTokenText == "&") {
					let secondToken = this.getToken(i + 1);
					if(secondToken.m_Text == "&") {
						this.addError("`&&` detected. Maybe use `AND` for clarity", diag, doc, scriptPos, secondToken, DiagnosticSeverity.Information);
						i += 1
					}
				}
				else if(currentTokenText == "|") {
					let secondToken = this.getToken(i + 1);
					if(secondToken.m_Text == "|") {
						this.addError("`||` detected. Maybe use `OR` for clarity", diag, doc, scriptPos, secondToken, DiagnosticSeverity.Information);
						i += 1
					}
				}
				else {
					if(this.IsVariable(currentTokenText)) {
						let variable = undefined;
						let j = 0;
						while(variable == undefined && j <= scopeLevel) {
							variable = definedVariables[j].get(currentTokenText);
							j++;
						}
	
						if(!variable) {
							let errorText = "`"+currentTokenText+"` possibly not defined, maybe";
							let severity :DiagnosticSeverity = DiagnosticSeverity.Error;
							if(hasIncludescript) {
								severity = DiagnosticSeverity.Warning;
								errorText += " it is defined in an includescript, or";
							}
							this.addError(errorText + " this script gets included somewhere. But resolving this is not yet supported.", diag, doc, scriptPos, currentToken, severity);
							//i += 2;
						}

						if(variable && scopeLevel < variable.m_Scope) {
							this.addError("Variable nicht definiert - out of scope", diag, doc, scriptPos, currentToken);
						}

						let secondToken = this.getToken(i + 1);
						if(secondToken.m_Text == ".") {
							let thirdToken = this.getToken(i + 2);
							if(!this.IsVariable(thirdToken.m_Text)) {
								this.addError("after . must follow an Parserfunction", diag, doc, scriptPos, thirdToken);
							} else {
								let fourthToken = this.getToken(i + 3);
								if(fourthToken.m_Text != "(") {
									this.addError("after Parserfunction must follow an Paranthesis", diag, doc, scriptPos, fourthToken);
								}
							}
							i += 3;
						} else {
							if(!this.isControlChar(secondToken.m_Text)) {
								this.addError("Expression after variable expected `"+secondToken.m_Text+"`", diag, doc, scriptPos, secondToken);
							} else {
								i += 1;
							}
						}
					}
				}
			}
			if(this.m_Tokens[this.m_Tokens.length - 1].m_Text != ";") {
				this.addError("`;` expected at the end of the script", diag, doc, scriptPos, this.m_Tokens[this.m_Tokens.length - 1]);	
			}

		} catch (token) {
			console.log("error: ", token);
			if(token.m_Text != ";") {
				this.addError("`;` expected at the end of the script", diag, doc, scriptPos, token);	
			}
		}
		return diag;
	}

}