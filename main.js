let floors = 5;
let lifts = 2;
const heightPerFloor = 96; // in pixels
const secondsPerFloor = 2; // in seconds

const askLiftValue = () => {
  lifts = Math.ceil(Math.abs(prompt("Total Lifts?")));
  if (isNaN(lifts) || !lifts) askLiftValue();
};

const askFloorValue = () => {
  floors = Math.ceil(Math.abs(prompt("Total Floors?")));
  if (isNaN(floors) || !floors) askFloorValue();
};

askFloorValue();
askLiftValue();

let requestedFloors = [];
let liftsState = Array(lifts)
  .fill(1)
  .map((v, i) => ({
    id: i,
    isBusy: false,
    preFloor: 1,
    currentFloor: 1,
    isDisabled: false,
  }));

// update UI for pending requests
const updateUI = () => {
  document.getElementById("requestHeader").innerText = requestedFloors.length
    ? "Pending Requests - "
    : "";
  document.getElementById("requestList").innerText =
    requestedFloors.join(" | ");
};

const createElement = (name) => document.createElement(name);

const handleLiftAnimation = (data) => {
  const { id, currentFloor, preFloor, movingTo, destinationPerFloor } = data;

  // new and old parent of lift
  const newParent = document.getElementById(`td-${currentFloor}-${id}`);
  const oldParent = document.getElementById(`td-${preFloor}-${id}`);

  const liftElement = oldParent.firstChild;
  oldParent.removeChild(oldParent.firstChild);
  newParent.append(liftElement);

  const liftHeadingTo = document.getElementById(`liftHeadingTo-${id}`);
  liftHeadingTo.innerText = movingTo;
  liftHeadingTo.setAttribute("__liveFloor", currentFloor);

  liftElement.style.setProperty("--pixels", destinationPerFloor);
  liftElement.style.animation = `liftAnimation ${secondsPerFloor}s`;
};

const handleLiftRequest = (data) => {
  const { id, currentFloor, preFloor } = { ...data };
  let floorDistance = Math.abs(currentFloor - preFloor);
  const direction = Math.sign(currentFloor - preFloor);
  const destinationPerFloor = heightPerFloor * direction + "px";

  // console.log({ floorDistance, direction, destinationPerFloor });

  if (!floorDistance) {
    handleDoorAnimation(data);
    return;
  }

  let eachFloorData = {
    ...data,
    currentFloor: preFloor + direction,
    movingTo: currentFloor,
    destinationPerFloor,
  };
  handleLiftAnimation(eachFloorData);

  const callBack = (e) => {
    e.stopImmediatePropagation();
    const { isDisabled } = liftsState[id];

    if (!--floorDistance || isDisabled) {
      e?.target?.removeEventListener?.("animationend", callBack);
      handleDoorAnimation(data, isDisabled);
      return;
    }

    const { currentFloor } = { ...eachFloorData };
    eachFloorData.currentFloor = currentFloor + direction;
    eachFloorData.preFloor = currentFloor;
    handleLiftAnimation(eachFloorData);
  };

  const liftElement = document.getElementById("lift-" + id);
  liftElement.addEventListener("animationend", callBack);
};

const handleDoorAnimation = (data, isDisabled) => {
  const { id } = data;

  // to clear busy state and inform checkRequests function
  const callBack = (e) => {
    e?.stopImmediatePropagation();
    e?.target?.removeEventListener?.("animationend", callBack);

    liftsState[id] = { ...data, isBusy: false };
    document.getElementById(`liftHeadingTo-${id}`).innerText = "";
    door.classList.remove("openCloseDoor");

    if (data?.isDisabled && !door.classList.contains("openDoor")) {
      door.classList.add("openDoor");
    }
    checkRequests();
  };

  const door = document.getElementById("door-" + id);
  door.classList.add(isDisabled ? "openDoor" : "openCloseDoor");
  door.addEventListener("animationend", callBack);
};

