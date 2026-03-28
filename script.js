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
    } else if (stepIndex === 4) {
        drawBarChart('cognitive_load', 'Average Cognitive Load');
    } else {
        // Clear elements when transitioning away from bar charts
        chartArea.selectAll('.bar').transition().duration(500).attr('y', height).attr('height', 0).remove();
        chartArea.selectAll('.bar-label').transition().duration(500).attr('y', height).remove();
        
        // Remove axes safely but leave groups for later charts
        xAxisGroup.transition().duration(500).style('opacity', 0);
        yAxisGroup.transition().duration(500).style('opacity', 0);
        svg.select('.chart-title').text('');
    }
}

function drawBarChart(metric, title, yMax) {
    // 1. Prepare data
    const chartData = ['High', 'Medium', 'Low'].map(cond => {
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
        .transition().duration(500)
        .style('opacity', 1);

    // 3. Update axes
    const xAxis = d3.axisBottom(x);
    xAxisGroup.style('opacity', 1).transition().duration(500).call(xAxis)
        .selectAll("text")
        .style("font-size", "14px");

    const yAxis = d3.axisLeft(y).ticks(5);
    yAxisGroup.style('opacity', 1).transition().duration(500).call(yAxis)
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
        .duration(750)
        .attr('x', d => x(d.label))
        .attr('y', d => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', d => d.color);

    bars.exit()
        .transition()
        .duration(500)
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
        .duration(750)
        .attr('x', d => x(d.label) + x.bandwidth() / 2)
        .attr('y', d => y(d.value) - 5)
        .text(d => metric === 'count' ? d.value : d.value.toFixed(1));
        
    labels.exit()
        .transition()
        .duration(500)
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