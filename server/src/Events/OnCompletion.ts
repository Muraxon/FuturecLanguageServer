import { TextDocument, CompletionItem, Position, CompletionItemKind } from 'vscode-languageserver';
import { GlobalAnalyzer, parserFunctions } from '../server';
import { TextParser } from "./../TextParser";
import { Script } from '../Script';
import { CursorPositionType } from '../CursorPositionInformation';

let completionCached :CompletionItem[] = [];
let posCached :Position|null = null;

export function OnCompletion(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :CompletionItem[] {
	let word = TextParser.getWordAtPosition(pos, curDoc);

	let scripttext :Script|null = null;

	if(word.m_context == "D") {
		return parserFunctions.getDialogFunctions(pos);
	} else if(word.m_context == "S") {
		return parserFunctions.getDatabaseFunctions(pos);
	} else if(word.m_context == "F") {
		return parserFunctions.getFileFunctions(pos);
	} else if(word.m_context == "H") {
		return parserFunctions.getHelperFunctions(pos);
	} else if(word.m_context == "P") {
		return parserFunctions.getPrinterFunctions(pos);
	} else if(word.m_context.length > 2){
		if(word.m_context == "m_Rec" || word.m_context == "m_Rec2") {
			return parserFunctions.getTableFunctions(pos);
		}
		
		scripttext = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
		if(scripttext) {
			let varPattern = new RegExp("\\b(int|CString|CTable|double|CMoney|CDateTime|float|BOOL)\\s*(\\&|)\\s*" + word.m_context + "\\s*(\\=|\\;|\\,|\\))", "g");
			let m = varPattern.exec(scripttext.m_scripttext);
			
			if(m) {
				
				if(m[1] == "CString") {
					return parserFunctions.getCStringFunctions(pos);
				} else if(m[1] == "CTable") {
					return parserFunctions.getTableFunctions(pos);
				} else if(m[1] == "CMoney") {
					return parserFunctions.getMoneyFunctions(pos);
				} else if(m[1] == "CDateTime") {
					return parserFunctions.getDateTimeFunctions(pos);
				} 
			}
		}
	} else if(word.m_word == "Call:" || word.m_type == CursorPositionType.USERDEFINED_FUNCTION) {
		let patternFunction = /\bFUNCTION:\s+(void|double|CString|int|BOOL|CTable|CMoney|CDateTime)\s+(.*)\(.*\).*$/gm;
		scripttext = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
		if(scripttext) {
			let completionFunction :CompletionItem[] = [];
			let alreadyAdded :string[] = [];
			let m :RegExpExecArray|null = null;
			while(m = patternFunction.exec(scripttext.m_scripttext)) {
				if(!alreadyAdded.includes(m[2])) {
					alreadyAdded.push(m[2]);
					completionFunction.push({
						label: <string>m[2],
						commitCharacters: ["("],
						kind: CompletionItemKind.Function
					});
				}
			}
			return completionFunction;
		}
	} else {
		scripttext = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
		if(scripttext) {
			if(posCached) {
				if(posCached.line == pos.line) {
					console.log("caching");
					return completionCached;
				}
			}
		
			let alreadyAdded :string[] = [];
			completionCached = [];
			posCached = pos;
		
			let varPatternNew = /\b(int|CString|CTable|double|CMoney|CDateTime|float|BOOL)\s*(\&|)\s*[a-zA-Z0-9_]+\s*(\=|\;|\,|\))/g;
			let text = scripttext.m_scripttext;
			let m :RegExpExecArray|null = null;
			while(m = varPatternNew.exec(text)) {
		
				let patternBeginVar = /\b/g
				patternBeginVar.lastIndex = m.index + 1;
				m = patternBeginVar.exec(text);
				if(m) {
					patternBeginVar.lastIndex++;
					m = patternBeginVar.exec(text);
					if(m) {
						patternBeginVar.lastIndex++;
						let mEnd = patternBeginVar.exec(text);
						if(mEnd) {
							let variable = text.substring(m.index, mEnd.index);
							if(!alreadyAdded.find((vari) => {
								if(vari == variable) {
									return true;
								}
							})) {

								alreadyAdded.push(variable);
								console.log(variable);
								completionCached.push({
									label: variable,
									commitCharacters: ["."],
									kind: CompletionItemKind.Variable
								});
							}
						}
					}
				}
			}
		}
	}

	parserFunctions.getConstantVariables().forEach(element => {
		if(!completionCached.includes(element)) {
			completionCached.push(element);
		}
	});
	return completionCached;
}
