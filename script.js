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

function nodeFromObj(key, data, depth){
    var edgename, name;
    var node = nodemap[key];
    if (node && !node.faked) return node;
    node = data[key];
    if (!node){
        if (nodemap[key]){
            return nodemap[key];
        }else{
            node = {
                name: key,
                visitedCount: 0,
                secureCount: 0,
                cookieCount: 0,
                faked: true
            }
        }
    }
    node.lastAccess = new Date(node.lastAccess);
    node.firstAccess = new Date(node.firstAccess);
    if (node.visitedCount && node.linkedTo === undefined && depth){
        console.log('loading linked source %s', node.name);
        getDataForDomain(node.name, depth-1);
    }
    if (nodemap[key]){
        merge(nodemap[key], data[key]);
    }else{
        nodemap[key] = data[key];
        nodes.push(node);
    }
    return node;
}

function updateConnections(node, data, depth){
    (node.linkedFrom || []).forEach(function(name){
        var source = nodeFromObj(name, data, depth);
        edgename = name + '->' + node.name;
        if (!edgemap[edgename]){
            edge = {source: source, target: node, name: edgename};
            edgemap[edgename] = edge;
            edges.push(edge);
        }
    });
    (node.linkedTo || []).forEach(function(name){
        var target = nodeFromObj(name, data, depth);
        edgename = node.name + '->' + name;
        if (!edgemap[edgename]){
            edge = {source: node, target: target, name: edgename};
            edgemap[edgename] = edge;
            edges.push(edge);
        }
    });
}

function loadData(data, depth){
    console.log('data arriving');
    var node, edgename, edge;
    console.log('All data: %o', Object.keys(data));
    connections = Object.keys(data).map(function(key){
        return nodeFromObj(key, data, depth || 0);
    });
    connections.forEach(function(conn){
        updateConnections(conn, data, depth);
    });
    aggregate = {
        allnodes: nodes,
        nodemap: nodemap,
        edges: edges,
        edgemap: edgemap
    };
    initGraph();
    updateGraph();
}

function merge(node1, node2){
    if (node1.faked){
        return node2;
    }
    node1.contentTypes = mergeArray(node1.contentTypes, node2.contentTypes);
    node1.cookieCount = Math.max(node1.cookieCount, node2.cookieCount);
    node1.firstAccess = Math.min(node1.firstAccess, node2.firstAccess);
    node1.howMany = Math.max(node1.howMany, node2.howMany);
    node1.linkedFrom = mergeArray(node1.linkedFrom, node2.linkedFrom);
    node1.linkedTo = mergeArray(node1.linkedTo, node2.linkedTo);
    node1.method = mergeArray(node1.method, node2.method);
    node1.secureCount = Math.max(node1.secureCount, node2.secureCount);
    node1.status = mergeArray(node1.status, node2.status);
    node1.subdomain = mergeArray(node1.subdomain, node2.subdomain);
    node1.visitedCount = Math.max(node1.visitedAccount, node2.visitedCount);
    console.log('x: %s, y: %s, px: %s, py: %s', node1.x, node1.y, node1.px, node1.py);
}

function mergeArray(arr1, arr2){
    if (!arr1) return arr2;
    if (!arr2) return arr1;
    if (!arr1.length) return arr2;
    if (!arr2.length) return arr1;
    arr2.forEach(function(item){
        if (arr1.indexOf(item) < 0){
            arr1.push(item);
        }
    });
    return arr1;
}

function getDataForDomain(domain, depth){
    // load data from public server
    // just getting default for now, see
    // https://github.com/mmmavis/temp-collusion-db-server
    // for more options
    vis = d3.select('.vizcanvas');
    var s = document.createElement('script');
    s.src="http://collusiondb-development.herokuapp.com/getData?callback=loadData" + (depth || 0) + "&aggregateData=true&dateSince=2013-04-03&name=" + domain;
    document.body.appendChild(s);
};

// YES, THIS IS FUGLY
// Trying to have shallow recursion for JSONP callbacks isn't pretty

function loadData0(data){
    loadData(data, 0);
}

function loadData1(data){
    loadData(data, 1);
}

function loadData2(data){
    loadData(data, 2);
}

// SET UP D3 HANDLERS

var _initialized = false;

