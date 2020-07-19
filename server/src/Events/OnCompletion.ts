import { TextDocument, CompletionItem, Position, CompletionItemKind, MarkupKind } from 'vscode-languageserver';
import { GlobalAnalyzer, parserFunctions, CurrentCompletionCharacter } from '../server';
import { TextParser } from "./../TextParser";
import { Script } from '../Script';
import { CursorPositionType, CursorPositionInformation } from '../CursorPositionInformation';


let completionCached :CompletionItem[] = [];
let posCached :Position|null = null;

let elapsed_time = (note :string) :void => {
	let start = process.hrtime();
	let precision = 3; // 3 decimal places
	let elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
	console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " + note); // print message + time
	start = process.hrtime(); // reset the timer
}

export function OnCompletion(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :CompletionItem[] {
	let triggerChar = "";
	let word :CursorPositionInformation|null = null;
	if(CurrentCompletionCharacter) {
		triggerChar = CurrentCompletionCharacter;
		word = TextParser.getWordAtPosition(pos, curDoc, true);
	}
	let scripttext :Script|null = null;

	if(word) {
	
		if(word.m_context == "D" && triggerChar.length == 1) {
			return parserFunctions.getDialogFunctions(pos);
		} else if(word.m_context == "S" && triggerChar.length == 1) {
			return parserFunctions.getDatabaseFunctions(pos);
		} else if(word.m_context == "F" && triggerChar.length == 1) {
			return parserFunctions.getFileFunctions(pos);
		} else if(word.m_context == "H" && triggerChar.length == 1) {
			return parserFunctions.getHelperFunctions(pos);
		} else if(word.m_context == "P" && triggerChar.length == 1) {
			return parserFunctions.getPrinterFunctions(pos);
		} else if(word.m_context.length > 2 && triggerChar.length == 1){
			if(word.m_context == "m_Rec" || word.m_context == "m_Rec2") {
				return parserFunctions.getTableFunctions(pos);
			}

			scripttext = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, false, true);
	
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
		} else if(word.m_word == "Call:" && word.m_type == CursorPositionType.USERDEFINED_FUNCTION) {
			let patternFunction = /\bFUNCTION:\s+(void|double|CString|int|BOOL|CTable|CMoney|CDateTime)\s+(.*)\((.*)\).*$/gm;
			elapsed_time("start_completion_call");
			scripttext = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, false, true);
			elapsed_time("end_completion_call");
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
							kind: CompletionItemKind.Function,
							documentation: {
								kind: MarkupKind.Markdown,
								value: '`return ' + <string>m[1] + '`' + '\n\n' + m[3]
							}
						});
					}
				}
				return completionFunction;
			}
		}
	}

	if(posCached) {
		if(posCached.line == pos.line) {
			return completionCached;
		}
	}

	scripttext = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, false, true);

	if(scripttext) {
	
		let alreadyAdded :string[] = [];
		completionCached = [];
		posCached = pos;
	
		let varPatternNew = /\b(int|CString|CTable|double|CMoney|CDateTime|float|BOOL)\s*(\&|)\s*([a-zA-Z0-9_öÖäÄüÜß]+)\s*(\=|\;|\,|\))/g;

		let varPatternForeach = /\bforeachrow(reverse|)\(\s*[a-zA-Z0-9_öÖäÄüÜß]+\s*;\s*([a-zA-Z0-9_öÖäÄüÜß]+)\s*(;|\))/g;

		let text = scripttext.m_scripttext;
		let m :RegExpExecArray|null = null;
		while(m = varPatternNew.exec(text)) {
			if(!alreadyAdded.find((vari) => {
				if(vari == m![3]) {
					return true;
				}
			})) {
				alreadyAdded.push(m[3]);
				completionCached.push({
					label: m[3],
					kind: CompletionItemKind.Variable,
					detail: m[1]
				});
			} else {
				
			}
		}

		m = null;
		while(m = varPatternForeach.exec(text)) {
			if(!alreadyAdded.find((vari) => {
				if(vari == m![2]) {
					return true;
				}
			})) {
				alreadyAdded.push(m[2]);
				completionCached.push({
					label: m[2],
					kind: CompletionItemKind.Variable,
					detail: "foreachrow - Laufvariable"
				});
			} else {
				
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
