import { CompletionItem, Position, CompletionItemKind, MarkupKind } from 'vscode-languageserver/node';
import { GlobalAnalyzer, parserFunctions, CurrentCompletionCharacter } from '../server';
import { TextParser } from "./../TextParser";
import { Script } from '../Script';
import { CursorPositionType, CursorPositionInformation } from '../CursorPositionInformation';
import { CParser } from '../Parser/CParser';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';



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

		let adjust ={AutocompletionMitZusaetzlichenTextedits: false};
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
					let parser = new CParser();
					let ScriptInformation = parser.ParseText(docs, script, false);
					let m :string|null = null;

					for(let x = 0; x < ScriptInformation.m_definedVariables.length; x++) {
						let variable = ScriptInformation.m_definedVariables[x].get(word.m_context);
						if(variable) {
							m = variable.m_Type;
							break;
						}
					}

					if(m) {
						if(m == "CString") {
							return parserFunctions.getCStringFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
						} else if(m == "CTable") {
							return parserFunctions.getTableFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
						} else if(m == "CMoney") {
							return parserFunctions.getMoneyFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
						} else if(m == "CDateTime") {
							return parserFunctions.getDateTimeFunctions(pos, word, lineText, adjust.AutocompletionMitZusaetzlichenTextedits);
						} 
					}
				}
			} else if(word.m_word == "Call:" && word.m_type == CursorPositionType.USERDEFINED_FUNCTION) {
				let patternFunction = /\bFUNCTION:\s+(void|double|CString|int|BOOL|CTable|CMoney|CDateTime)\s+(.*)\((.*)\).*$/gm;
				script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
				if(script) {
					let parser = new CParser();
					let scriptInfo = parser.ParseText(docs, script, false);

					let completionFunction :CompletionItem[] = [];
					let alreadyAdded :string[] = [];
					let m :RegExpExecArray|null = null;
					for(let x = 0; x < scriptInfo.m_definedFunctions.length; x++) {
						for(let y = 0; y < scriptInfo.m_definedFunctions[x].length; y++) {
							if(!alreadyAdded.includes(scriptInfo.m_definedFunctions[x][y])) {
								alreadyAdded.push(scriptInfo.m_definedFunctions[x][y]);
								completionFunction.push({
									label: scriptInfo.m_definedFunctions[x][y],
									commitCharacters: ["("],
									kind: CompletionItemKind.Function,
									documentation: {
										kind: MarkupKind.Markdown,
										value: '`return ' + scriptInfo.m_definedFunctions[x][y] + '`'
									}
								});
							}
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

	script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true, false);

	if(script) {
		let parser = new CParser();
		let ScriptInformation = parser.ParseText(docs, script, false);

		let alreadyAdded :string[] = [];
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
						detail: variable.m_Type + " " + variable.m_Name + " defined in script " + variable.m_FromScript
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
