const fs = require("fs");
const path = require("path");

let seq = 1;
const font = "Arial;13;0";
const boldFont = "Arial;13;1";

function newId(prefix = "ID") {
  return `${prefix}_${String(seq++).padStart(4, "0")}`;
}

function ref(id) {
  return { $ref: id };
}

function actionNode(name, parentId) {
  return {
    _type: "UMLAction",
    _id: newId("ACT"),
    _parent: ref(parentId),
    name,
  };
}

function controlNode(type, name, parentId) {
  return {
    _type: type,
    _id: newId("CTL"),
    _parent: ref(parentId),
    name,
  };
}

function createSwimlane(diagramId, activityId, spec) {
  const laneId = newId("LANE");
  const laneViewId = newId("LANEV");
  const labelId = newId("LBL");

  const laneModel = {
    _type: "UMLActivityPartition",
    _id: laneId,
    _parent: ref(activityId),
    name: spec.name,
    nodes: [],
  };

  const laneView = {
    _type: "UMLSwimlaneView",
    _id: laneViewId,
    _parent: ref(diagramId),
    model: ref(laneId),
    subViews: [
      {
        _type: "LabelView",
        _id: labelId,
        _parent: ref(laneViewId),
        font,
        left: spec.left,
        top: spec.top + 4,
        width: spec.width,
        height: 13,
        text: spec.name,
        verticalAlignment: 3,
      },
    ],
    containedViews: [],
    font,
    left: spec.left,
    top: spec.top,
    width: spec.width,
    height: spec.height,
    nameLabel: ref(labelId),
  };

  return { laneModel, laneView };
}

function createActionView(diagramId, laneViewId, modelId, activityName, spec) {
  const viewId = newId("ACTV");
  const nameCompartmentId = newId("NC");
  const stereotypeLabelId = newId("LBL");
  const nameLabelId = newId("LBL");
  const namespaceLabelId = newId("LBL");
  const propertyLabelId = newId("LBL");
  const nameBoxHeight = Math.max(spec.height - 16, 38);

  return {
    _type: "UMLActionView",
    _id: viewId,
    _parent: ref(diagramId),
    model: ref(modelId),
    subViews: [
      {
        _type: "UMLNameCompartmentView",
        _id: nameCompartmentId,
        _parent: ref(viewId),
        model: ref(modelId),
        subViews: [
          {
            _type: "LabelView",
            _id: stereotypeLabelId,
            _parent: ref(nameCompartmentId),
            visible: false,
            font,
            top: spec.top + 4,
            height: 13,
          },
          {
            _type: "LabelView",
            _id: nameLabelId,
            _parent: ref(nameCompartmentId),
            font: boldFont,
            left: spec.left + 4,
            top: spec.top + 9,
            width: spec.width - 8,
            height: Math.max(spec.height - 18, 26),
            text: spec.name,
            horizontalAlignment: 1,
            verticalAlignment: 2,
            wordWrap: true,
          },
          {
            _type: "LabelView",
            _id: namespaceLabelId,
            _parent: ref(nameCompartmentId),
            visible: false,
            font,
            top: spec.top + 4,
            width: spec.width + 120,
            height: 13,
            text: `(from ${activityName})`,
          },
          {
            _type: "LabelView",
            _id: propertyLabelId,
            _parent: ref(nameCompartmentId),
            visible: false,
            font,
            top: spec.top + 4,
            horizontalAlignment: 1,
            wordWrap: true,
          },
        ],
        font,
        left: spec.left,
        top: spec.top,
        width: spec.width,
        height: nameBoxHeight,
        stereotypeLabel: ref(stereotypeLabelId),
        nameLabel: ref(nameLabelId),
        namespaceLabel: ref(namespaceLabelId),
        propertyLabel: ref(propertyLabelId),
      },
    ],
    containerView: ref(laneViewId),
    font,
    containerChangeable: true,
    left: spec.left,
    top: spec.top,
    width: spec.width,
    height: spec.height,
    nameCompartment: ref(nameCompartmentId),
    wordWrap: true,
  };
}

