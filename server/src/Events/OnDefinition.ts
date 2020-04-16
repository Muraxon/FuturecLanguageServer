import { TextDocument, Hover, Location } from 'vscode-languageserver';


export function OnDefinition(docs :Map<string, TextDocument>, pos :Position) : Location[] {



	let hover :Location = {
		uri: "test",
		range: {
			end: {character: 0, line: 0},
			start: {character: 0, line: 0}
		}
	}

	return [hover];
}
