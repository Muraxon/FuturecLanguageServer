import * as fs from 'fs';
import { uriToFilePath } from 'vscode-languageserver/lib/files';
import * as xml2js from "xml2js";
import { 
	CompletionItem, 
	CompletionItemKind, 
	InsertTextFormat,
	Position, 
	MarkupKind, 
	SignatureInformation, 
	ParameterInformation, 
	MarkupContent, 
	TextEdit
} from 'vscode-languageserver';
import { CursorPositionInformation, } from './../CursorPositionInformation';

export class ParserFunctions {

	m_CompletionItemDialog :CompletionItem[] = [];
	m_CompletionItemDatabase :CompletionItem[] = [];
	m_CompletionItemPrinter :CompletionItem[] = [];
	m_CompletionItemFile :CompletionItem[] = [];
	m_CompletionItemHelper :CompletionItem[] = [];
	m_CompletionItemCString :CompletionItem[] = [];
	m_CompletionItemTable :CompletionItem[] = [];
	m_CompletionItemCMoney :CompletionItem[] = [];
	m_CompletionItemCDateTime :CompletionItem[] = [];
	m_CompletionItemConstants :CompletionItem[] = [];

	m_FunctionHoverStringsDialog :Map<string, string> = new Map();
	m_FunctionHoverStringsDatabase :Map<string, string> = new Map();
	m_FunctionHoverStringsPrinter :Map<string, string> = new Map();
	m_FunctionHoverStringsFile :Map<string, string> = new Map();
	m_FunctionHoverStringsHelper :Map<string, string> = new Map();
	m_FunctionHoverStringsCString :Map<string, string> = new Map();
	m_FunctionHoverStringsTable :Map<string, string> = new Map();
	m_FunctionHoverStringsCMoney :Map<string, string> = new Map();
	m_FunctionHoverStringsCDateTime :Map<string, string> = new Map();
	m_FunctionHoverStringsConstants :Map<string, string> = new Map();

	m_FunctionSignatureMapDialog :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapDatabase :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapPrinter :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapFile :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapHelper :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapCString :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapTable :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapCMoney :Map<string, SignatureInformation> = new Map();
	m_FunctionSignatureMapCDateTime :Map<string, SignatureInformation> = new Map();

	constructor() {}

