import { Hover, Position } from 'vscode-languageserver/node';
import { CursorPositionInformation, CursorPositionType } from '../CursorPositionInformation';
import { TextParser } from '../TextParser';
import { GlobalAnalyzer, parserFunctions } from '../server';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';


export function OnHover(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Hover {
	
	let hoverString = "";
	let word :CursorPositionInformation;
	
	word = TextParser.getWordAtPosition(pos, curDoc);
	if(word.m_word.length > 0) {
		
		let script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
	
		let functionname = word.getFunctionname();
	
		if(word.isScript() && functionname) {
			functionname.trim();
			hoverString = "";
			
			let numberOfReferences = 0;
			docs.forEach((value:TextDocument, key:string) => {
				hoverString.trim();
				
				
				let DocumentText = value.getText();
	
				let pattern:RegExp = new RegExp("^\\s*(SCRIPT:" + functionname + ",|FUNCTION:\\s+(void|double|CString|int|BOOL|CTable|CMoney|CDateTime)\\s+" + functionname + "\\(.*\\)|INSERTINTOSCRIPT:[0-9]+,\\/\\/" + functionname + ").*$", "gm");
				let patternBeginrealFunction = /(void|double|CString|int|BOOL|CTable)/g;
	
				let m = pattern.exec(DocumentText);
				while(m) {
					patternBeginrealFunction.lastIndex = m.index;
	
					if(word.m_type != CursorPositionType.INCLUDESCRIPT &&
						word.m_type != CursorPositionType.ADDHOOK) {
						m = patternBeginrealFunction.exec(DocumentText);
					}
	
					if(m && hoverString.length <= 0) {
						let mPatternEndline = /$/gm;						
						let pos = value.positionAt(m.index);
						pos.character = 0;
						if(word.m_type == CursorPositionType.INCLUDESCRIPT ||
							word.m_type == CursorPositionType.ADDHOOK) {
							pos.line++;
						}
						
						let offset = value.offsetAt(pos);
						mPatternEndline.lastIndex = offset;
	
						let mEndLine = mPatternEndline.exec(DocumentText);
						while(mEndLine) {
							let line = DocumentText.substring(offset, mEndLine.index).trim();
							if(word.m_type != CursorPositionType.INCLUDESCRIPT &&
								word.m_type != CursorPositionType.ADDHOOK) {
								if(line.length <= 0) { break; }
							} else {
								if(line.search(/^\s*ENDSCRIPT/gm) >= 0) {
									hoverString = line + "\n" + hoverString;
									break;	
								}
							}
							if(pos.line <= 0) { hoverString = "ENDSCRIPT\n" + line + "\n" + hoverString; break; }
	
							hoverString = line + "\n" + hoverString;
	
							pos.line--;
							offset = value.offsetAt(pos);
							mPatternEndline.lastIndex = offset;
							mEndLine = mPatternEndline.exec(DocumentText);
						}
					}
					else {
						numberOfReferences++;
					}
					m = pattern.exec(DocumentText);
				}
			});
	
			if(numberOfReferences > 0) {
				hoverString = hoverString.trim() + " (+" + (numberOfReferences) + " overloads)";
			}
	
			if(hoverString.length > 0) {
				hoverString = [
					'```futurec',
					hoverString,
					'```'
				].join("\n");
			}
	
		}
		else if(word.isParserFunction() && functionname && word.m_context.length > 0) {
			let temp :string|undefined= "";
			if(script) {
	
				if(word.m_context == "m_Rec" || word.m_context == "m_Rec2") {
					word.m_context = "CTable";
				} else {
					if(word.m_context != "S" && word.m_context != "P" && word.m_context != "F" && word.m_context != "D" && word.m_context != "H") {
						let contextTypeReg = new RegExp("\\b(CDateTime|CString|CTable|CMoney)\\b\\s*(&|)\\s*\\b"+word.m_context+"\\b");
						let m = contextTypeReg.exec(script.m_scripttext);
						if(m) {
							word.m_context = <string>m[1];
						}
					}
				}	
				temp = parserFunctions.getHover(word);
			}
			if(temp) {
				hoverString = temp;
			} else {
				hoverString = "Function not found";
			}
		}
		else if(word.isValid()) {
			if(word.m_word == "m_Rec" || word.m_word == "m_Rec2" || word.m_word == "m_TabNr") {
				word.m_context = "CTable";
				let temp = parserFunctions.getHover(word);
				if(temp) {
					hoverString = temp;
				} else {
					hoverString = "notes not found";
				}
			} else {
	
				let notVariableDefinition = /\b(ENDFUNCTION|FUNCTION|funcreturn|TRUE|FALSE|int|double|float|CString|BOOL|CTable|CMoney|CDateTime|if|while|foreach|foreachrow|for|\{|\}|\(|\)|\;|STRING_QUOTE|STRING_LINEFEED|STRING_LINEBREAK|STRING_TAB|STRING_RAUTE|STRING_BRACKETCLOSE|STRING_BRACKETOPEN|STRING_PARENTHESISCLOSE|STRING_PARENTHESISOPEN|STRING_BACKSLASH1|STRING_BACKSLASH2|STRING_SLASH2|STRING_SLASH1|STRING_CARRIAGERETURN)\b/;
		
				let mNotVar = notVariableDefinition.exec(word.m_word);
				if(!mNotVar) {
		
					let script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true);
		
					if(script) {
						try {
							let VariableDefinition = new RegExp("(double|CString|int|BOOL|CTable|CMoney|CDateTime)\\s+" + word.m_word + "\\s*(\\;|\\=)", "g");
							let VariableDefinitionEnd = /$/gm;
							let m = VariableDefinition.exec(script.m_scripttext);
							if(m) {
								VariableDefinitionEnd.lastIndex = m.index;
								let m2 = VariableDefinitionEnd.exec(script.m_scripttext);
								if(m2) {
				
									hoverString = "- " + script.m_scripttext.substring(m.index, m2.index).trim();
			
									let patternAssignment = new RegExp("^.*\\b" + word.m_word + "\\b.*$", "gm");
									patternAssignment.lastIndex = m2.index;
									
									while(m = patternAssignment.exec(script.m_scripttext)) {
										VariableDefinitionEnd.lastIndex = m.index;
										let m3 = VariableDefinitionEnd.exec(script.m_scripttext);
										if(m3) {
											let line = script.m_scripttext.substring(m.index, m3.index).trim();
											if(line.search(/^\s*(FUNCTION:|\/\/)/) < 0) {
												hoverString += "\n- " + line;
											}
										}
									}
								}
							}
						} catch (error :any) {
							hoverString = error;
						}
			
						if(hoverString.length > 0) {
							hoverString = [
								'## Usages: ' + word.m_word,
								'```futurec',
								hoverString,
								'```'
							].join("\n");
						} else { hoverString = ""; }
					}
				} else {
					hoverString = "";
				}
			}
		}
	}
	
	let startChar = word.m_OffsetOnLine;
	if(startChar <= 0) {startChar = 0;}

	return {
		contents: {
			kind: "markdown",
			value: hoverString
		},
		range: {
			start: {character: startChar, line: pos.line },
			end: {character: word.m_OffsetOnLine + word.m_word.length, line: pos.line }
		}
	};
}
