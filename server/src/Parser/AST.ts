import { Token } from './CParser';

export class Node {
	m_Left :Node|null;
	m_Right :Node|null;
	m_Value :Token|null;

	constructor(left :Node|null, right:Node|null, value :Token|null = null) {
		this.m_Left = left;
		this.m_Right = right;
		this.m_Value = value;
	}

	visit() {
		let tok :Token|null = null;
		let tok2 :Token|null = null;
		if(this.m_Left) {
			tok = this.m_Left.visit();
		}
		if(this.m_Right) {
			tok2 = this.m_Right.visit();
		}

		if(this.m_Value && this.m_Value.m_Text.match(/[+-*/]/)){
		
		}

		return this.m_Value;
	}

	static BuildAST(tokens :Token[]) {

	}
}

