import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { ChartBlockOptions, ChartPoint } from "../../structure/chartBlock";
import { seriesColor } from "./chartColors";

export function renderAreaChart(data: ChartPoint[], options: ChartBlockOptions, colors: string[]) {
	const series = options.series ?? [];
	return (
		<ResponsiveContainer width="100%" height="100%">
			<AreaChart data={data}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey={options.xKey} />
				<YAxis />
				<Tooltip />
				<Legend />
				{series.map((s, i) => {
					const color = seriesColor(s.color, i, colors);
					return (
						<Area
							key={s.dataKey}
							type="monotone"
							dataKey={s.dataKey}
							name={s.label ?? s.dataKey}
							stroke={color}
							fill={color}
						/>
					);
				})}
			</AreaChart>
		</ResponsiveContainer>
	);
}
