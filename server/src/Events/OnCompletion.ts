import { TextDocument, CompletionItem, Position, CompletionItemKind, MarkupKind } from 'vscode-languageserver';
import { GlobalAnalyzer, parserFunctions, CurrentCompletionCharacter, documentSettings } from '../server';
import { TextParser } from "./../TextParser";
import { Script } from '../Script';
import { CursorPositionType, CursorPositionInformation } from '../CursorPositionInformation';
import { CParser } from '../Parser/CParser';


let completionCached :CompletionItem[] = [];
let posCached :Position|null = null;

let elapsed_time = (note :string) :void => {
	let start = process.hrtime();
	let precision = 3; // 3 decimal places
	let elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
	console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " + note); // print message + time
	start = process.hrtime(); // reset the timer
}

export async function OnCompletion(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :Promise<CompletionItem[]> {
	let triggerChar = "";
	let word :CursorPositionInformation|null = null;
	if(CurrentCompletionCharacter) {
		triggerChar = CurrentCompletionCharacter;
		word = TextParser.getWordAtPosition(pos, curDoc, true);
	}
	let script :Script|null = null;

	if(word) {
		let lineText = curDoc.getText({
			start: {character: 0, line: pos.line},
			end: {character: 100000, line: pos.line}
		});

		let adjust = await documentSettings.get(curDoc.uri);
		if(adjust) {

			if(word.m_context == "D" && triggerChar.length == 1) {
				return parserFunctions.getDialogFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
			} else if(word.m_context == "S" && triggerChar.length == 1) {
				return parserFunctions.getDatabaseFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
			} else if(word.m_context == "F" && triggerChar.length == 1) {
				return parserFunctions.getFileFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
			} else if(word.m_context == "H" && triggerChar.length == 1) {
				return parserFunctions.getHelperFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
			} else if(word.m_context == "P" && triggerChar.length == 1) {
				return parserFunctions.getPrinterFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
			} else if(word.m_context.length > 2 && triggerChar.length == 1){
				if(word.m_context == "m_Rec" || word.m_context == "m_Rec2") {
					return parserFunctions.getTableFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
				}
	
				script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
		
				if(script) {
					let varPattern = new RegExp("\\b(int|CString|CTable|double|CMoney|CDateTime|float|BOOL)\\s*(\\&|)\\s*" + word.m_context + "\\s*(\\=|\\;|\\,|\\))", "g");
					let m = varPattern.exec(script.m_scripttext);
					
					if(m) {
						if(m[1] == "CString") {
							return parserFunctions.getCStringFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
						} else if(m[1] == "CTable") {
							return parserFunctions.getTableFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
						} else if(m[1] == "CMoney") {
							return parserFunctions.getMoneyFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
						} else if(m[1] == "CDateTime") {
							return parserFunctions.getDateTimeFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
						} 
					}
				}
			} else if(word.m_word == "Call:" && word.m_type == CursorPositionType.USERDEFINED_FUNCTION) {
				let patternFunction = /\bFUNCTION:\s+(void|double|CString|int|BOOL|CTable|CMoney|CDateTime)\s+(.*)\((.*)\).*$/gm;
				elapsed_time("start_completion_call");
				script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
				elapsed_time("end_completion_call");
				if(script) {
					let completionFunction :CompletionItem[] = [];
					let alreadyAdded :string[] = [];
					let m :RegExpExecArray|null = null;
					while(m = patternFunction.exec(script.m_scripttext)) {
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
	}

	if(posCached) {
		if(posCached.line == pos.line) {
			return completionCached;
		}
	}
	completionCached = [];

	script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);

	
	if(script) {
		let parser = new CParser();
		let ScriptInformation = parser.ParseText(docs, script, false);

		let alreadyAdded :string[] = [];
		for(let x = 0; x < ScriptInformation.m_definedFunctions.length; x++) {
			for(let y = 0; y < ScriptInformation.m_definedFunctions[x].length; y++) {
				if(!alreadyAdded.find((vari) => {
					if(vari == ScriptInformation.m_definedFunctions[x][y]) {
						return true;
					}
				})) {
					alreadyAdded.push(ScriptInformation.m_definedFunctions[x][y]);
					completionCached.push({
						label: ScriptInformation.m_definedFunctions[x][y],
						kind: CompletionItemKind.Function
					})
				} 

			}
		}

		alreadyAdded = [];
		for(let x = 0; x < ScriptInformation.m_definedVariables.length; x++) {
			ScriptInformation.m_definedVariables[x].forEach((variable, key) => {
				if(!alreadyAdded.find((vari) => {
					if(vari == key) {
						return true;
					}
				})) {
					alreadyAdded.push(key);
					completionCached.push({
						label: variable.m_Name,
						kind: CompletionItemKind.Variable,
						detail: variable.m_Type
					});
				} 
			})
		}

		posCached = pos;
		return completionCached;
		// 
		// completionCached = [];
	
		// let varPatternNew = /\b(int|CString|CTable|double|CMoney|CDateTime|float|BOOL)\s*(\&|)\s*([a-zA-Z0-9_öÖäÄüÜß]+)\s*(\=|\;|\,|\))/g;

		// let varPatternForeach = /\bforeachrow(reverse|)\(\s*[a-zA-Z0-9_öÖäÄüÜß]+\s*;\s*([a-zA-Z0-9_öÖäÄüÜß]+)\s*(;|\))/g;

		// let text = script.m_scripttext;
		// let m :RegExpExecArray|null = null;
		// while(m = varPatternNew.exec(text)) {
		// 	if(!alreadyAdded.find((vari) => {
		// 		if(vari == m![3]) {
		// 			return true;
		// 		}
		// 	})) {
		// 		alreadyAdded.push(m[3]);
		// 		completionCached.push({
		// 			label: m[3],
		// 			kind: CompletionItemKind.Variable,
		// 			detail: m[1]
		// 		});
		// 	} else {
				
		// 	}
		// }

		// m = null;
		// while(m = varPatternForeach.exec(text)) {
		// 	if(!alreadyAdded.find((vari) => {
		// 		if(vari == m![2]) {
		// 			return true;
		// 		}
		// 	})) {
		// 		alreadyAdded.push(m[2]);
		// 		completionCached.push({
		// 			label: m[2],
		// 			kind: CompletionItemKind.Variable,
		// 			detail: "foreachrow - Laufvariable"
		// 		});
		// 	} else {
				
		// 	}
		// }
	}

	parserFunctions.getConstantVariables().forEach(element => {
		if(!completionCached.includes(element)) {
			completionCached.push(element);
		}
	});
	return completionCached;
}