function createControlNodeView(diagramId, laneViewId, modelId, spec) {
  return {
    _type: "UMLControlNodeView",
    _id: newId("CTLV"),
    _parent: ref(diagramId),
    model: ref(modelId),
    containerView: ref(laneViewId),
    font,
    containerChangeable: true,
    left: spec.left,
    top: spec.top,
    width: spec.width,
    height: spec.height,
  };
}

function edgeLabel(viewId, modelId, options) {
  const label = {
    _type: "EdgeLabelView",
    _id: newId("ELBL"),
    _parent: ref(viewId),
    model: ref(modelId),
    font,
    left: options.left,
    top: options.top,
    height: 13,
    alpha: options.alpha,
    distance: options.distance,
    hostEdge: ref(viewId),
    edgePosition: 1,
  };
  if (options.width !== undefined) {
    label.width = options.width;
  }
  if (options.visible !== undefined) {
    label.visible = options.visible;
  }
  if (options.text !== undefined) {
    label.text = options.text;
  }
  return label;
}

function createFlow(diagramId, activityId, spec) {
  const modelId = newId("FLOW");
  const viewId = newId("FLOWV");

  const model = {
    _type: "UMLControlFlow",
    _id: modelId,
    _parent: ref(activityId),
    source: ref(spec.sourceModelId),
    target: ref(spec.targetModelId),
  };

  if (spec.guard) {
    model.guard = spec.guard;
  }

  const nameLabel = edgeLabel(viewId, modelId, {
    left: spec.labelLeft,
    top: spec.labelTop,
    width: spec.guard ? Math.max(spec.guard.length * 12, 70) : undefined,
    alpha: spec.labelAlpha ?? 1.5707963267948966,
    distance: spec.labelDistance ?? 18,
    visible: spec.guard ? undefined : false,
    text: spec.guard ? ` [${spec.guard}]` : undefined,
  });

  const stereotypeLabel = edgeLabel(viewId, modelId, {
    left: spec.labelLeft + 16,
    top: spec.labelTop,
    alpha: 1.5707963267948966,
    distance: 30,
    visible: null,
  });

  const propertyLabel = edgeLabel(viewId, modelId, {
    left: spec.labelLeft - 20,
    top: spec.labelTop + 1,
    alpha: -1.5707963267948966,
    distance: 15,
    visible: false,
  });

  const view = {
    _type: "UMLControlFlowView",
    _id: viewId,
    _parent: ref(diagramId),
    model: ref(modelId),
    subViews: [nameLabel, stereotypeLabel, propertyLabel],
    font,
    head: ref(spec.headViewId),
    tail: ref(spec.tailViewId),
    lineStyle: 2,
    points: spec.points,
    showVisibility: true,
    nameLabel: ref(nameLabel._id),
    stereotypeLabel: ref(stereotypeLabel._id),
    propertyLabel: ref(propertyLabel._id),
  };

  return { model, view };
}

function collectIds(obj, ids = new Set()) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectIds(item, ids));
    return ids;
  }
  if (obj && typeof obj === "object") {
    if (obj._id) {
      ids.add(obj._id);
    }
    for (const value of Object.values(obj)) {
      collectIds(value, ids);
    }
  }
  return ids;
}

function collectRefs(obj, refs = []) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectRefs(item, refs));
    return refs;
  }
  if (obj && typeof obj === "object") {
    if (Object.keys(obj).length === 1 && obj.$ref) {
      refs.push(obj.$ref);
      return refs;
    }
    for (const value of Object.values(obj)) {
      collectRefs(value, refs);
    }
  }
  return refs;
}

const activityName = "咨询公司会见客户";

const projectId = newId("PRJ");
const modelId = newId("MOD");
const activityId = newId("ACTY");
const diagramId = newId("DG");

const project = {
  _type: "Project",
  _id: projectId,
  name: `${activityName}活动图`,
  ownedElements: [],
};

const model = {
  _type: "UMLModel",
  _id: modelId,
  _parent: ref(projectId),
  name: activityName,
  ownedElements: [],
};

const activity = {
  _type: "UMLActivity",
  _id: activityId,
  _parent: ref(modelId),
  name: activityName,
  ownedElements: [],
  edges: [],
  groups: [],
};

