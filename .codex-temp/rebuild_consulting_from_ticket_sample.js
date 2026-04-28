const fs = require("fs");
const path = require("path");

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectIds(value, ids = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectIds(item, ids));
    return ids;
  }
  if (value && typeof value === "object") {
    if (value._id) {
      ids.add(value._id);
    }
    Object.values(value).forEach((item) => collectIds(item, ids));
  }
  return ids;
}

function remapIds(value, mapping) {
  if (Array.isArray(value)) {
    value.forEach((item) => remapIds(item, mapping));
    return;
  }
  if (value && typeof value === "object") {
    if (value._id && mapping[value._id]) {
      value._id = mapping[value._id];
    }
    if (Object.keys(value).length === 1 && value.$ref && mapping[value.$ref]) {
      value.$ref = mapping[value.$ref];
      return;
    }
    Object.values(value).forEach((item) => remapIds(item, mapping));
  }
}

function ref(id) {
  return { $ref: id };
}

function removeRef(array, id) {
  const index = array.findIndex((item) => item.$ref === id);
  if (index >= 0) {
    array.splice(index, 1);
  }
}

function addRef(array, id) {
  if (!array.some((item) => item.$ref === id)) {
    array.push(ref(id));
  }
}

function setSwimlane(view, name, left, width) {
  view.left = left;
  view.width = width;
  const label = view.subViews[0];
  label.left = left;
  label.width = width;
  label.text = name;
}

function setNamedRect(view, text, left, top, width, height) {
  view.left = left;
  view.top = top;
  view.width = width;
  view.height = height;

  const compartment = view.subViews[0];
  compartment.left = left;
  compartment.top = top;
  compartment.width = width;
  compartment.height = Math.max(height - 16, 25);

  const labels = compartment.subViews;
  const nameLabel = labels[1];
  nameLabel.left = left + 5;
  nameLabel.top = top + 7;
  nameLabel.width = width - 10;
  nameLabel.height = Math.max(height - 16, 26);
  nameLabel.text = text;
  nameLabel.wordWrap = true;
  if (nameLabel.horizontalAlignment === undefined) {
    nameLabel.horizontalAlignment = 1;
  }
  if (nameLabel.verticalAlignment === undefined) {
    nameLabel.verticalAlignment = 2;
  }
}

function setControlNode(view, left, top, width, height) {
  view.left = left;
  view.top = top;
  view.width = width;
  view.height = height;
}

function setGuard(edgeModel, edgeView, guard, points, label) {
  edgeModel.guard = guard;
  edgeView.points = points;
  const nameLabel = edgeView.subViews[0];
  nameLabel.text = ` [${guard}]`;
  nameLabel.left = label.left;
  nameLabel.top = label.top;
  nameLabel.width = label.width;
  nameLabel.height = label.height || 26;
  nameLabel.alpha = label.alpha;
  nameLabel.distance = label.distance;
  nameLabel.wordWrap = true;
}

function setFlowPoints(edgeView, points, labelLeft, labelTop) {
  edgeView.points = points;
  edgeView.subViews[0].left = labelLeft;
  edgeView.subViews[0].top = labelTop;
  edgeView.subViews[1].left = labelLeft + 15;
  edgeView.subViews[1].top = labelTop;
  edgeView.subViews[2].left = labelLeft - 20;
  edgeView.subViews[2].top = labelTop + 1;
}

const samplePath = path.join(
  process.cwd(),
  ".codex-temp",
  "staruml-samples",
  "UMLExample.mdj"
);
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const root = {
  _type: "Project",
  _id: sample._id,
  name: "咨询公司会见客户活动图",
  ownedElements: [],
};

const sourceModel = sample.ownedElements.find((item) => item.name === "Ticket Vending Machine");
const model = deepClone(sourceModel);
root.ownedElements.push(model);
model._parent = ref(root._id);
model.name = "咨询公司会见客户";

const activity = model.ownedElements.find((item) => item._type === "UMLActivity");
activity.name = "咨询公司会见客户";

