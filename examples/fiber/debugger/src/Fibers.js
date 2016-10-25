import React from 'react';
import { Motion, spring } from 'react-motion';
import dagre from 'dagre';
import prettyFormat from 'pretty-format';
import reactElement from 'pretty-format/plugins/ReactElement';

function getFiberColor(fibers, id) {
  if (fibers.currentIDs.indexOf(id) > -1) {
    return 'lightgreen';
  }
  if (id === fibers.workInProgressID) {
    return 'yellow';
  }
  return 'lightyellow';
}

function Graph(props) {
  var g = new dagre.graphlib.Graph();
  g.setGraph({
    width: 1000,
    height: 1000,
    nodesep: 50,
    edgesep: 150,
    ranksep: 150,
    marginx: 100,
    marginy: 100,
  });

  var edgeLabels = {};
  React.Children.forEach(props.children, function(child) {
    if (!child) {
      return;
    }
    if (child.type.isVertex) {
      g.setNode(child.key, {
        label: child,
        width: child.props.width,
        height: child.props.height
      });
    } else if (child.type.isEdge) {
      const relationshipKey = child.props.source + ':' + child.props.target;
      if (!edgeLabels[relationshipKey]) {
        edgeLabels[relationshipKey] = [];
      }
      edgeLabels[relationshipKey].push(child);
    }
  });

  Object.keys(edgeLabels).forEach(key => {
    const children = edgeLabels[key];
    const child = children[0];
    g.setEdge(child.props.source, child.props.target, {
      label: child,
      allChildren: children.map(c => c.props.children),
      weight: child.props.weight
    });
  });

  dagre.layout(g);

  var nodes = g.nodes().map(v => {
    var node = g.node(v);
    return (
      <Motion style={{
        x: props.isDragging ? node.x : spring(node.x),
        y: props.isDragging ? node.y : spring(node.y)
      }} key={node.label.key}>
        {interpolatingStyle =>
          React.cloneElement(node.label, {
            x: interpolatingStyle.x + props.dx,
            y: interpolatingStyle.y + props.dy
          })
        }
      </Motion>
    );
  });

  var edges = g.edges().map(e => {
    var edge = g.edge(e);
    let idx = 0;
    return (
      <Motion style={edge.points.reduce((bag, point) => {
        bag[idx + ':x'] = props.isDragging ? point.x : spring(point.x);
        bag[idx + ':y'] = props.isDragging ? point.y : spring(point.y);
        idx++;
        return bag;
      }, {})} key={edge.label.key}>
        {interpolatedStyle => {
          let points = [];
          Object.keys(interpolatedStyle).forEach(key => {
            const [idx, prop] = key.split(':');
            if (!points[idx]) {
              points[idx] = { x: props.dx, y: props.dy };
            }
            points[idx][prop] += interpolatedStyle[key];
          });
          return React.cloneElement(edge.label, {
            points,
            id: edge.label.key,
            children: edge.allChildren.join(', ')
          });
        }}
      </Motion>
    );
  });

  return (
    <div style={{
      position: 'relative',
      height: '100%'
    }}>
      {edges}
      {nodes}
    </div>
  );
}

function Vertex(props) {
  return (
    <div style={{
      position: 'absolute',
      border: '1px solid black',
      left: (props.x-(props.width/2)),
      top: (props.y-(props.height/2)),
      width: props.width,
      height: props.height,
      overflow: 'hidden',
      padding: '4px',
      wordWrap: 'break-word'
    }} {...props} />
  );
}
Vertex.isVertex = true;

const strokes = {
  alt: 'blue',
  child: 'green',
  sibling: 'darkgreen',
  return: 'red',
  fx: 'purple',
  progressedChild: 'cyan',
  progressedDel: 'brown'
};

function Edge(props) {
  var points = props.points;
  var path = "M" + points[0].x + " " + points[0].y + " ";

  if (!points[0].x || !points[0].y) {
    return null;
  }

  for (var i = 1; i < points.length; i++) {
      path += "L" + points[i].x + " " + points[i].y + " ";
      if (!points[i].x || !points[i].y) {
        return null;
      }
  }

  var lineID = props.id;

  return (
    <svg width="100%" height="100%" style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    }}>
      <defs>
        <path d={path} id={lineID} />
        <marker id="markerCircle" markerWidth="8" markerHeight="8" refX="5" refY="5">
          <circle cx="5" cy="5" r="3" style={{stroke: 'none', fill:'black'}}/>
        </marker>
        <marker id="markerArrow" markerWidth="13" markerHeight="13" refX="2" refY="6"
               orient="auto">
          <path d="M2,2 L2,11 L10,6 L2,2" style={{fill: 'black'}} />
        </marker>
      </defs>

      <use xlinkHref={`#${lineID}`} fill="none" stroke={strokes[props.kind]} style={{
        markerStart: 'url(#markerCircle)',
        markerEnd: 'url(#markerArrow)'
      }} />
      <text>
        <textPath xlinkHref={`#${lineID}`}>
          {'     '}{props.children}
        </textPath>
      </text>
    </svg>
  );
}
Edge.isEdge = true;

