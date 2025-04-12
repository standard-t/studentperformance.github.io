const svg = d3.select("svg"),
      margin = { top: 30, right: 30, bottom: 40, left: 50 },
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom;

const chart = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

let allData, x, y, scoreExtent;

d3.csv("exam_histogram_data.csv").then(data => {
  data.forEach(d => {
    d.Exam_Score = +d.Exam_Score;
  });

  allData = data;
  scoreExtent = d3.extent(allData.map(d => d.Exam_Score));

  x = d3.scaleLinear().domain(scoreExtent).range([0, width]);
  y = d3.scaleLinear().range([height, 0]);

  updateHistogram("All", 20);

  d3.select("#gender-select").on("change", function () {
    const gender = d3.select(this).property("value");
    const binCount = +d3.select("#bin-slider").property("value");
    updateHistogram(gender, binCount);
  });

  d3.select("#bin-slider").on("input", function () {
    const binCount = +this.value;
    d3.select("#bin-count").text(binCount);
    const gender = d3.select("#gender-select").property("value");
    updateHistogram(gender, binCount);
  });
});

// Kernel density estimator
function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map(function (x) {
      return [x, d3.mean(V, v => kernel(x - v))];
    });
  };
}

function kernelEpanechnikov(k) {
  return function (v) {
    v = v / k;
    return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0;
  };
}

function updateHistogram(gender, binCount) {
  let data = allData;
  if (gender !== "All") {
    data = allData.filter(d => d.Gender === gender);
  }

  const scores = data.map(d => d.Exam_Score);

  const bins = d3.histogram()
    .domain(scoreExtent)
    .thresholds(x.ticks(binCount))(scores);

  const maxBin = d3.max(bins, d => d.length);
  y.domain([0, maxBin]);

  chart.selectAll("*").remove();

  // Axes
  chart.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  chart.append("g")
    .call(d3.axisLeft(y));

  // Bars
  chart.selectAll(".bar")
    .data(bins)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", 1)
    .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`)
    .attr("width", d => x(d.x1) - x(d.x0) - 1)
    .attr("height", d => height - y(d.length))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(100).style("opacity", 1);
      tooltip.html(`${d.length} students<br>Score range: ${d.x0.toFixed(0)}–${d.x1.toFixed(0)}`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 30}px`);
    })
    .on("mouseout", () => {
      tooltip.transition().duration(200).style("opacity", 0);
    });

  // KDE line
  const kdeX = d3.range(scoreExtent[0], scoreExtent[1], 0.5);
  const kde = kernelDensityEstimator(kernelEpanechnikov(2), kdeX);
  const density = kde(scores);

  const maxDensity = d3.max(density, d => d[1]);
  const densityScale = d3.scaleLinear()
    .domain([0, maxDensity])
    .range([height, 0]);

  const line = d3.line()
    .curve(d3.curveBasis)
    .x(d => x(d[0]))
    .y(d => densityScale(d[1]));

  chart.append("path")
    .datum(density)
    .attr("fill", "none")
    .attr("stroke", "#79bc55")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Axis labels
  chart.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 5)
    .style("text-anchor", "middle")
    .text("Exam Score");

  chart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -35)
    .style("text-anchor", "middle")
    .text("Number of Students");
}