const diagram = activity.ownedElements.find((item) => item._type === "UMLActivityDiagram");
diagram.name = "咨询公司会见客户活动图";

const usedIds = collectIds(model);
const spareIds = [];
for (const owned of sample.ownedElements) {
  if (owned.name === "Ticket Vending Machine") {
    continue;
  }
  for (const id of collectIds(owned)) {
    if (!usedIds.has(id)) {
      spareIds.push(id);
    }
  }
}

function newId() {
  if (spareIds.length === 0) {
    throw new Error("No spare sample ids available");
  }
  return spareIds.shift();
}

const groups = new Map(activity.groups.map((group) => [group.name, group]));
const groupViews = new Map();
for (const view of diagram.ownedViews.filter((item) => item._type === "UMLSwimlaneView")) {
  groupViews.set(view.model.$ref, view);
}

const salesGroup = groups.get("Commuter");
const customerGroup = groups.get("Ticket vending machine");
const consultantGroup = groups.get("Bank");

salesGroup.name = "业务员";
customerGroup.name = "客户";
consultantGroup.name = "咨询顾问";

const salesLaneView = groupViews.get(salesGroup._id);
const customerLaneView = groupViews.get(customerGroup._id);
const consultantLaneView = groupViews.get(consultantGroup._id);

setSwimlane(salesLaneView, "业务员", 24, 160);
setSwimlane(customerLaneView, "客户", 184, 220);
setSwimlane(consultantLaneView, "咨询顾问", 404, 180);

const modelById = new Map();
const viewByModelId = new Map();

function walk(value) {
  if (Array.isArray(value)) {
    value.forEach(walk);
    return;
  }
  if (value && typeof value === "object") {
    if (value._id) {
      modelById.set(value._id, value);
    }
    Object.values(value).forEach(walk);
  }
}
walk(activity);

for (const view of diagram.ownedViews) {
  if (view.model && view.model.$ref) {
    viewByModelId.set(view.model.$ref, view);
  }
}

function findNode(group, name) {
  return group.nodes.find((node) => node.name === name);
}

function renameNode(node, text) {
  node.name = text;
  const view = viewByModelId.get(node._id);
  if (view && view.subViews && view.subViews[0] && view.subViews[0].subViews) {
    view.subViews[0].subViews[1].text = text;
  }
}

const startSession = findNode(salesGroup, "Start Session");
const provideTripInfo = findNode(salesGroup, "Provide Trip Info");
const providePaymentInfo = findNode(salesGroup, "Provide Payment Info");
const getTicket = findNode(salesGroup, "Get Ticket");
const getChange = findNode(salesGroup, "Get Change");
const initialNode = salesGroup.nodes.find((node) => node._type === "UMLInitialNode");
const finalNode = salesGroup.nodes.find((node) => node._type === "UMLActivityFinalNode");

const requestTripInfo = findNode(customerGroup, "Request Trip Info");
const processTripInfo = findNode(customerGroup, "Process Trip Info");
const requestPayment = findNode(customerGroup, "Request Payment");
const processPayment = findNode(customerGroup, "Process Payment");
const dispenseTicket = findNode(customerGroup, "Dispense Ticket");
const dispenseChange = findNode(customerGroup, "Dispense Change");
const changeNode = findNode(customerGroup, "Change");
const decisionNodes = customerGroup.nodes.filter((node) => node._type === "UMLDecisionNode");
const mergeNodes = customerGroup.nodes.filter((node) => node._type === "UMLMergeNode");

const consultantAction = findNode(consultantGroup, "Authorize Card Payment");
const ticketObject = activity.nodes.find((node) => node.name === "Ticket");

renameNode(startSession, "致电客户，确立约定");
renameNode(requestTripInfo, "客户确认约定");
renameNode(provideTripInfo, "记录客户需求");
renameNode(processTripInfo, "确定约定时间");
renameNode(requestPayment, "确定约定地点");
renameNode(providePaymentInfo, "通知咨询顾问和技术人员");
renameNode(processPayment, "判断会面地点");
renameNode(consultantAction, "用电脑准备陈述报告");
renameNode(dispenseTicket, "在约定时间和地点会见");
renameNode(getTicket, "准备会议用纸");
renameNode(dispenseChange, "根据问题陈述编写提案");
renameNode(getChange, "把提案发给客户");
ticketObject.name = "会议资料";
viewByModelId.get(ticketObject._id).subViews[0].subViews[1].text = "会议资料";
changeNode.name = "提案";
viewByModelId.get(changeNode._id).subViews[0].subViews[1].text = "提案";

