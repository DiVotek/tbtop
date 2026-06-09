import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { ChartBlockOptions, ChartPoint } from "../../structure/chartBlock";
import { seriesColor } from "./chartColors";

export function renderBarChart(data: ChartPoint[], options: ChartBlockOptions) {
	const series = options.series ?? [];
	return (
		<ResponsiveContainer width="100%" height="100%">
			<BarChart data={data}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey={options.xKey} />
				<YAxis />
				<Tooltip />
				<Legend />
				{series.map((s, i) => (
					<Bar
						key={s.dataKey}
						dataKey={s.dataKey}
						name={s.label ?? s.dataKey}
						fill={seriesColor(s.color, i)}
					/>
				))}
			</BarChart>
		</ResponsiveContainer>
	);
}
