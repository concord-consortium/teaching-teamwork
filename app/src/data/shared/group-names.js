var sortByName = function (a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
};

var researcherGroups = [
  {
    name: "Research Group",
    members: [
      "Researcher A", "Researcher B", "Researcher C"
    ]
  }
];

var studyGroups = [
  {
    name: "Animals",
    members: [
      "Lion", "Tiger", "Bear"
    ]
  },
  {
    name: "Birds",
    members: [
      "Eagle", "Seagull", "Hawk"
    ]
  },
  {
    name: "Vehicles",
    members: [
      "Truck", "Car", "Van"
    ]
  },
  {
    name: "Tools",
    members: [
      "Hammer", "Pliers", "Wrench"
    ]
  },
  {
    name: "Office",
    members: [
      "Pencil", "Paper", "Pen"
    ]
  },
  {
    name: "Geography",
    members: [
      "Mountain", "Plain", "Valley"
    ]
  },
  {
    name: "Water",
    members: [
      "Ocean", "River", "Lake"
    ]
  },
  {
    name: "Weather",
    members: [
      "Rain", "Snow", "Sleet"
    ]
  },
  {
    name: "Dogs",
    members: [
      "Poodle", "Collie", "Spaniel"
    ]
  },
  {
    name: "Pets",
    members: [
      "Dog", "Cat", "Hamster"
    ]
  },
  {
    name: "Kitchen",
    members: [
      "Pot", "Pan", "Skillet"
    ]
  },
  {
    name: "Sides",
    members: [
      "Soup", "Salad", "Roll"
    ]
  },
  {
    name: "Dessert",
    members: [
      "Cake", "Icecream", "Pie"
    ]
  },
  {
    name: "Fruit",
    members: [
      "Peach", "Plum", "Grape"
    ]
  },
  {
    name: "Vegetables",
    members: [
      "Lettuce", "Celery", "Tomato"
    ]
  },
  {
    name: "Potatoes",
    members: [
      "Mashed", "Baked", "Fries"
    ]
  },
  {
    name: "Colors",
    members: [
      "Blue", "Red", "Green"
    ]
  },
  {
    name: "Instruments",
    members: [
      "Guitar", "Horn", "Piano"
    ]
  },
  {
    name: "Shapes",
    members: [
      "Circle", "Square", "Triangle"
    ]
  },
  {
    name: "Directions",
    members: [
      "North", "East", "West"
    ]
  },
  {
    name: "Towns",
    members: [
      "Acton", "Maynard", "Concord"
    ]
  },
  {
    name: "States",
    members: [
      "Utah", "Ohio", "Iowa"
    ]
  }
].sort(sortByName);

module.exports = function () {
  var forceInUrl = window.location.search.indexOf('researcherMode') !== -1,
      forceInLocalStorage = window.localStorage && window.localStorage.getItem("forceResearcherMode") === "true";
  return forceInUrl || forceInLocalStorage ? researcherGroups : studyGroups;
};