const showThankYou = findNode(customerGroup, "Show Thank You");
renameNode(showThankYou, "结束流程");

setControlNode(viewByModelId.get(initialNode._id), 88, 56, 20, 20);
setNamedRect(viewByModelId.get(startSession._id), startSession.name, 48, 104, 112, 67);
setNamedRect(viewByModelId.get(provideTripInfo._id), provideTripInfo.name, 48, 248, 112, 67);
setNamedRect(viewByModelId.get(providePaymentInfo._id), providePaymentInfo.name, 40, 408, 128, 67);
setNamedRect(viewByModelId.get(getTicket._id), getTicket.name, 48, 696, 112, 54);

setNamedRect(viewByModelId.get(requestTripInfo._id), requestTripInfo.name, 224, 104, 112, 67);
setNamedRect(viewByModelId.get(processTripInfo._id), processTripInfo.name, 224, 248, 112, 67);
setNamedRect(viewByModelId.get(requestPayment._id), requestPayment.name, 224, 344, 112, 67);
setNamedRect(viewByModelId.get(processPayment._id), processPayment.name, 224, 424, 112, 54);
setControlNode(viewByModelId.get(decisionNodes[0]._id), 272, 504, 31, 19);
setControlNode(viewByModelId.get(mergeNodes[0]._id), 272, 592, 31, 19);
setNamedRect(viewByModelId.get(dispenseTicket._id), dispenseTicket.name, 216, 640, 128, 67);
setControlNode(viewByModelId.get(decisionNodes[1]._id), 272, 744, 31, 19);
setControlNode(viewByModelId.get(mergeNodes[1]._id), 272, 912, 31, 19);
setNamedRect(viewByModelId.get(showThankYou._id), showThankYou.name, 216, 960, 128, 54);

setNamedRect(viewByModelId.get(consultantAction._id), consultantAction.name, 432, 520, 120, 67);
setNamedRect(viewByModelId.get(dispenseChange._id), dispenseChange.name, 432, 792, 128, 67);
setNamedRect(viewByModelId.get(getChange._id), getChange.name, 432, 904, 128, 54);
setNamedRect(viewByModelId.get(ticketObject._id), "会议资料", 136, 728, 88, 33);
setNamedRect(viewByModelId.get(changeNode._id), "提案", 456, 864, 80, 32);

removeRef(salesLaneView.containedViews, getChange._id ? viewByModelId.get(getChange._id)._id : "");
removeRef(salesLaneView.containedViews, viewByModelId.get(finalNode._id)._id);
removeRef(customerLaneView.containedViews, viewByModelId.get(dispenseChange._id)._id);
removeRef(customerLaneView.containedViews, viewByModelId.get(changeNode._id)._id);

salesGroup.nodes = salesGroup.nodes.filter((node) => node._id !== getChange._id && node._id !== finalNode._id);
customerGroup.nodes = customerGroup.nodes.filter((node) => node._id !== dispenseChange._id && node._id !== changeNode._id);

dispenseChange._parent = ref(consultantGroup._id);
changeNode._parent = ref(consultantGroup._id);
getChange._parent = ref(consultantGroup._id);
finalNode._parent = ref(customerGroup._id);

consultantGroup.nodes.push(dispenseChange, changeNode, getChange);
customerGroup.nodes.push(finalNode);

const dispenseChangeView = viewByModelId.get(dispenseChange._id);
const changeView = viewByModelId.get(changeNode._id);
const getChangeView = viewByModelId.get(getChange._id);
const finalView = viewByModelId.get(finalNode._id);

