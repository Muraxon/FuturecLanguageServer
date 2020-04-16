import { TextDocument, Hover, Position } from 'vscode-languageserver';
import { CursorPositionInformation, CursorPositionType } from '../CursorPositionInformation';
import { TextParser } from '../TextParser';
import { GlobalAnalyzer } from '../server';


export function OnHover(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Hover {
	let hoverString = "";
	let word :CursorPositionInformation;
	
	word = TextParser.getWordAtPosition(pos, curDoc);

	let functionname = word.getFunctionname();

	if(word.isFunction() && functionname) {
		hoverString = "";
		
		let numberOfReferences = 0;
		docs.forEach((value:TextDocument, key:string) => {
			hoverString.trim();
			
			
			let DocumentText = value.getText();

			let pattern:RegExp = new RegExp("^\\s*(SCRIPT:" + functionname + ",|FUNCTION:\\s+(void|double|CString|int|BOOL|CTable|CMoney|CDateTime)\\s+" + functionname + "\\(.*\\)).*$", "gm");
			let patternBeginrealFunction = /(void|double|CString|int|BOOL)/g;

			let m = pattern.exec(DocumentText);
			while(m) {
				patternBeginrealFunction.lastIndex = m.index;

				if(word.m_type != CursorPositionType.INCLUDESCRIPT) {
					m = patternBeginrealFunction.exec(DocumentText);
				}

				if(m && hoverString.length <= 0) {
					let mPatternEndline = /$/gm;						
					let pos = value.positionAt(m.index);
					pos.character = 0;
					if(word.m_type == CursorPositionType.INCLUDESCRIPT) {
						pos.line++;
					}
					
					let offset = value.offsetAt(pos);
					mPatternEndline.lastIndex = offset;

					let mEndLine = mPatternEndline.exec(DocumentText);
					while(mEndLine) {
						let line = DocumentText.substring(offset, mEndLine.index).trim();
						if(word.m_type != CursorPositionType.INCLUDESCRIPT) {
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
				'```cpp',
				hoverString,
				'```'
			].join("\n");
		}

	} 
	else if(word.isValid()) {
	
		let notVariableDefinition = /\b(ENDFUNCTION|FUNCTION|m_Rec|funcreturn|TRUE|FALSE|int|double|float|CString|BOOL|CTable|CMoney|CDateTime|if|while|foreach|foreachrow|for|\{|\}|\(|\)|\;|STRING_QUOTE|STRING_LINEFEED|STRING_LINEBREAK|STRING_TAB|STRING_RAUTE|STRING_BRACKETCLOSE|STRING_BRACKETOPEN|STRING_PARENTHESISCLOSE|STRING_PARENTHESISOPEN|STRING_BACKSLASH1|STRING_BACKSLASH2|STRING_SLASH2|STRING_SLASH1|STRING_CARRIAGERETURN)\b/;

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
				} catch (error) {
					hoverString = error;
				}
	
				if(hoverString.length > 0) {
					hoverString = [
						'## Usages: ' + word.m_word,
						'```cpp',
						hoverString,
						'```'
					].join("\n");
				} else { hoverString = ""; }
			}
		} else {
			hoverString = "no definition for keyword";
		}
	}

	let startChar = pos.character - word!.m_word.length + 5;
	if(startChar <= 0) {startChar = 0;}

	return {
		contents: {
			kind: "markdown",
			value: hoverString
		},
		range: {
			start: {character: startChar, line: pos.line },
			end: {character: pos.character, line: pos.line }
		}
	};
}