	async buildFunctions(uri :string, root_path :string) {

		try {

			let wholeFile = fs.readFileSync(uriToFilePath(uri)!, "utf-8");
		
			xml2js.parseString(wholeFile, (err, result) => {
				if(result.root) {
					let i = 0;
					let completeDocuDocument = "";
		
					while (result.root.snippet[i]) {
						let keyword :string = <string>result.root.snippet[i].keyword[0];
		
						let docu = "";
						if(result.root.snippet[i].notes) {
							docu = <string>(result.root.snippet[i].notes[0]);
						}
						docu = docu.trim();
		
						let returnValue = "";
						if(result.root.snippet[i].returnvalue) {
							returnValue = <string>result.root.snippet[i].returnvalue[0];
							docu = "`return " + this.getMappedReturnValue(returnValue) + "`" + "\n\n" + docu;
						}
						docu = docu.trim();
		
						while(docu.search("\r") >= 0) {
							docu = docu.replace("\r", "");
						} 
						while(docu.search("\t") >= 0) {
							docu = docu.replace("\t", "");
						}
		
						while(docu.search(<string>"__BASE__") > 0) {
							docu = docu.replace("__BASE__", root_path);
						}
		
		
						let docuMark :MarkupContent = {
							kind: MarkupKind.Markdown,
							value: docu
						};
		
						let item :CompletionItem = {
							label: keyword,
							documentation: docuMark,
							kind: CompletionItemKind.Method,
							insertTextFormat: InsertTextFormat.Snippet,
							insertText: <string>result.root.snippet[i].text[0],
							data: this.getMappedReturnValue(returnValue)
						}


						
						let signatureString = "";
						let ParameterInfo :ParameterInformation[] = [];
						let ParameterStringComplete = "";

						let hoverFunctionString = "";

						if(result.root.snippet[i].signature) {
							signatureString = <string>result.root.snippet[i].signature[0];
							signatureString = signatureString.trim();
							if(signatureString.length > 0) {
								let parameter = signatureString.split(",");
								parameter.forEach(element => {
									if(ParameterStringComplete.length > 0) { ParameterStringComplete += "\n"; }
									ParameterStringComplete += element.trim();
			
									ParameterInfo.push({
										label: element.trim(),
										documentation: {
											kind: MarkupKind.Markdown,
											value: 'Current: **' + element.trim() + '**'
										}
									});
								});

								hoverFunctionString = ["```futurec", signatureString, "```", "", docu].join("\n");
							} else {
								hoverFunctionString = ["```futurec", "void", "```", "", docu].join("\n");
							}
						}

						// if(docu.length > 0) {
						// 	let context = "";
						// 	if(result.root.snippet[i].context) {
						// 		context = <string>(result.root.snippet[i].context[0]) +".";
						// 		signatureString = "(" + signatureString + ")";
						// 	} else {
						// 		signatureString = "";
						// 	}
						// 	let keyword = "";
						// 	if(result.root.snippet[i].keyword) {
						// 		keyword = <string>(result.root.snippet[i].keyword[0]);
						// 	}
						// 	completeDocuDocument = completeDocuDocument + "# " + context+keyword + signatureString.trim()+ "  \n" + docu + "  \n  \n  \n  \n  \n";
						// }

						let sigInfo :SignatureInformation = {
							label: this.getMappedReturnValue(returnValue) + " " + keyword,
							documentation: {
								kind: MarkupKind.Markdown,
								value: ['```futurec', ParameterStringComplete.trim(), "```", "", docu].join("\n")
							},
							parameters: ParameterInfo
						}
		
						
						if(result.root.snippet[i].context != undefined) {
							if(result.root.snippet[i].context[0] == "D") {
								this.m_CompletionItemDialog.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapDialog.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsDialog.set(keyword, hoverFunctionString);
							} else if(result.root.snippet[i].context[0] == "H") {
								this.m_CompletionItemHelper.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapHelper.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsHelper.set(keyword, hoverFunctionString);
							} else if(result.root.snippet[i].context[0] == "F") {
								this.m_CompletionItemFile.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapFile.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsFile.set(keyword, hoverFunctionString);
							} else if(result.root.snippet[i].context[0] == "S") {
								this.m_CompletionItemDatabase.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapDatabase.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsDatabase.set(keyword, hoverFunctionString);
							} else if(result.root.snippet[i].context[0] == "CTable") {
								this.m_CompletionItemTable.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapTable.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsTable.set(keyword, hoverFunctionString);
							} else if(result.root.snippet[i].context[0] == "CMoney") {
								this.m_CompletionItemCMoney.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapCMoney.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsCMoney.set(keyword, hoverFunctionString);
							} else if(result.root.snippet[i].context[0] == "CString") {
								this.m_CompletionItemCString.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapCString.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsCString.set(keyword, hoverFunctionString);
							} else if(result.root.snippet[i].context[0] == "CDateTime") {
								this.m_CompletionItemCDateTime.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapCDateTime.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsCDateTime.set(keyword, hoverFunctionString);
							} else if(result.root.snippet[i].context[0] == "P") {
								this.m_CompletionItemPrinter.push(item);
								if(signatureString.length > 0) {
									this.m_FunctionSignatureMapPrinter.set(keyword, sigInfo);
								}
								this.m_FunctionHoverStringsPrinter.set(keyword, hoverFunctionString);
							} else {
								item.kind = CompletionItemKind.Variable;
								this.m_CompletionItemConstants.push(item);
							}
						} else {
							item.kind = CompletionItemKind.Snippet;
							this.m_CompletionItemConstants.push(item);
							this.m_FunctionHoverStringsConstants.set(keyword, hoverFunctionString);
						}

		
						i++;
					}

					// completeDocuDocument = completeDocuDocument.trim();
					// fs.writeFile("Test.md", completeDocuDocument, (test) => {
					// 	console.log(test);
					// })
				}
			});
		} catch(e) {
			console.log(e);
		}
	}

	getMappedReturnValue(val :string) :string{
		if(val == "TYPE_CSTRING") {
			return "CString";
		} else if(val == "TYPE_INT") {
			return "int";
		} else if(val == "TYPE_CTABLE") {
			return "CTable";
		} else if(val == "TYPE_MONEY") {
			return "CMoney";
		} else if(val == "TYPE_DATETIME") {
			return "CDateTime";
		} else if(val == "TYPE_DOUBLE") {
			return "double";
		} else if(val == "TYPE_BOOL") {
			return "BOOL";
		} else if(val == "void") {
			return "void";
		}
		return "undefined (" + val + ")";
	}