dispenseChangeView.containerView = ref(consultantLaneView._id);
changeView.containerView = ref(consultantLaneView._id);
getChangeView.containerView = ref(consultantLaneView._id);
finalView.containerView = ref(customerLaneView._id);

addRef(consultantLaneView.containedViews, dispenseChangeView._id);
addRef(consultantLaneView.containedViews, changeView._id);
addRef(consultantLaneView.containedViews, getChangeView._id);
addRef(customerLaneView.containedViews, finalView._id);

setControlNode(finalView, 272, 1038, 26, 26);

const bankLaneBundle = [
  consultantGroup,
  consultantLaneView,
  consultantAction,
  viewByModelId.get(consultantAction._id),
];
const bankToMergeModel = activity.edges.find(
  (edge) => edge._type === "UMLControlFlow" && edge.source.$ref === consultantAction._id
);
const bankToMergeView = viewByModelId.get(bankToMergeModel._id);
bankLaneBundle.push(bankToMergeModel, bankToMergeView);

const mapping = {};
for (const id of collectIds(bankLaneBundle)) {
  mapping[id] = newId();
}

const techGroup = deepClone(consultantGroup);
const techLaneView = deepClone(consultantLaneView);
const techAction = deepClone(consultantAction);
const techActionView = deepClone(viewByModelId.get(consultantAction._id));
const techToMergeModel = deepClone(bankToMergeModel);
const techToMergeView = deepClone(bankToMergeView);

[techGroup, techLaneView, techAction, techActionView, techToMergeModel, techToMergeView].forEach((item) =>
  remapIds(item, mapping)
);

techGroup.name = "技术人员";
techGroup._parent = ref(activity._id);
techGroup.nodes = [techAction];

techLaneView._parent = ref(diagram._id);
techLaneView.model = ref(techGroup._id);
techLaneView.left = 584;
techLaneView.width = 160;
techLaneView.subViews[0].left = 584;
techLaneView.subViews[0].width = 160;
techLaneView.subViews[0].text = "技术人员";
techLaneView.containedViews = [ref(techActionView._id)];
techLaneView.nameLabel = ref(techLaneView.subViews[0]._id);

techAction._parent = ref(techGroup._id);
techAction.name = "准备会议室";

techActionView._parent = ref(diagram._id);
techActionView.model = ref(techAction._id);
techActionView.containerView = ref(techLaneView._id);
setNamedRect(techActionView, "准备会议室", 608, 520, 104, 67);

techToMergeModel._parent = ref(activity._id);
techToMergeModel.source = ref(techAction._id);
techToMergeModel.target = ref(mergeNodes[0]._id);
delete techToMergeModel.guard;

techToMergeView._parent = ref(diagram._id);
techToMergeView.model = ref(techToMergeModel._id);
techToMergeView.head = ref(viewByModelId.get(mergeNodes[0]._id)._id);
techToMergeView.tail = ref(techActionView._id);
techToMergeView.subViews[0].visible = false;
delete techToMergeView.subViews[0].text;
setFlowPoints(techToMergeView, "660:587;660:610;288:610", 520, 598);

activity.groups.push(techGroup);
activity.edges.push(techToMergeModel);

const swimlaneCount = diagram.ownedViews.filter((item) => item._type === "UMLSwimlaneView").length;
diagram.ownedViews.splice(swimlaneCount, 0, techLaneView);
diagram.ownedViews.push(techActionView, techToMergeView);

const flowBySignature = new Map();
for (const edge of activity.edges) {
  if (edge._type !== "UMLControlFlow") continue;
  flowBySignature.set(`${edge.source.$ref}->${edge.target.$ref}`, edge);
}

function findFlow(sourceName, targetName) {
  const candidates = activity.edges.filter((edge) => edge._type === "UMLControlFlow");
  return candidates.find((edge) => {
    const source = modelById.get(edge.source.$ref);
    const target = modelById.get(edge.target.$ref);
    return source && target && source.name === sourceName && target.name === targetName;
  });
}

