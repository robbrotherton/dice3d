
export function createSumsHistogram(width, height) {
    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "pink")

        return svg;
}

export function updateSumsHistogram(svgGroup, data) {
    svgGroup.selectAll("rect").data(data).enter()
        .attr("x", d => d.value)
        .attr("height", d => d.count)
}