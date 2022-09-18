// Dectect touch device
const isTouchDevice = (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));

let resizeTimer;
let repos;
let colors;

// Generate random hex color code
const randomColor = () => '#' + parseInt(Math.random() * 0xffffff).toString(16);

// Load colors codes and repositories
const init = async () => {
    repos = await fetch("https://api.github.com/users/timo-reymann/repos?per_page=100&type=owner")
        .then(r => r.json())
    repos = repos.filter(r => !r.archived && !r.fork)
    colors = await fetch("./colors.json")
        .then(r => r.json());
};

// Open repository link
const openRepo = (repo) => {
    const link = document.createElement("a");
    link.href = repo.html_url;
    link.target = "_blank";
    link.click();
};

// Render the svg
const render = () => {
    document.querySelector("svg").innerHTML = "";

    const main = document.querySelector("main");
    const width = main.clientWidth;
    const height = main.clientHeight;

    let nodes = repos.map(function (repo) {
        let r = repo.size;
        if (r < 30) {
            r = 30;
        } else if (r > 100) {
            r = 100;
        }

        return {
            radius: r,
            repo,
            color: colors[repo.language] || randomColor()
        }
    });

    // Create tooltip, if not already present
    let tooltip = document.querySelector(".tooltip");
    if (!tooltip) {
        tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }

    // Store refs
    const svg = d3.select("svg");
    const g = svg.append("g")
        .attr("cursor", "grab");

    // Start simulation
    d3.forceSimulation(nodes)
    //       .force('charge', d3.forceManyBody(500).strength(0).distanceMax(100).distanceMin(0))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius))
        .on('tick', () => {
            const u = g
                .selectAll('circle')
                .attr("class", "node")
                .attr("fill", d => d.color)
                .on("mouseover", (d) => tooltip.transition().duration(100).style("opacity", .9))
                .on("mousemove", (d) => {
                    tooltip.html(`<strong>${d.repo.name}</strong>
                                  <br />
                                  <span class="badge info">${!!d.repo.language ? d.repo.language : "other" }</span>
                                  <span class="badge warning">${(d.repo.license || {}).name || 'None'}</span><br />
                                    ${isTouchDevice ? '<a class="badge success" target="_blank" href="' + d.repo.html_url + '">Open on GitHub</a>' : ""}`)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY + 5) + "px");
                })
                .on("mouseout", (d) => tooltip.transition().duration(100).style("opacity", 0))
                .on("click", (d) => {
                    if (isTouchDevice) {
                        return;
                    }
                    openRepo(d.repo)
                })
                .data(nodes)
                .call(d3.drag()
                    .on("start", () => {
                        d3.select(this).raise();
                        g.attr("cursor", "grabbing");
                    })
                    .on("drag", () => d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y))
                    .on("end", () => g.attr("cursor", "grab")));

            // Define circles
            u.enter()
                .append('circle')
                .attr('r', (d) => d.radius)
                .merge(u)
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            u.exit().remove();
        });

    // Enable zoom
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([.6, 9])
        .on("zoom", () => g.attr("transform", d3.event.transform)));
};

// Initialize and add click listener for alert
document.addEventListener("DOMContentLoaded", async () => {
    await init();
    render();
});

// Add resize listener
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        render();
    }, 100)
});
