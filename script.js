let globalData = [];
let svg, chartArea, xAxisGroup, yAxisGroup;
let width, height;
const margin = { top: 60, right: 20, bottom: 40, left: 50 };

// Map conditions to labels and colors
const conditionMapping = {
    'High': { label: 'VR (High)', color: 'var(--vr-color)' },
    'Medium': { label: 'Desktop (Medium)', color: 'var(--desktop-color)' },
    'Low': { label: 'Control (Low)', color: 'var(--control-color)' }
};

// Refactor Constants
const DURATION = 500;
const DURATION_LONG = 750;
const DURATION_SLOW = 1000;
const conditions = Object.keys(conditionMapping);

/**
 * Centralized cleanup for chart transitions
 * Clears elements of a specific type or all if no type is provided
 */
function clearChart(exceptType = null) {
    // If we're switching types entirely (e.g., bar to scatter), 
    // we might want to clear more aggressively.
    
    if (exceptType !== 'bar') {
        chartArea.selectAll('.bar')
            .transition().duration(DURATION)
            .attr('y', height)
            .attr('height', 0)
            .remove();
        chartArea.selectAll('.bar-label')
            .transition().duration(DURATION)
            .attr('y', height)
            .remove();
    }
    
    if (exceptType !== 'scatter') {
        chartArea.selectAll('.dot')
            .transition().duration(DURATION)
            .attr('opacity', 0)
            .remove();
        chartArea.selectAll('.trendline')
            .transition().duration(DURATION)
            .style('opacity', 0)
            .remove();
        chartArea.selectAll('.axis-label')
            .transition().duration(DURATION)
            .style('opacity', 0);
    }

    if (!exceptType) {
        xAxisGroup.transition().duration(DURATION).style('opacity', 0);
        yAxisGroup.transition().duration(DURATION).style('opacity', 0);
        svg.select('.chart-title').text('');
    }
}

