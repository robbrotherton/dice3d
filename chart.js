
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
    const counts = data.map(d => d.count);
    const maxCount = counts.reduce((a, b) => Math.max(a, b), -Infinity);
    
    const totalRolls = counts.reduce((accumulator, value) => {
        return accumulator + value;
      }, 0);
    
    d3.select("#throw-counter").text(totalRolls);
    const svgWidth = svg.attr("width");
    const barWidth = svgWidth / maxSum;

    const x = d3.scaleLinear()
        .domain([params.numberOfDice, params.numberOfDice * 6])
        .range([0, svgWidth- barWidth])
        
    svg.selectAll("rect").remove();

    svg.selectAll("rect").data(data).enter()
        .append("rect")
        .attr("fill", "#D77")
        .attr("x", d => x(d.value))
        .attr("width", barWidth)
        .attr("height", d => Math.min(d.count * 10, d.count / maxCount * 200));
}

export function resetChart(svg, data) {
    d3.select("#throw-counter").text('');
    data.length = 0;
    svg.selectAll("rect").remove();
}