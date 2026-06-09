import {
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { ChartBlockOptions, ChartPoint } from "../../structure/chartBlock";
import { seriesColor } from "./chartColors";

export function renderLineChart(data: ChartPoint[], options: ChartBlockOptions) {
	const series = options.series ?? [];
	return (
		<ResponsiveContainer width="100%" height="100%">
			<LineChart data={data}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey={options.xKey} />
				<YAxis />
				<Tooltip />
				<Legend />
				{series.map((s, i) => (
					<Line
						key={s.dataKey}
						type="monotone"
						dataKey={s.dataKey}
						name={s.label ?? s.dataKey}
						stroke={seriesColor(s.color, i)}
					/>
				))}
			</LineChart>
		</ResponsiveContainer>
	);
}
