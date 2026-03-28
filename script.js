let globalData = [];

function updateChart(stepIndex) {
    console.log(`Active step: ${stepIndex}`);
    // Future chart update logic will go here
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
    if (typeof d3 !== 'undefined') {
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
            
            // Initialize the intersection observer
            initObserver();
        }).catch(error => {
            console.error('Error loading data:', error);
            // Fallback: initialize observer even if data fails to load for layout testing
            initObserver();
        });
    } else {
        console.warn('D3 is not loaded. Initializing observer without data.');
        initObserver();
    }
}

document.addEventListener("DOMContentLoaded", init);