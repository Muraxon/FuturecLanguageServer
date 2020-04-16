import {  Position } from 'vscode-languageserver';

export class Script {
	public m_scripttext :string;
	public m_scriptnumber :number;
	public m_Position :Position;
	public m_Uri :string;

	private m_includeScript :Array<number>;

	constructor(text :string, number :number, linenumber :Position, uri :string) {
		this.m_scripttext = "--------------" + number.toString() + "\n" + text + "\n" + "--------------";
		this.m_scriptnumber = number;
		this.m_Position = linenumber;
		this.m_Uri = uri;
		this.m_includeScript = [];
	}

	addScripts(...Script: Script[]) {
		Script.forEach(element => {
			this.m_scripttext = this.m_scripttext.replace(new RegExp("\\#includescript\\s+" + element.m_scriptnumber + "\\b"), element.m_scripttext);
			this.m_includeScript.push(element.m_scriptnumber);
		});
	}
}