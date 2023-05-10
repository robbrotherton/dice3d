
export function createSumsHistogram(width, height) {
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width * 0.92)
        .attr("height", height)
        // .style("background", "pink")
        .style("margin", "0 auto")

        return svg;
}

export function updateSumsHistogram(svg, data, params) {

    const maxSum = params.numberOfDice * 6;
    const svgWidth = svg.attr("width");
    const barWidth = svgWidth / maxSum;

    const x = d3.scaleLinear()
        .domain([params.numberOfDice, params.numberOfDice * 6])
        .range([0, svgWidth- barWidth])
        
    svg.selectAll("rect").remove();

    svg.selectAll("rect").data(data).enter()
        .append("rect")
        .attr("x", d => x(d.value))
        .attr("width", barWidth)
        .attr("height", d => d.count * 10)
}