const diagram = {
  _type: "UMLActivityDiagram",
  _id: diagramId,
  _parent: ref(activityId),
  name: `${activityName}活动图`,
  ownedViews: [],
};

project.ownedElements.push(model);
model.ownedElements.push(activity);
activity.ownedElements.push(diagram);

const lanes = [
  { key: "sales", name: "业务员", left: 24, top: 16, width: 170, height: 980 },
  { key: "customer", name: "客户", left: 194, top: 16, width: 170, height: 980 },
  { key: "consultant", name: "咨询顾问", left: 364, top: 16, width: 190, height: 980 },
  { key: "tech", name: "技术人员", left: 554, top: 16, width: 170, height: 980 },
];

const laneMap = {};
for (const laneSpec of lanes) {
  const lane = createSwimlane(diagramId, activityId, laneSpec);
  laneMap[laneSpec.key] = lane;
  activity.groups.push(lane.laneModel);
  diagram.ownedViews.push(lane.laneView);
}

const nodeRefs = {};

function addAction(key, laneKey, spec) {
  const lane = laneMap[laneKey];
  const model = actionNode(spec.name, lane.laneModel._id);
  const view = createActionView(
    diagramId,
    lane.laneView._id,
    model._id,
    activityName,
    spec
  );
  lane.laneModel.nodes.push(model);
  lane.laneView.containedViews.push(ref(view._id));
  diagram.ownedViews.push(view);
  nodeRefs[key] = { modelId: model._id, viewId: view._id };
}

function addControl(key, laneKey, type, spec) {
  const lane = laneMap[laneKey];
  const model = controlNode(type, spec.name, lane.laneModel._id);
  const view = createControlNodeView(diagramId, lane.laneView._id, model._id, spec);
  lane.laneModel.nodes.push(model);
  lane.laneView.containedViews.push(ref(view._id));
  diagram.ownedViews.push(view);
  nodeRefs[key] = { modelId: model._id, viewId: view._id };
}

addControl("start", "sales", "UMLInitialNode", {
  name: "InitialNode1",
  left: 99,
  top: 56,
  width: 20,
  height: 20,
});

addAction("call", "sales", {
  name: "致电客户，确立约定",
  left: 48,
  top: 96,
  width: 122,
  height: 68,
});

addAction("confirm", "customer", {
  name: "确认约定",
  left: 218,
  top: 96,
  width: 122,
  height: 68,
});

addControl("placeDecision", "customer", "UMLDecisionNode", {
  name: "DecisionNode1",
  left: 264,
  top: 228,
  width: 31,
  height: 19,
});

addAction("prepareReport", "consultant", {
  name: "用电脑准备陈述报告",
  left: 387,
  top: 208,
  width: 145,
  height: 68,
});

addAction("prepareRoom", "tech", {
  name: "准备会议室",
  left: 576,
  top: 208,
  width: 126,
  height: 68,
});

addControl("placeMerge", "customer", "UMLMergeNode", {
  name: "MergeNode1",
  left: 264,
  top: 340,
  width: 31,
  height: 19,
});

addAction("meet", "customer", {
  name: "在约定时间和地点与业务员、咨询顾问会见",
  left: 210,
  top: 420,
  width: 138,
  height: 68,
});

addAction("paper", "sales", {
  name: "准备会议用纸",
  left: 48,
  top: 520,
  width: 122,
  height: 68,
});

addControl("issueDecision", "customer", "UMLDecisionNode", {
  name: "DecisionNode2",
  left: 264,
  top: 636,
  width: 31,
  height: 19,
});

addAction("proposal", "consultant", {
  name: "根据问题陈述编写提案",
  left: 387,
  top: 700,
  width: 145,
  height: 68,
});

addAction("sendProposal", "consultant", {
  name: "把提案发给客户",
  left: 387,
  top: 820,
  width: 145,
  height: 68,
});

addAction("receiveProposal", "customer", {
  name: "接收提案",
  left: 218,
  top: 820,
  width: 122,
  height: 68,
});

