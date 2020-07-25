import { readFileSync } from 'fs';
import { uriToFilePath } from 'vscode-languageserver/lib/files';
import * as xml2js from "xml2js";
import { CompletionItem, CompletionItemKind, InsertTextFormat, Position, MarkupKind, SignatureInformation, ParameterInformation, Hover, MarkupContent } from 'vscode-languageserver';
import { CursorPositionInformation, CursorPositionType } from './../CursorPositionInformation';
import { parserFunctions } from '../server';

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

	m_FunctionHoverStrings :Map<string,string> = new Map();

	m_FunctionSignatureMap :Map<string,SignatureInformation> = new Map();

	constructor() {}

	async buildFunctions(uri :string) {
		let wholeFile = readFileSync(uriToFilePath(uri)!, "utf-8");

		xml2js.parseString(wholeFile, (err, result) => {
			if(result.root) {
				let i = 0;
				while (result.root.snippet[i]) {
	
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
					// while(docu.search("\n") > 0) {
					// 	docu = docu.replace("\n", "EOL");
					// } 
					while(docu.search("\t") >= 0) {
						docu = docu.replace("\t", "");
					} 

					// while(docu.search("EOL") > 0) {
					// 	docu = docu.replace("EOL", "\n\n");
					// } 
					let docuParameter = docu;

					let docuMark :MarkupContent = {
						kind: MarkupKind.Markdown,
						value: docu
					};

					let item :CompletionItem = {
						label: <string>result.root.snippet[i].keyword[0],
						documentation: docuMark,
						kind: CompletionItemKind.Method,
						insertTextFormat: InsertTextFormat.Snippet,
						insertText: <string>result.root.snippet[i].text[0]
					}
	
					let signatureString = "";
					if(result.root.snippet[i].signature) {
						signatureString = <string>result.root.snippet[i].signature[0];

						
						signatureString = signatureString.trim();
						if(signatureString.length > 0) {
							let parameter = signatureString.split(",");
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
										value: ['```futurec', ParameterStringComplete.trim(), "```", docuParameter].join("\n")
									},
									parameters: ParameterInfo
								});
							}
						} 
					}

					if(!this.m_FunctionHoverStrings.has(signatureString)) {
						if(signatureString.length <= 0) {
							signatureString = "(void)";
						}
						this.m_FunctionHoverStrings.set(item.label.trim(),  ["```futurec", signatureString.trim(), "```"].join("\n") + "\n" + "`return " + this.getMappedReturnValue(returnValue) + "`");
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
		return "undefined (" + val + ")";
	}

	getHover(key :string) :string | undefined {
		return this.m_FunctionHoverStrings.get(key);
	}

	getSignature(word :CursorPositionInformation) :SignatureInformation | undefined {
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
		// 
	}

	getDialogFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemDialog, pos);
		return this.m_CompletionItemDialog;
	}
	
	getDatabaseFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemDatabase, pos);
		return this.m_CompletionItemDatabase;
	}

	getFileFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemFile, pos);
		return this.m_CompletionItemFile;
	}

	getHelperFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemHelper, pos);
		return this.m_CompletionItemHelper;
	}

	getCStringFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemCString, pos);
		return this.m_CompletionItemCString;
	}

	getTableFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemTable, pos);
		return this.m_CompletionItemTable;
	}

	getMoneyFunctions(pos :Position) {
		this.adjustCompletionItem(this.m_CompletionItemCMoney, pos);
		return this.m_CompletionItemCMoney;
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
		return this.m_CompletionItemConstants;
	}

	static m_keyword = /\b(int|BOOL|CString|double|CTable|CMoney|CDateTime|FALSE|TRUE|AND|OR|STRING_LINEBREAK|m_Rec|m_TabNr|m_JobNr|D|F|P|S|H|if|while|return|funcreturn|includescript)\b/;
	isKeyWord(word :string) :boolean {
		ParserFunctions.m_keyword.lastIndex = 0;
		let m = ParserFunctions.m_keyword.exec(word);
		if(m) {
			console.log("keyword " + word);
			return true;
		}
		return false;
	}

	isParserFunction(word :string) :boolean {
		if(this.m_FunctionHoverStrings.has(word)) {
			console.log("parserfunction " + word);
			return true;
		}
		return false;
	}

	static m_literal = /\b[0-9]+\b/g;
	isLiteral(word :string) :boolean {
		ParserFunctions.m_literal.lastIndex = 0;
		let m = ParserFunctions.m_literal.exec(word);
		if(m) {
			console.log("literal " + word);
			return true;
		}
		return false;
	}

	isVariable(word :string) :boolean {
		if(this.isKeyWord(word) || this.isParserFunction(word) || this.isLiteral(word)) {
			return false;
		}
		return true;
	}
}