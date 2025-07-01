import { Color, Container } from "@amcharts/amcharts5";
import { useEffect, useState } from "react";
import {
    AxisRendererX,
    AxisRendererY,
    DateAxis,
    StepLineSeries,
    ValueAxis,
    XYChart,
    XYChartScrollbar,
} from "@amcharts/amcharts5/xy";
import { DateItem } from "@pipeline/aggregate/Common";
import { useBlockData } from "@report/BlockHook";
import { getWorker } from "@report/WorkerWrapper";
import { LoadingGroup } from "@report/components/LoadingGroup";
import { AmCharts5Chart } from "@report/components/viz/amcharts/AmCharts5Chart";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TextField from "@mui/material/TextField";

const SB_HEIGHT = 50;
const RESETS = {
    paddingBottom: 0,
    paddingTop: 0,
    paddingLeft: 0,
    paddingRight: 0,
    marginBottom: 0,
    marginTop: 0,
    marginLeft: 0,
    marginRight: 0,
};

const createTimeSelector = (c: Container, onRangeChange: (start: Date, end: Date) => void) => {
    const chart = c.root.container.children.push(
        XYChart.new(c.root, {
            layout: c.root.verticalLayout,
            ...RESETS,
        })
    );

    const scrollbarX = XYChartScrollbar.new(c.root, {
        orientation: "horizontal",
        height: SB_HEIGHT,
        ...RESETS,
    });

    scrollbarX.get("background")!.setAll({
        fill: Color.fromHex(0x1e2529),
        fillOpacity: 0.01,
    });
    chart.plotContainer.set("visible", false);
    chart.rightAxesContainer.set("visible", false);
    chart.leftAxesContainer.set("visible", false);
    chart.bottomAxesContainer.set("visible", false);

    chart.set("scrollbarX", scrollbarX);

    const xAxis = scrollbarX.chart.xAxes.push(
        DateAxis.new(c.root, {
            baseInterval: { timeUnit: "day", count: 1 },
            renderer: AxisRendererX.new(c.root, {}),
        })
    );

    const yAxis = scrollbarX.chart.yAxes.push(
        ValueAxis.new(c.root, {
            renderer: AxisRendererY.new(c.root, {}),
            min: 0,
            maxPrecision: 0,
        })
    );

    const series = scrollbarX.chart.series.push(
        StepLineSeries.new(c.root, {
            xAxis: xAxis,
            yAxis: yAxis,
            valueXField: "ts",
            valueYField: "v",
            noRisers: true,
        })
    );

    series.strokes.template.setAll({
        strokeWidth: 2,
        strokeOpacity: 0.5,
    });
    series.fills.template.setAll({
        fillOpacity: 0.2,
        visible: true,
    });

    const dateAxisChanged = (ev: { start: number; end: number }) => {
        let start = xAxis.positionToDate(ev.start);
        let end = xAxis.positionToDate(ev.end);
        if (start > end) [start, end] = [end, start];
        // // Prevent redundant calls to onRangeChange
        // if (
        //     start.getTime() === fromDate?.getTime() &&
        //     end.getTime() === toDate?.getTime()
        // ) {
        //     console.log("Slider range is already synchronized, skipping onRangeChange.");
        //     return;
        // }
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            // getWorker().updateTimeRange(start, end);
            // onRangeChange(start, end);
        }
    };
    scrollbarX.events.on("rangechanged", dateAxisChanged);

    return (data: DateItem[]) => {
        series.data.setAll(data);
    };
};

const TimeSelector = () => {
    // Utility function to add days to a date
    const DateAdd = (date: Date, days: number): Date => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    // Get the last valid date
    const dateLast = DateAdd(getWorker().getActiveEndDate(), -1);

    // State for date pickers
    const [fromDate, setFromDate] = useState<Date | null>(dateLast);
    const [toDate, setToDate] = useState<Date | null>(dateLast);

    useEffect(() => {
        if (fromDate && toDate) {
            getWorker().updateTimeRange(fromDate, toDate);
        }
    }, [fromDate, toDate]);
    useEffect(() => {
        if (fromDate && toDate && fromDate > toDate) {
            setToDate(fromDate);
        }
    }, [fromDate]);
    return (
        <>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <div className="Filters__Filter">
                    <label htmlFor="time">Time</label>
                    <div className="DatePickersContainer">
                        <span className="Filters__Filter">
                            <DatePicker
                                label="From Date"
                                value={fromDate}
                                format="dd/MM/yyyy"
                                onChange={(newValue: Date | null) => {
                                    if (newValue) {
                                        // Ensure "From Date" is not later than "To Date" or "dateLast"
                                        if (newValue > toDate!) {
                                            setFromDate(newValue);
                                            setToDate(newValue);
                                        } else {
                                            setFromDate(newValue);
                                        }
                                    }
                                }}
                                enableAccessibleFieldDOMStructure={false}
                                slots={{ textField: TextField }}
                            />
                        </span>
                        <span className="Filters__Filter">
                            <DatePicker
                                label="To Date"
                                value={toDate}
                                format="dd/MM/yyyy"
                                onChange={(newValue: Date | null) => {
                                    if (newValue) {
                                        if (newValue < fromDate!) {
                                            setToDate(newValue);
                                            setFromDate(newValue);
                                        }
                                         else {
                                            setToDate(newValue);
                                        }
                                    }
                                }}
                                enableAccessibleFieldDOMStructure={false}
                                slots={{ textField: TextField }}
                            />
                        </span>
                    </div>
                </div>
            </LocalizationProvider>
        </>
    );
};

export default () => <LoadingGroup children={() => <TimeSelector />} />;
