import {  Position } from 'vscode-languageserver';

export class Script {
	public m_scripttext :string;
	public m_scriptnumber :number;
	public m_Position :Position;
	public m_Uri :string;

	private m_includeScript :Array<number>;

	constructor(text :string, number :number, linenumber :Position, uri :string) {
		//"--------------" + number.toString() + "\n" + 
		// + "\n" + "--------------"
		this.m_scripttext = text;
		this.m_scriptnumber = number;
		this.m_Position = linenumber;
		this.m_Uri = uri;
		this.m_includeScript = [];
	}

	addScripts(...Script: Script[]) {
		let i = 0;
		Script.forEach(element => {
			i++;
			if(i > 200) {
				console.log("looping")
				return;
			}
			while(this.m_scripttext.search(new RegExp("\\#includescript\\s+" + element.m_scriptnumber + "\\b")) >= 0) {
				this.m_scripttext = this.m_scripttext.replace(new RegExp("\\#includescript\\s+" + element.m_scriptnumber + "\\b"), element.m_scripttext);
				this.m_includeScript.push(element.m_scriptnumber);
			}
		});
	}

	getHooks() :string[] {
		let hooks:string[] = [];

		let regexHook = /^.*(\/\/ADDHOOK.*)\s*$/gm;
		let m :RegExpExecArray|null = null;
		while(m = regexHook.exec(this.m_scripttext)) {
			hooks.push(m[1]);
		}
		return hooks;
	}

	filterBranches() {
		




	}
}