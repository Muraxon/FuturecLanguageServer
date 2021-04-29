import { Hover, SignatureHelp, ParameterInformation, SignatureInformation, MarkupContent, Position } from 'vscode-languageserver/node';
import { CParser } from '../Parser/CParser';
import { TextParser } from '../TextParser';
import { parserFunctions, GlobalAnalyzer } from './../server';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';


export function OnSignature(docs :Map<string, TextDocument>, curDoc :TextDocument, pos :Position) :SignatureHelp {
	let stringBeforeCursor = curDoc.getText({
		start: {character: 0, line: pos.line},
		end: {character: pos.character, line: pos.line}
	});


	let i = 0;
	let foundFunction = "";
	let parameterCount = 0;
	let signatureDoku = "";
	let parameterContent = "";
	let parameterInfo :ParameterInformation[] = [];
	let signatureInformation :SignatureInformation[] = [];
	
	let foundStartParam = stringBeforeCursor.search(/\(.*(\)|$)/);
		
	let endParameter = /(\)|$)/g;
	endParameter.lastIndex = foundStartParam;

	let m = endParameter.exec(stringBeforeCursor);
	let foundEndParam = -1;
	if(m) {
		foundEndParam = m.index;
	}

	stringBeforeCursor = stringBeforeCursor.substring(foundStartParam, foundEndParam);
	i = stringBeforeCursor.split(",").length - 1;

	pos.character -= 2;
	let word = TextParser.getWordAtPosition(pos, curDoc);
	let signatureHelp :SignatureHelp;

	if(word.isValid() || foundFunction.length > 0) {
		if(foundFunction.length <= 0) {
			let Functionname = word.getFunctionname();
			if(Functionname) {
				foundFunction = Functionname;
			}
		}

		if(signatureInformation.length <= 0 && foundFunction.length > 0) {

			if(word.m_context.length <= 0) {

				docs.forEach((value:TextDocument, key:string) => {
					let pattern:RegExp = new RegExp("FUNCTION:\\s+(void|double|CString|int|BOOL|CTable|CMoney|CDateTime)\\s+" + foundFunction + "\\(.*\\)", "g");
					
					let DocumentText = value.getText();
					let m :RegExpExecArray|null = null;
					while(m = pattern.exec(DocumentText)) {
						let returnVal = m[1];
						signatureDoku = "";
						parameterInfo = [];
						parameterContent = "";
						
						let m2 :RegExp|null = null;
						try {
							m2 = new RegExp(foundFunction, "g");
						} catch (error) {
							
						}
						if(!m2) {return;}
						m2.lastIndex = m.index;
						let posStartParameter = m2.exec(DocumentText);
						if(posStartParameter) {
							posStartParameter.index += (foundFunction.length + 1);
	
							let m3 = /\)/g;
							m3.lastIndex = posStartParameter.index + 1;
	
							let posEndParameter = m3.exec(DocumentText);
							if(posEndParameter) {
								let parameterString = DocumentText.substr(posStartParameter.index, posEndParameter.index - posStartParameter.index);
	
								let splitPattern = /(,|$)/gm;
								let split: RegExpExecArray | null;
								let firstIndex = 0;
	
								let mPatternEndline = /$/gm;						
								let pos = value.positionAt(m.index);
								pos.character = 0;
								pos.line--;
								
								let offset = value.offsetAt(pos);
								mPatternEndline.lastIndex = offset;
		
								let mEndLine = mPatternEndline.exec(DocumentText);
		
								while(mEndLine) {
									let line = DocumentText.substring(offset, mEndLine.index).trim();
									if(line.length <= 0 || pos.line < 0) { break; }
		
									signatureDoku = line + "\n" + signatureDoku;
		
									pos.line--;
									offset = value.offsetAt(pos);
									mPatternEndline.lastIndex = offset;
									mEndLine = mPatternEndline.exec(DocumentText);
								}
	
								while(split = splitPattern.exec(parameterString)) {
									if(split.index <= firstIndex) {break;}
									parameterCount++;
	
									let singleParameter = parameterString.substr(firstIndex, split.index - firstIndex).trim();
									if(parameterContent.length > 0) { parameterContent += "\n"; }
									parameterContent += singleParameter;
									let markContent :MarkupContent = {
										kind: "markdown",
										value: [
											'Current: ',
											['**' ,singleParameter , '**'].join(""),
										].join('')
									}
	
									firstIndex = split.index + 1;
									parameterInfo.push({
										label: singleParameter,
										documentation: markContent
									})
								}
	
								let markContentSignature :MarkupContent = {
									kind: "markdown",
									value: [
										'```futurec',
										parameterContent,
										'',
										signatureDoku,
										'```'
									].join('\n')
								}
								signatureInformation.push({
									label: returnVal + " " + foundFunction,
									documentation: markContentSignature,
									parameters: parameterInfo
								});
							}
						}
					}
				});
			} else {
				let script = GlobalAnalyzer.getCompleteCurrentScript(pos, curDoc, docs, true, true);
				if(script) {
					let parser = new CParser();
					let scriptInfo = parser.ParseText(docs, script, false);
					for(let x = 0; x < scriptInfo.m_definedVariables.length; x++) {
						let variable = scriptInfo.m_definedVariables[x].get(word.m_context);
						if(variable) {
							word.m_context = variable.m_Type;
							break;
						}
					}
				}

				let signature = parserFunctions.getSignature(word);
				if(signature) {
					signatureInformation.push(signature);
				}
			}
		}
	}

	signatureHelp = {
		activeParameter: 0,
		activeSignature: 0,
		signatures: signatureInformation
	}
	return signatureHelp;
}
