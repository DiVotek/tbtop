import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ChartBlockOptions, ChartPoint } from "../../structure/chartBlock";
import { seriesColor } from "./chartColors";

const DONUT_INNER_RADIUS = 60;

function renderPie(data: ChartPoint[], options: ChartBlockOptions, innerRadius: number) {
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
							fill={seriesColor(undefined, i)}
						/>
					))}
				</Pie>
			</PieChart>
		</ResponsiveContainer>
	);
}

export function renderPieChart(data: ChartPoint[], options: ChartBlockOptions) {
	return renderPie(data, options, 0);
}

export function renderDonutChart(data: ChartPoint[], options: ChartBlockOptions) {
	return renderPie(data, options, DONUT_INNER_RADIUS);
}