const flowDecisionToConsultant = findFlow("DecisionNode1", "用电脑准备陈述报告");
const flowDecisionToMerge1 = activity.edges.find(
  (edge) =>
    edge._type === "UMLControlFlow" &&
    edge.source.$ref === decisionNodes[0]._id &&
    edge.target.$ref === mergeNodes[0]._id
);
const flowDecision2ToMerge2 = activity.edges.find(
  (edge) =>
    edge._type === "UMLControlFlow" &&
    edge.source.$ref === decisionNodes[1]._id &&
    edge.target.$ref === mergeNodes[1]._id
);
const flowDecision2ToProposal = activity.edges.find(
  (edge) => edge._type === "UMLControlFlow" && edge.target.$ref === dispenseChange._id
);
const flowGetChangeToMerge2 = activity.edges.find(
  (edge) => edge._type === "UMLControlFlow" && edge.source.$ref === getChange._id
);
const flowMerge2ToEnd = activity.edges.find(
  (edge) => edge._type === "UMLControlFlow" && edge.source.$ref === mergeNodes[1]._id
);
const flowEndToFinal = activity.edges.find(
  (edge) => edge._type === "UMLControlFlow" && edge.target.$ref === finalNode._id
);

const flowDecisionToConsultantView = viewByModelId.get(flowDecisionToConsultant._id);
const flowDecisionToMerge1View = viewByModelId.get(flowDecisionToMerge1._id);
const flowDecision2ToMerge2View = viewByModelId.get(flowDecision2ToMerge2._id);
const flowDecision2ToProposalView = viewByModelId.get(flowDecision2ToProposal._id);
const flowGetChangeToMerge2View = viewByModelId.get(flowGetChangeToMerge2._id);
const flowMerge2ToEndView = viewByModelId.get(flowMerge2ToEnd._id);
const flowEndToFinalView = viewByModelId.get(flowEndToFinal._id);

setGuard(flowDecisionToConsultant, flowDecisionToConsultantView, "约定在公司外", "302:512;492:512;492:520", {
  left: 346,
  top: 494,
  width: 92,
  alpha: -2.2,
  distance: 24,
});

flowDecisionToMerge1.target = ref(techAction._id);
flowDecisionToMerge1.guard = "约定在公司内";
flowDecisionToMerge1View.head = ref(techActionView._id);
setGuard(flowDecisionToMerge1, flowDecisionToMerge1View, "约定在公司内", "302:512;660:512;660:520", {
  left: 514,
  top: 494,
  width: 92,
  alpha: -2.2,
  distance: 24,
});

setGuard(flowDecision2ToMerge2, flowDecision2ToMerge2View, "未产生问题陈述", "272:753;184:753;184:921;272:921", {
  left: 110,
  top: 820,
  width: 92,
  alpha: -1.57,
  distance: 18,
});

setGuard(flowDecision2ToProposal, flowDecision2ToProposalView, "产生问题陈述", "288:763;288:825;432:825", {
  left: 326,
  top: 760,
  width: 92,
  alpha: -1.9,
  distance: 20,
});

setFlowPoints(flowGetChangeToMerge2View, "432:931;288:931;288:921", 344, 918);
setFlowPoints(flowMerge2ToEndView, "288:931;288:960", 295, 944);
setFlowPoints(flowEndToFinalView, "280:1014;280:1038", 288, 1022);

const objectFlow1 = activity.edges.find(
  (edge) => edge._type === "UMLObjectFlow" && edge.source.$ref === dispenseChange._id
);
const objectFlow2 = activity.edges.find(
  (edge) => edge._type === "UMLObjectFlow" && edge.target.$ref === getChange._id
);
const objectFlow1View = viewByModelId.get(objectFlow1._id);
const objectFlow2View = viewByModelId.get(objectFlow2._id);

setFlowPoints(objectFlow1View, "496:859;496:864", 504, 850);
setFlowPoints(objectFlow2View, "496:896;496:904", 504, 888);

const outPath = path.join(process.cwd(), "consulting-client-activity-diagram-fixed.mdj");
fs.writeFileSync(outPath, JSON.stringify(root, null, "\t"), "utf8");
console.log(outPath);
