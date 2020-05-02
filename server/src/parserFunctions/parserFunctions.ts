import { readFileSync } from 'fs';
import { uriToFilePath } from 'vscode-languageserver/lib/files';
import * as xml2js from "xml2js";
import { CompletionItem, CompletionItemKind, InsertTextFormat, Position, MarkupKind, SignatureInformation, ParameterInformation } from 'vscode-languageserver';
import { CursorPositionInformation, CursorPositionType } from './../CursorPositionInformation';

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

	m_FunctionSignatureMap :Map<string,SignatureInformation> = new Map();

	constructor() {}

	async buildFunctions(uri :string) {
		let wholeFile = readFileSync(uriToFilePath(uri)!, "utf-8");

		xml2js.parseString(wholeFile, (err, result) => {

			let i = 0;
			while (result.root.snippet[i]) {

				let docu = "";
				let docuParameter = "";
				if(result.root.snippet[i].notes) {
					docu = result.root.snippet[i].notes[0];
					docuParameter = docu;
				} else {
					docu = result.root.snippet[i].keyword[0];
				}

				let returnValue = "";
				if(result.root.snippet[i].returnvalue) {
					returnValue = <string>result.root.snippet[i].returnvalue[0];
					docu = "`return " + this.getMappedReturnValue(returnValue) + "`" + "\n\n" + docu;
				}

				let item :CompletionItem = {
					label: <string>result.root.snippet[i].keyword[0],
					documentation: {
						kind: MarkupKind.Markdown,
						value: docu
					},
					kind: CompletionItemKind.Method,
					insertTextFormat: InsertTextFormat.Snippet,
					insertText: <string>result.root.snippet[i].text[0]
				}

				if(result.root.snippet[i].signature) {
					let signature = <string>result.root.snippet[i].signature[0];
					let parameter = signature.split(",");
					
					let ParameterInfo :ParameterInformation[] = [];
					let ParameterStringComplete = "";
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
					if(!this.m_FunctionSignatureMap.has(<string>result.root.snippet[i].keyword[0])) {
						this.m_FunctionSignatureMap.set(<string>result.root.snippet[i].keyword[0], {
							label: this.getMappedReturnValue(returnValue) + " " + <string>result.root.snippet[i].keyword[0],
							documentation: {
								kind: MarkupKind.Markdown,
								value: ['```futurec', ParameterStringComplete.trim(), "", docuParameter, '```'].join("\n")
							},
							parameters: ParameterInfo
						});
					}
				}

				if(result.root.snippet[i].context != undefined) {
					if(result.root.snippet[i].context[0] == "D") {
						this.m_CompletionItemDialog.push(item);
					} else if(result.root.snippet[i].context[0] == "H") {
						this.m_CompletionItemHelper.push(item);
					} else if(result.root.snippet[i].context[0] == "F") {
						this.m_CompletionItemFile.push(item);
					} else if(result.root.snippet[i].context[0] == "S") {
						this.m_CompletionItemDatabase.push(item);
					} else if(result.root.snippet[i].context[0] == "CTable") {
						this.m_CompletionItemTable.push(item);
					} else if(result.root.snippet[i].context[0] == "CMoney") {
						this.m_CompletionItemCMoney.push(item);
					} else if(result.root.snippet[i].context[0] == "CString") {
						this.m_CompletionItemCString.push(item);
					} else if(result.root.snippet[i].context[0] == "CDateTime") {
						this.m_CompletionItemCDateTime.push(item);
					} else if(result.root.snippet[i].context[0] == "P") {
						this.m_CompletionItemPrinter.push(item);
					} else {
						item.kind = CompletionItemKind.Variable;
						this.m_CompletionItemConstants.push(item);
					}
				} else {
					item.kind = CompletionItemKind.Snippet;
					this.m_CompletionItemConstants.push(item);
				}

				i++;
			}
			
			
		});

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
		return "undefined";
	}

	getSignature(word :CursorPositionInformation) :SignatureInformation | undefined {
		console.log(word);
		if(this.m_FunctionSignatureMap.has(word.m_word)) {
			return this.m_FunctionSignatureMap.get(word.m_word);
		}
		return undefined;
	}

	adjustCompletionItem(items :CompletionItem[], pos :Position) {
		// items.forEach(element => {
		// 	element.textEdit = TextEdit.insert(pos, <string>element.documentation);
		// 	element.insertTextFormat = InsertTextFormat.Snippet;
		// });
		// console.log(items);
	}

	getDialogFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemDialog, pos);
		return this.m_CompletionItemDialog
	}
	
	getDatabaseFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemDatabase, pos);
		return this.m_CompletionItemDatabase
	}

	getFileFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemFile, pos);
		return this.m_CompletionItemFile
	}

	getHelperFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemHelper, pos);
		return this.m_CompletionItemHelper
	}

	getCStringFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemCString, pos);
		return this.m_CompletionItemCString
	}

	getTableFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemTable, pos);
		return this.m_CompletionItemTable
	}

	getMoneyFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemCMoney, pos);
		return this.m_CompletionItemCMoney
	}

	getDateTimeFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemCDateTime, pos);
		return this.m_CompletionItemCDateTime;
	}

	getPrinterFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemPrinter, pos);
		return this.m_CompletionItemPrinter;
	}

	getConstantVariables() {
		return this.m_CompletionItemConstants
	}

}