addControl("end", "customer", "UMLActivityFinalNode", {
  name: "ActivityFinalNode1",
  left: 267,
  top: 930,
  width: 26,
  height: 26,
});

const flows = [
  {
    source: "start",
    target: "call",
    points: "109:76;109:96",
    labelLeft: 116,
    labelTop: 82,
  },
  {
    source: "call",
    target: "confirm",
    points: "170:130;218:130",
    labelLeft: 184,
    labelTop: 116,
  },
  {
    source: "confirm",
    target: "placeDecision",
    points: "279:164;279:228",
    labelLeft: 286,
    labelTop: 190,
  },
  {
    source: "placeDecision",
    target: "prepareReport",
    guard: "约定在公司外",
    points: "295:238;459:238;459:208",
    labelLeft: 336,
    labelTop: 220,
    labelAlpha: -2.2,
    labelDistance: 22,
  },
  {
    source: "placeDecision",
    target: "prepareRoom",
    guard: "约定在公司内",
    points: "295:238;639:238;639:208",
    labelLeft: 488,
    labelTop: 220,
    labelAlpha: -2.2,
    labelDistance: 22,
  },
  {
    source: "prepareReport",
    target: "placeMerge",
    points: "459:276;459:310;279:310;279:340",
    labelLeft: 422,
    labelTop: 292,
  },
  {
    source: "prepareRoom",
    target: "placeMerge",
    points: "639:276;639:326;279:326;279:340",
    labelLeft: 506,
    labelTop: 308,
  },
  {
    source: "placeMerge",
    target: "meet",
    points: "279:359;279:420",
    labelLeft: 286,
    labelTop: 388,
  },
  {
    source: "meet",
    target: "paper",
    points: "210:454;109:454;109:520",
    labelLeft: 158,
    labelTop: 466,
  },
  {
    source: "paper",
    target: "issueDecision",
    points: "170:554;279:554;279:636",
    labelLeft: 214,
    labelTop: 566,
  },
  {
    source: "issueDecision",
    target: "proposal",
    guard: "产生问题陈述",
    points: "295:645;459:645;459:700",
    labelLeft: 336,
    labelTop: 628,
    labelAlpha: -2.1,
    labelDistance: 20,
  },
  {
    source: "issueDecision",
    target: "end",
    guard: "未产生问题陈述",
    points: "264:645;180:645;180:943;267:943",
    labelLeft: 114,
    labelTop: 720,
    labelAlpha: -1.57,
    labelDistance: 18,
  },
  {
    source: "proposal",
    target: "sendProposal",
    points: "459:768;459:820",
    labelLeft: 466,
    labelTop: 790,
  },
  {
    source: "sendProposal",
    target: "receiveProposal",
    points: "387:854;340:854",
    labelLeft: 352,
    labelTop: 840,
  },
  {
    source: "receiveProposal",
    target: "end",
    points: "279:888;279:930",
    labelLeft: 286,
    labelTop: 904,
  },
];

for (const flowSpec of flows) {
  const flow = createFlow(diagramId, activityId, {
    sourceModelId: nodeRefs[flowSpec.source].modelId,
    targetModelId: nodeRefs[flowSpec.target].modelId,
    tailViewId: nodeRefs[flowSpec.source].viewId,
    headViewId: nodeRefs[flowSpec.target].viewId,
    points: flowSpec.points,
    guard: flowSpec.guard,
    labelLeft: flowSpec.labelLeft,
    labelTop: flowSpec.labelTop,
    labelAlpha: flowSpec.labelAlpha,
    labelDistance: flowSpec.labelDistance,
  });
  activity.edges.push(flow.model);
  diagram.ownedViews.push(flow.view);
}

const ids = collectIds(project);
const refs = collectRefs(project);
const missingRefs = [...new Set(refs.filter((id) => !ids.has(id)))];

if (missingRefs.length > 0) {
  throw new Error(`Missing references: ${missingRefs.join(", ")}`);
}

const outPath = path.join(process.cwd(), "consulting-client-activity-diagram.mdj");
fs.writeFileSync(outPath, JSON.stringify(project, null, "\t"), "utf8");
console.log(outPath);