function initGraph(){
    if (_initialized) return;
    // Initialize D3 layout and bind data
    console.log('initGraph with %s nodes and %s edges', aggregate.allnodes.length, aggregate.edges.length);
    force = d3.layout.force()
        .nodes(aggregate.allnodes)
        .links(aggregate.edges)
        .charge(-500)
        .size([width,height])
        .start();

    // update method
    force.on('tick', function(){
        vis.selectAll('.edge')
            .attr('x1', function(edge){ return edge.source.x - cx; })
            .attr('y1', function(edge){ return edge.source.y - cy; })
            .attr('x2', function(edge){ return edge.target.x - cx; })
            .attr('y2', function(edge){ return edge.target.y - cy; });
        vis.selectAll('.node')
            .attr('transform', function(node){ return 'translate(' + (node.x - cx) + ',' + (node.y - cy) + ') scale(' + (1 + .03 * node.weight) + ')'; })
            .classed('secureYes', function(node){ return node.secureCount === node.howMany; })
            .classed('secureNo', function(node){ return node.secureCount !== node.howMany; })
            .attr('data-timestamp', function(node){ return node.lastAccess.toISOString(); });
    });
    _initialized = true;
}

function getRadiusAndAngle(idx){
    var step = 30;
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
        radius = step * 6;
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

    nodes.enter().append('use')
        .attr('xlink:href', function(node){ return node.visitedCount ? '#globe' : '#eyeball' })
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
}

/* Handle form input */

var inputs = document.getElementsByClassName('targetUrl');
for (var i = 0; i < inputs.length; i++){
    inputs[i].addEventListener('keydown', handleKeyPress, false);
}

function handleKeyPress(evt){
    // if Enter key is pressed, then:
    var key = evt.key || evt.keyCode;
    if (key === 13){ // Return/Enter pressed
        if (state === 1){
            state = 2;
            applyState();
        }else if(state === 4){
            state = 5;
            applyState();
        }
    }
}

document.addEventListener('unload', function(evt){
    document.getElementById('website').src = 'about:blank';
    document.getElementById('website2').src = 'about:blank';
}, false);

document.getElementById('website').src = 'about:blank';
document.getElementById('website2').src = 'about:blank';

var state = 0;
var MAX_STATE = 7;
var video = document.getElementById('video');

function cycleState(evt){
    var key = evt.key || evt.keyCode;
    if (key === evt.DOM_VK_LEFT){
        // reduce state
        if (state < 1){
            return false;
        }
        state -= 1;
    }else if (key === evt.DOM_VK_RIGHT){
        if (state >= MAX_STATE){
            return false;
        }
        state += 1;
    }else if (key === evt.DOM_VK_SPACE){
        evt.preventDefault();
        video.paused ? video.play() : video.pause();
        return false;
    }
    applyState();
    evt.preventDefault();
    return false;
}

function timerState(evt){
    if (video.currentTime > 29.5 && video.currentTime < 32){
        state = 1;
        applyState();
    }else if (video.currentTime > 91.5 && video.currentTime < 95){
        state = 4;
        applyState();
    }
}

function applyState(){
    // Simple linear state machine, but different triggers can progress state
    switch(state){
        case 0: // hide everything except video and start playing at 0
            document.body.className = '';
            video.currentTime = 0;
            video.play();
            break;
        case 1: // stop playing video and show first input prompt
                // fade to looping audio
            video.pause();
            document.body.className = 'showinput';
            break;
        case 2: // hide input prompt and load requested page and graph
            // get url
            var url = inputs[0].value;
            if (!url.length){
                url = 'vancouversun.com';
            }
            inputs[0].value = '';
            // load iframe for url
            document.getElementById('website').src = 'http://' + url;
            // load data for url
            // FIXME: Make sure we're only passing through the domain
            getDataForDomain(url, 1);
            // add class to body for animation
            document.body.className = 'showgraph';
            // after awhile, change the text and re-show the form
            break;
        case 3: // fade out looping audio
                // start video again
            video.currentTime = 32.0;
            video.play();
            break;
        case 4: // pause video, show second input prompt
                // fade to looping audio
            video.pause();
            document.body.className = 'showinput2';
            break;
        case 5: // hide input prompt and load requested page and graph
            var url = inputs[1].value;
            if (!url.length){
                url = 'boingboing.net';
            }
            inputs[1].value = '';
            // load iframe for url
            document.getElementById('website2').src = 'http://' + url;
            // load data for url
            // FIXME: Make sure we're only passing through the domain
            getDataForDomain(url, 0);
            // add class to body for animation
            document.body.className = 'showgraph2';
            // after awhile, change the text and re-show the form
            break;
        case 6: // fade out looping audio
                // finish playing movie
                video.currentTime = 95;
                video.play();
            break;
        case 7: // fade to looping audio
                // Show call to install Collusion
            document.body.className = 'final';
            break;
    }
}

function finalState(){
    state = 7;
    applyState();
}

document.body.addEventListener('keydown', cycleState, false);
video.addEventListener('timeupdate', timerState, false);
video.addEventListener('ended', finalState, false);