	getHover(posInfo :CursorPositionInformation) :string | undefined {
		switch(posInfo.m_context) {
			case "P":
				return this.m_FunctionHoverStringsPrinter.get(posInfo.m_word);
			case "D":
				return this.m_FunctionHoverStringsDialog.get(posInfo.m_word);
			case "F":
				return this.m_FunctionHoverStringsFile.get(posInfo.m_word);
			case "S":
				return this.m_FunctionHoverStringsDatabase.get(posInfo.m_word);
			case "H":
				return this.m_FunctionHoverStringsHelper.get(posInfo.m_word);
			case "CTable":
				return this.m_FunctionHoverStringsTable.get(posInfo.m_word);
			case "CString":
				return this.m_FunctionHoverStringsCString.get(posInfo.m_word);
			case "CDateTime":
				return this.m_FunctionHoverStringsCDateTime.get(posInfo.m_word);
			case "CMoney":
				return this.m_FunctionHoverStringsCMoney.get(posInfo.m_word);
			default:
				return this.m_FunctionHoverStringsConstants.get(posInfo.m_word);
		}
	}

	getSignature(posInfo :CursorPositionInformation) :SignatureInformation | undefined {
		switch(posInfo.m_context) {
			case "P":
				return this.m_FunctionSignatureMapPrinter.get(posInfo.m_word);
			case "D":
				return this.m_FunctionSignatureMapDialog.get(posInfo.m_word);
			case "F":
				return this.m_FunctionSignatureMapFile.get(posInfo.m_word);
			case "S":
				return this.m_FunctionSignatureMapDatabase.get(posInfo.m_word);
			case "H":
				return this.m_FunctionSignatureMapHelper.get(posInfo.m_word);
			case "m_Rec":
			case "m_Rec2":
			case "CTable":
				return this.m_FunctionSignatureMapTable.get(posInfo.m_word);
			case "CString":
				return this.m_FunctionSignatureMapCString.get(posInfo.m_word);
			case "CDateTime":
				return this.m_FunctionSignatureMapCDateTime.get(posInfo.m_word);
			case "CMoney":
				return this.m_FunctionSignatureMapCMoney.get(posInfo.m_word);
			default:
				return undefined;
		}
	}

	adjustCompletionItem(items :CompletionItem[], pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		items.forEach(element => {
			if(element.data) {
				let m = lineText.search(/^.*(foreachrowreverse|foreachrow|while|if|.*=.*).*$/gm);
				if(m < 0 && adjust) {
					if(element.data == "CString" || element.data == "CMoney" || element.data == "CDateTime" || element.data == "CTable" || element.data == "double" || element.data == "int" || element.data == "BOOL") {
						let edit = TextEdit.insert(Position.create(pos.line, pos.character - posInfo.m_word.length - 1 - posInfo.m_context.length), element.data + " " + this.getPrefixFromReturnType(element.data) +  element.label + " = ");
						element.additionalTextEdits = [edit];
					} else {
						element.additionalTextEdits = [];
					}
				} else {
					element.additionalTextEdits = [];
				}
			}
		});
	}

	getPrefixFromReturnType(returnType :string) :string {
		if(returnType == "CString") {
			return "str";
		} else if(returnType == "int") {
			return "n";
		} else if(returnType == "CTable") {
			return "t";
		} else if(returnType == "CMoney") {
			return "m";
		} else if(returnType == "CDateTime") {
			return "dt";
		} else if(returnType == "double") {
			return "d";
		} else if(returnType == "BOOL") {
			return "b";
		} else {
			return "FAILED_RETURN_TYPE";
		}
	}

	getDialogFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemDialog, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemDialog;
	}
	
	getDatabaseFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemDatabase, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemDatabase;
	}

	getFileFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemFile, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemFile;
	}

	getHelperFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemHelper, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemHelper;
	}

	getCStringFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemCString, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemCString;
	}

	getTableFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemTable, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemTable;
	}

	getMoneyFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemCMoney, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemCMoney;
	}

	getDateTimeFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemCDateTime, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemCDateTime;
	}

	getPrinterFunctions(pos :Position, posInfo :CursorPositionInformation, lineText :string, adjust :Boolean) {
		this.adjustCompletionItem(this.m_CompletionItemPrinter, pos, posInfo, lineText, adjust);
		return this.m_CompletionItemPrinter;
	}

	getConstantVariables() {
		return this.m_CompletionItemConstants;
	}
}