// to handle requests from floor
const handleFloorRequest = (floorNum) => {
  const liftOnSameFloor = liftsState.find(
    (v) => v.currentFloor === floorNum && !v.isDisabled
  );

  if (liftOnSameFloor?.isBusy) return;

  if (liftOnSameFloor) {
    const { id, currentFloor } = liftOnSameFloor;
    liftOnSameFloor.isBusy = true;
    liftOnSameFloor.preFloor = currentFloor;

    liftsState[id] = liftOnSameFloor;
    handleLiftRequest(liftOnSameFloor);
    return;
  }

  if (requestedFloors.includes(floorNum)) return;

  requestedFloors.push(floorNum);
  checkRequests();
};

// to handle pending requests
const checkRequests = () => {
  updateUI();

  if (!requestedFloors.length) return;
  let idleLift = liftsState.find((v) => !v.isBusy && !v.isDisabled);
  if (!idleLift) return;

  const { currentFloor, id } = { ...idleLift };
  const newFloorToGo = requestedFloors.shift();
  liftsState[id] = {
    ...idleLift,
    isBusy: true,
    preFloor: currentFloor,
    currentFloor: newFloorToGo,
  };

  handleLiftRequest(liftsState[id]);
  updateUI();
};

// table creation
const createTable = () => {
  const table = createElement("table");
  const tbody = createElement("tbody");

  const floorsArray = Array(floors)
    .fill(0)
    .map((ele, index) => index + 1)
    .reverse();

  floorsArray.forEach((floorNum, index, arr) => {
    const tr = createElement("tr");
    const actionTH = createElement("th");
    const actionDiv = createElement("div");

    actionTH.setAttribute("class", "borderBottom");
    actionDiv.setAttribute("class", "actionDiv");

    if (floorNum < arr.length) {
      const upAction = createElement("div");

      Object.assign(upAction, {
        className: "upAction actionBtn",
        onclick: function () {
          handleFloorRequest(floorNum);
        },
        innerText: "Up",
      });

      actionDiv.append(upAction);
    }

    if (floorNum !== 1) {
      const downAction = createElement("div");

      Object.assign(downAction, {
        className: "downAction actionBtn",
        onclick: function () {
          handleFloorRequest(floorNum);
        },
        innerText: "Down",
      });

      actionDiv.append(downAction);
    }

    actionTH.append(actionDiv);
    tr.append(actionTH);

    liftsState.forEach((val, inx) => {
      const td = createElement("td");
      td.setAttribute("id", `td-${floorNum}-${val.id}`);

      if (val?.currentFloor === floorNum) {
        const lift = createElement("div");
        const door = createElement("div");
        const headingToText = createElement("div");

        lift.setAttribute("class", "liftClass");
        lift.setAttribute("id", `lift-${val.id}`);

        door.setAttribute("class", "doorClass");
        door.setAttribute("id", `door-${val.id}`);

        headingToText.setAttribute("id", `liftHeadingTo-${val.id}`);
        headingToText.setAttribute("class", "liftHeadingTo");

        lift.append(door);
        lift.append(headingToText);
        td.append(lift);
      }

      tr.append(td);
    });

    const floorTH = createElement("th");
    const floorCountDiv = createElement("div");

    floorCountDiv.setAttribute("class", "floorCount");
    floorCountDiv.innerText = `Floor ${floorNum}`;
    floorTH.append(floorCountDiv);

    tr.append(floorTH);
    tbody.append(tr);
  });

  table.append(tbody);
  document.getElementById("root").append(table);
};

createTable();

const myFunction = () => {
  const input = document.getElementById("liftInput");
  const liftNum = input?.value || 0;

  if (liftNum > lifts || liftNum < 1 || isNaN(liftNum)) {
    input.value = "";
    return;
  }

  const liftData = liftsState.find((v) => v.id == liftNum - 1);
  const { id } = liftData;

  const liftElement = document.getElementById("lift-" + id);
  liftElement.classList.add("borderRed");

  liftData.isDisabled = true;
  liftsState[id] = { ...liftData };

  if (liftData.isBusy) {
    const liftHeadingTo = document.getElementById(`liftHeadingTo-${id}`);
    const liveFloor = liftHeadingTo.getAttribute("__liveFloor");
    liftHeadingTo.innerText = liveFloor;

    requestedFloors.push(liftData.currentFloor);
    checkRequests();
  } else {
    handleDoorAnimation(liftData, true);
  }
};
