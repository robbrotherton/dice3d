
export function createSumsHistogram(width, height) {
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "pink")

        return svg;
}

export function updateSumsHistogram(svg, data) {
    console.log(data);
    svg.selectAll("rect").remove();
    svg.selectAll("rect").data(data).enter()
        .append("rect")
        .attr("x", d => d.value * 10)
        .attr("width", 10)
        .attr("height", d => d.count * 10)
}