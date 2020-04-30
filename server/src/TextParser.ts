import { Diagnostic, Position, TextDocument, Location, ParameterInformation, SignatureInformation, MarkupContent, SignatureHelp, TextDocuments} from 'vscode-languageserver';
import { Script } from './Script';
import { CursorPositionInformation, CursorPositionType } from './CursorPositionInformation';

export class TextParser {
	static getWordAtPosition(pos :Position, doc :TextDocument, functionCompletion :boolean = false) :CursorPositionInformation{

		let offset = doc.offsetAt(pos);
		let text = doc.getText();
		let char = text.charAt(offset);
		if(functionCompletion) {
			if(char.search(/\s/) >= 0) {
				offset--;
				char = text.charAt(offset);
			}
		}
		let charAtPos = char;
		let isfunction = false;
		let isParserfunction = false;
		let isVarFunction = false;
		let context = "";

	
		let includescriptOffset = offset;

		while((offset > 0) && (char != ' ') && (char != '\t') && (char != '\n') && 
		(char != '(') && (char != '[') && (char != '!') && (char != ',') && 
		(char != '\"') && (char != '-') && (char != '#') && (char != '$') && (char != '{') && 
		(char != ';') && (char != '}'))
		{
			if(char == ':') {
				isfunction = true;
			}
			else if(char == ".") {
				isParserfunction = true;

				let offsetTemp = offset;

				offset--;
				context = text.charAt(offset);
				if(context == "D" || context == "H" || context == "F" || context == "S") {
					offset--;
					char = text.charAt(offset);
					if(char == "\n" || char == "\t" || char == " ") {

					} else {
						isVarFunction = true;
						while((offset > 0) && (char != ' ') && (char != '\t') && (char != '\n') && 
						(char != '(') && (char != '[') && (char != '!') && (char != ',') && 
						(char != '\"') && (char != '-') && (char != '#') && (char != '$') && (char != '{') && 
						(char != ';') && (char != '}')) {

							offset--;
							char = text.charAt(offset);
						}
						offset++;
						context = text.substring(offset, offsetTemp);
					}
				} else {
					isVarFunction = true;
					while((offset > 0) && (char != ' ') && (char != '\t') && (char != '\n') && 
					(char != '(') && (char != '[') && (char != '!') && (char != ',') && 
					(char != '\"') && (char != '-') && (char != '#') && (char != '$') && (char != '{') && 
					(char != ';') && (char != '}')) {

						offset--;
						char = text.charAt(offset);
					}
					offset++;
					context = text.substring(offset, offsetTemp);
				}

				offset = offsetTemp;
				break;
			}

			offset--;
			char = text.charAt(offset);
		}
		offset++;

		let start = offset;
		let patternEndOfWord = /[^a-zA-ZöÖäÄüÜß_0-9]+/g;
		patternEndOfWord.lastIndex = start + 1;
		if(isfunction) {
			patternEndOfWord.lastIndex += 5;
		}

		let m = patternEndOfWord.exec(text);

		let word = "";
		if(m) {
			word = text.substring(start, m.index);
		} else {
			word = text.substring(start);
		}

		let type = CursorPositionType.UNDEFINED_VALUE;
		if(isfunction) {
			type = CursorPositionType.USERDEFINED_FUNCTION;
		}
		else if(isParserfunction) {
			type = CursorPositionType.PARSER_FUNCTION;
		}
		else if(word == "includescript") {
			let pattern = /([0-9]+)/g;
			pattern.lastIndex = includescriptOffset;

			let m = pattern.exec(text);
			if(m) {
				word = <string>m[1];
				type = CursorPositionType.INCLUDESCRIPT;
			} else { type = CursorPositionType.ERROR; }
		}
		else {
			type = CursorPositionType.VARIABLE;
		}

		let info :CursorPositionInformation = new CursorPositionInformation(word.trim(), charAtPos.trim(), type, context.trim());

		return info;
	}

	static getScriptStart(doc :TextDocument, pos :Position, text :string|null = null) :[Position, boolean] {

		if(!text) {
			text = doc.getText({
				start: {character: 0, line: 0},
				end: pos
			});
		}

		let m1 = text.lastIndexOf("\nSCRIPT:");
		let m2 = text.lastIndexOf("\nINSERTINTOSCRIPT:");

		if(m1 > m2) {
			return [doc.positionAt(m1), false];
		} else {
			return [doc.positionAt(m2), true];
		}
	}


}