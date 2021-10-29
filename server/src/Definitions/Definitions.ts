
interface FunctionInfo {
	times_used :number;
	from_tables :string[];
}

type FunctionInfoMap = Map<string, FunctionInfo>;

type StatisticsForParser = Map<string, FunctionInfoMap>;