function initChart() {
    const container = document.getElementById('chart-container');
    const containerRect = container.getBoundingClientRect();
    
    // Set width and height based on container
    width = containerRect.width - margin.left - margin.right;
    height = containerRect.height - margin.top - margin.bottom;

    svg = d3.select('#chart-container').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    chartArea = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Title placeholder for the chart
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', width / 2 + margin.left)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-family', 'var(--header-font)')
        .attr('font-weight', 'bold');

    xAxisGroup = chartArea.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`);

    yAxisGroup = chartArea.append('g')
        .attr('class', 'y-axis');
}

function updateChart(stepIndex) {
    console.log(`Active step: ${stepIndex}`);
    
    if (stepIndex === 0) {
        drawBarChart('count', 'Participants per Condition');
    } else if (stepIndex === 1) {
        drawBarChart('learning_gains', 'Average Learning Gains');
    } else if (stepIndex === 2) {
        drawScatterPlot(false);
    } else if (stepIndex === 3) {
        drawScatterPlot(true);
    } else if (stepIndex === 4) {
        drawBarChart('cognitive_load', 'Average Cognitive Load');
    } else {
        clearChart();
    }
}

function calculateRegression(data, xProp, yProp) {
    const n = data.length;
    if (n < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    data.forEach(d => {
        sumX += d[xProp];
        sumY += d[yProp];
        sumXY += d[xProp] * d[yProp];
        sumX2 += d[xProp] * d[xProp];
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const xMin = d3.min(data, d => d[xProp]);
    const xMax = d3.max(data, d => d[xProp]);

    return [
        { x: xMin, y: slope * xMin + intercept },
        { x: xMax, y: slope * xMax + intercept }
    ];
}

function drawScatterPlot(isFaceted) {
    // 1. Prepare Scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(globalData, d => d.presence) + 5])
        .nice()
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([d3.min(globalData, d => d.learning_gains) - 1, d3.max(globalData, d => d.learning_gains) + 1])
        .nice()
        .range([height, 0]);

    // 2. Clear Bar Chart Elements
    clearChart('scatter');

    // 3. Update Title & Axes
    svg.select('.chart-title')
        .text(isFaceted ? 'Presence vs. Learning Gains by Condition' : 'Overall Presence vs. Learning Gains')
        .transition().duration(DURATION)
        .style('opacity', 1);

    const xAxis = d3.axisBottom(x);
    xAxisGroup.style('opacity', 1).transition().duration(DURATION).call(xAxis);
    xAxisGroup.selectAll("text").style("font-size", "14px");

    // Add X-axis label if it doesn't exist
    if (chartArea.select('.x-label').empty()) {
        chartArea.append('text')
            .attr('class', 'axis-label x-label')
            .attr('x', width / 2)
            .attr('y', height + 35)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .text('Reported Presence Score');
    } else {
        chartArea.select('.x-label').transition().duration(DURATION).style('opacity', 1).text('Reported Presence Score');
    }

    const yAxis = d3.axisLeft(y);
    yAxisGroup.style('opacity', 1).transition().duration(DURATION).call(yAxis);
    yAxisGroup.selectAll("text").style("font-size", "14px");

    // Add Y-axis label if it doesn't exist
    if (chartArea.select('.y-label').empty()) {
        chartArea.append('text')
            .attr('class', 'axis-label y-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -35)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .text('Learning Gains');
    } else {
        chartArea.select('.y-label').transition().duration(DURATION).style('opacity', 1).text('Learning Gains');
    }

    // 4. Draw Dots
    const dots = chartArea.selectAll('.dot')
        .data(globalData);

    dots.enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('r', 5)
        .attr('cx', d => x(d.presence))
        .attr('cy', height)
        .attr('opacity', 0)
        .attr('fill', '#999')
        .merge(dots)
        .transition()
        .duration(DURATION_LONG)
        .attr('cx', d => x(d.presence))
        .attr('cy', d => y(d.learning_gains))
        .attr('opacity', 0.7)
        .attr('fill', d => isFaceted ? conditionMapping[d.condition].color : '#999');

    dots.exit().transition().duration(DURATION).attr('opacity', 0).remove();

    // 5. Draw Trendlines
    let trendlineData = [];
    if (!isFaceted) {
        const regressionPoints = calculateRegression(globalData, 'presence', 'learning_gains');
        if (regressionPoints) {
            trendlineData.push({ id: 'overall', points: regressionPoints, color: '#333' });
        }
    } else {
        conditions.forEach(cond => {
            const conditionData = globalData.filter(d => d.condition === cond);
            const regressionPoints = calculateRegression(conditionData, 'presence', 'learning_gains');
            if (regressionPoints) {
                trendlineData.push({ id: cond, points: regressionPoints, color: conditionMapping[cond].color });
            }
        });
    }

    const lines = chartArea.selectAll('.trendline')
        .data(trendlineData, d => d.id);

    const lineGenerator = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y));

    lines.enter()
        .append('path')
        .attr('class', 'trendline')
        .attr('d', d => lineGenerator(d.points))
        .attr('stroke', d => d.color)
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .attr('stroke-dasharray', function() { return this.getTotalLength(); })
        .attr('stroke-dashoffset', function() { return this.getTotalLength(); })
        .style('opacity', 0)
        .merge(lines)
        .transition()
        .duration(DURATION_SLOW)
        .style('opacity', 1)
        .attr('d', d => lineGenerator(d.points))
        .attr('stroke', d => d.color)
        .attr('stroke-dashoffset', 0);

    lines.exit().transition().duration(DURATION).style('opacity', 0).remove();
}

function drawBarChart(metric, title, yMax) {
    // Hide scatter plot elements
    clearChart('bar');

    // 1. Prepare data
    const chartData = conditions.map(cond => {
        const conditionData = globalData.filter(d => d.condition === cond);
        let value = 0;
        if (metric === 'count') {
            value = conditionData.length;
        } else {
            value = d3.mean(conditionData, d => d[metric]) || 0;
        }
        return {
            condition: cond,
            label: conditionMapping[cond].label,
            color: conditionMapping[cond].color,
            value: value
        };
    });

    // 2. Set up scales
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.label))
        .range([0, width])
        .padding(0.2);

    const maxY = yMax || d3.max(chartData, d => d.value);
    const y = d3.scaleLinear()
        .domain([0, maxY])
        .nice()
        .range([height, 0]);

    // Update title
    svg.select('.chart-title')
        .text(title)
        .transition().duration(DURATION)
        .style('opacity', 1);

    // 3. Update axes
    const xAxis = d3.axisBottom(x);
    xAxisGroup.style('opacity', 1).transition().duration(DURATION).call(xAxis)
        .selectAll("text")
        .style("font-size", "14px");

    const yAxis = d3.axisLeft(y).ticks(5);
    yAxisGroup.style('opacity', 1).transition().duration(DURATION).call(yAxis)
        .selectAll("text")
        .style("font-size", "14px");

    // 4. Update bars with D3 join
    const bars = chartArea.selectAll('.bar')
        .data(chartData, d => d.condition);

    bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.label))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', d => d.color)
        .merge(bars)
        .transition()
        .duration(DURATION_LONG)
        .attr('x', d => x(d.label))
        .attr('y', d => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', d => d.color);

    bars.exit()
        .transition()
        .duration(DURATION)
        .attr('y', height)
        .attr('height', 0)
        .remove();
        
    // Add text labels on top of bars
    const labels = chartArea.selectAll('.bar-label')
        .data(chartData, d => d.condition);
        
    labels.enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', d => x(d.label) + x.bandwidth() / 2)
        .attr('y', height)
        .attr('text-anchor', 'middle')
        .attr('fill', '#333')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text(d => metric === 'count' ? d.value : d.value.toFixed(1))
        .merge(labels)
        .transition()
        .duration(DURATION_LONG)
        .attr('x', d => x(d.label) + x.bandwidth() / 2)
        .attr('y', d => y(d.value) - 5)
        .text(d => metric === 'count' ? d.value : d.value.toFixed(1));
        
    labels.exit()
        .transition()
        .duration(DURATION)
        .attr('y', height)
        .remove();
}

function initObserver() {
    const steps = document.querySelectorAll('.step');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active class from all steps
                steps.forEach(step => step.classList.remove('active'));
                
                // Add active class to current step
                entry.target.classList.add('active');
                
                // Get the step index
                const stepIndex = parseInt(entry.target.getAttribute('data-step'), 10);
                
                // Update chart
                if (!isNaN(stepIndex)) {
                    updateChart(stepIndex);
                }
            }
        });
    }, observerOptions);

    steps.forEach(step => observer.observe(step));
}

function init() {
    // Load data
    d3.csv('data.csv', d => {
        return {
            ...d,
            learning_gains: +d.learning_gains,
            presence: +d.presence,
            cognitive_load: +d.cognitive_load
        };
    }).then(data => {
        console.log('Data loaded successfully');
        globalData = data;
        
        // Initialize Chart container
        initChart();
        
        // Initialize the intersection observer
        initObserver();
    });
}

document.addEventListener("DOMContentLoaded", init);