export default function Fibers({ fibers, show, ...rest }) {
  const items = Object.keys(fibers.descriptions).map(id =>
    fibers.descriptions[id]
  );

  const isDragging = rest.className.indexOf('dragging') > -1;
  const [_, sdx, sdy] = rest.style.transform.match(/translate\((\-?\d+)px,(\-?\d+)px\)/) || [];
  const dx = Number(sdx);
  const dy = Number(sdy);

  return (
    <div {...rest} style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      ...rest.style,
      transform: null
    }}>
      <Graph className="graph" dx={dx} dy={dy} isDragging={isDragging}>
        {items.map(fiber => [
          <Vertex
            key={fiber.id}
            width={200}
            height={100}>
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: getFiberColor(fibers, fiber.id)
              }}
              title={prettyFormat(fiber, { plugins: [reactElement ]})}>
              <small>{fiber.tag} #{fiber.id}</small>
              <br />
              {fiber.type}
              <br />
              <small>Priority: {fiber.pendingWorkPriority} pend, {fiber.progressedPriority} prog</small>
            </div>
          </Vertex>,
          fiber.child && show.child &&
            <Edge
              source={fiber.id}
              target={fiber.child}
              kind="child"
              weight={1000}
              key={`${fiber.id}-${fiber.child}-child`}>
              child
            </Edge>,
          fiber.progressedChild && show.progressedChild &&
            <Edge
              source={fiber.id}
              target={fiber.progressedChild}
              kind="progressedChild"
              weight={1000}
              key={`${fiber.id}-${fiber.progressedChild}-pChild`}>
              pChild
            </Edge>,
          fiber.sibling && show.sibling &&
            <Edge
              source={fiber.id}
              target={fiber.sibling}
              kind="sibling"
              weight={2000}
              key={`${fiber.id}-${fiber.sibling}-sibling`}>
              sibling
            </Edge>,
          fiber.return && show.return &&
            <Edge
              source={fiber.id}
              target={fiber.return}
              kind="return"
              weight={1000}
              key={`${fiber.id}-${fiber.return}-return`}>
              return
            </Edge>,
          fiber.nextEffect && show.fx &&
            <Edge
              source={fiber.id}
              target={fiber.nextEffect}
              kind="fx"
              weight={100}
              key={`${fiber.id}-${fiber.nextEffect}-nextEffect`}>
              nextFx
            </Edge>,
          fiber.firstEffect && show.fx &&
            <Edge
              source={fiber.id}
              target={fiber.firstEffect}
              kind="fx"
              weight={100}
              key={`${fiber.id}-${fiber.firstEffect}-firstEffect`}>
              firstFx
            </Edge>,
          fiber.lastEffect && show.fx &&
            <Edge
              source={fiber.id}
              target={fiber.lastEffect}
              kind="fx"
              weight={100}
              key={`${fiber.id}-${fiber.lastEffect}-lastEffect`}>
              lastFx
            </Edge>,
          fiber.progressedFirstDeletion && show.progressedDel &&
            <Edge
              source={fiber.id}
              target={fiber.progressedFirstDeletion}
              kind="progressedDel"
              weight={100}
              key={`${fiber.id}-${fiber.progressedFirstDeletion}-pFD`}>
              pFDel
            </Edge>,
          fiber.progressedLastDeletion && show.progressedDel &&
            <Edge
              source={fiber.id}
              target={fiber.progressedLastDeletion}
              kind="progressedDel"
              weight={100}
              key={`${fiber.id}-${fiber.progressedLastDeletion}-pLD`}>
              pLDel
            </Edge>,
          fiber.alternate && show.alt &&
            <Edge
              source={fiber.id}
              target={fiber.alternate}
              kind="alt"
              weight={10}
              key={`${fiber.id}-${fiber.alternate}-alt`}>
              alt
            </Edge>,
        ])}
      </Graph>
    </div>
  );
}
