var width = 500, height = 500;
var cx = 350, cy=250;
var force, vizcanvas, vis;

var nodemap = {};
var nodes = [];
var edgemap = {};
var edges = [];
var aggregate;

// Fit Text
var lines = document.querySelectorAll('span');
fitText(lines[0], .37);
fitText(lines[1], .25);
fitText(lines[2], .15);

var requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame;

function loadData(data){
    console.log('data arriving');
    nodemap = data;
    var node, edgename, edge;
    console.log('All data: %o', Object.keys(data));
    connections = Object.keys(data).map(function(key){
        node = data[key];
        node.lastAccess = new Date(node.lastAccess);
        node.firstAccess = new Date(node.firstAccess);
        node.linkedFrom.forEach(function(name){
            var source = nodemap[name];
            if (!source){
                nodemap[name] = source = {
                    name: name,
                    notVisited: true,
                    notSecure: true,
                    cookie: true
                };
            }
            edgename = name + '->' + node.name;
            if (!edgemap[edgename]){
                edge = {source: source, target: node, name: edgename};
                edgemap[edgename] = edge;
                edges.push(edge);
            }
        });
        node.linkedTo.forEach(function(name){
            var target = nodemap[name];
            if (!target){
                nodemap[name] = target = {
                    name: name,
                    notVisited: true,
                    notSecure: true,
                    cookie: true
                };
            }
            edgename = node.name + '->' + name;
            if (!edgemap[edgename]){
                edge = {source: node, target: target, name: edgename};
                edgemap[edgename] = edge;
                edges.push(edge);
            }
        });
        return nodes.push(node);
    });
    aggregate = {
        allnodes: nodes,
        nodemap: nodemap,
        edges: edges,
        edgemap: edgemap
    };
    initGraph();
}
function getDataForDomain(domain){
    // load data from public server
    // just getting default for now, see
    // https://github.com/mmmavis/temp-collusion-db-server
    // for more options
    vis = d3.select('.vizcanvas');
    var s = document.createElement('script');
    s.src="http://collusiondb-development.herokuapp.com/getData?callback=loadData&aggregateData=true&dateSince=2013-04-03&name=" + domain;
    document.body.appendChild(s);
};


// SET UP D3 HANDLERS

var _initialized = false;

function initGraph(){
    if (_initialized) return;
    // Initialize D3 layout and bind data
    force = d3.layout.force()
        .nodes(aggregate.allnodes)
        .links(aggregate.edges)
        .charge(-500)
        .size([width,height])
        .start();
    updateGraph();

    // update method
    force.on('tick', function(){
        vis.selectAll('.edge')
            .attr('x1', function(edge){ return edge.source.x - cx; })
            .attr('y1', function(edge){ return edge.source.y - cy; })
            .attr('x2', function(edge){ return edge.target.x - cx; })
            .attr('y2', function(edge){ return edge.target.y - cy; });
        vis.selectAll('.node').call(updateNodes);
    });
    _initialized = true;
}

function getRadiusAndAngle(idx){
    var step = 20;
    var radius,angle;
    if (idx < 1){
        angle = 0;
        radius = 0;
    }else if (idx < 9){
        angle = (Math.PI / 4) * idx;
        radius = step;
    }else if(idx < 21){
        angle = (Math.PI / 6) * idx;
        radius = step * 2;
    }else if(idx < 37){
        angle = (Math.PI / 8) * idx;
        radius = step * 3;
    }else{
        angle = (Math.PI / 10) * idx;
        radius = step * 4;
    }
    return {radius: radius, angle: angle};
}

function x(idx){
    var d = getRadiusAndAngle(idx);
    return Math.cos(d.angle) * d.radius;
}

function y(idx){
    var d = getRadiusAndAngle(idx);
    return Math.sin(d.angle) * d.radius;
}

function updateGraph(){
        // Data binding for links
    var lines = vis.selectAll('.edge')
        .data(aggregate.edges, function(edge){ return edge.name; });

    lines.enter().insert('line', ':first-child')
        .classed('edge', true);

    lines.exit()
        .remove();

    var nodes = vis.selectAll('.node')
        .data(aggregate.allnodes, function(node){ return node.name; });

    nodes.call(force.drag);

    nodes.enter().append('circle')
        .classed('visitedYes', function(node){ return node.visitedCount; })
        .classed('site', function(node){ return node.visitedCount; })
        .classed('visitedNo', function(node){ return !node.visitedCount; })
        .attr('cx', function(node, idx){ node.x = node.px = x(idx); return 0; })
        .attr('cy', function(node, idx){ node.y = node.py = y(idx); return 0; })
        .attr('r', function(node){ return 20; })
        .attr('data-name', function(node){ return node.name; })
        .classed('node', true);



    nodes.exit()
        .remove();
    requestAnimationFrame(updateGraph);
}

function updateNodes(thenodes){
    thenodes
    .attr('transform', function(node){ return 'translate(' + (node.x - cx) + ',' + (node.y - cy) + ') scale(' + (1 + .03 * node.weight) + ')'; })
    .classed('secureYes', function(node){ return node.secureCount === node.howMany; })
    .classed('secureNo', function(node){ return node.secureCount !== node.howMany; })
    // .style('opacity', function(node){ return (node.cookieCount / node.howMany) + .5; })
    .attr('data-timestamp', function(node){ return node.lastAccess.toISOString(); });
    // change shape if needed
}

/* Handle form input */

document.getElementById('targetUrl').addEventListener('keydown', handleKeyPress, false);

function handleKeyPress(evt){
    // if Enter key is pressed, then:
    var key = evt.key || evt.keyCode;
    if (key === 13){ // Return/Enter pressed
        // get url
        var url = document.getElementById('targetUrl').value;
        document.getElementById('targetUrl').value = '';
        // load iframe for url
        document.getElementById('website').src = 'http://' + url;
        // load data for url
        // FIXME: Make sure we're only passing through the domain
        getDataForDomain(url);
        // add class to body for animation
        document.body.classList.add('showgraph');
    }
}


