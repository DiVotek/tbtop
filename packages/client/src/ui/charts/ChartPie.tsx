import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ChartBlockOptions, ChartPoint } from "../../structure/chartBlock";
import { seriesColor } from "./chartColors";

const DONUT_INNER_RADIUS = 60;

interface PieConfig {
	innerRadius: number;
	colors: string[];
}

function renderPie(data: ChartPoint[], options: ChartBlockOptions, config: PieConfig) {
	const { innerRadius, colors } = config;
	const valueKey = options.series?.[0]?.dataKey ?? "";
	return (
		<ResponsiveContainer width="100%" height="100%">
			<PieChart>
				<Tooltip />
				<Legend />
				<Pie
					data={data}
					dataKey={valueKey}
					nameKey={options.nameKey}
					innerRadius={innerRadius}
					label
				>
					{data.map((point, i) => (
						<Cell
							key={String(point[options.nameKey ?? ""] ?? i)}
							fill={seriesColor(undefined, i, colors)}
						/>
					))}
				</Pie>
			</PieChart>
		</ResponsiveContainer>
	);
}

export function renderPieChart(data: ChartPoint[], options: ChartBlockOptions, colors: string[]) {
	return renderPie(data, options, { innerRadius: 0, colors });
}

export function renderDonutChart(data: ChartPoint[], options: ChartBlockOptions, colors: string[]) {
	return renderPie(data, options, { innerRadius: DONUT_INNER_RADIUS, colors });
}
