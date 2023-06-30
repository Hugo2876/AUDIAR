//// DÉFINITION DES FONCTIONS

// Chemins vers les fichiers .json
const conso_ok = "data/consov2.json";
const centro_com = "https://raw.githubusercontent.com/Hugo2876/AUDIAR/main/centro_com.geojson";
const centro_iris = "https://raw.githubusercontent.com/Hugo2876/AUDIAR/main/centro_iris.geojson";
const obs_com = "https://raw.githubusercontent.com/Hugo2876/AUDIAR/main/obs_com.geojson";
const obs_iris = "https://raw.githubusercontent.com/Hugo2876/AUDIAR/main/obs_iris.geojson";

// Fonction de mise en cache des réponses
async function cacheResponse(url) {
  const cache = await caches.open('my-cache');
  const response = await fetch(url);
  const data = await response.json();
  cache.put(url, new Response(JSON.stringify(data)));
  return data;
}

// Fonction de récupération des réponses du cache
async function getCachedResponse(url) {
  const cache = await caches.open('my-cache');
  const cachedResponse = await cache.match(url);
  if (cachedResponse) {
    return cachedResponse.json();
  }
  return cacheResponse(url);
}

// Fonction de calcul des quantiles
function calculateQuantiles(data, numClasses) {
  const quantiles = [];
  for (let i = 1; i <= numClasses; i++) {
    const quantile = ss.quantile(data, i / numClasses);
    quantiles.push(quantile);
  }
  return quantiles;
}

// Fonction de définition des stops de rayon de conso totale en fonction des quantiles
function getRadiusStops(quantiles) {
  const stops = [];
  for (let i = 0; i < quantiles.length; i++) {
    const radiusStop = [quantiles[i], Math.pow(2, i)];
    stops.push(radiusStop);
  }
  return stops;
}

// Fonction de définition des couleurs de fond de conso par abonné en fonction des quantiles
function getColorForValue(value, quantiles) {
  let color;
  if (value <= quantiles[0]) {
    color = "#cfe0c3";
  } else if (value <= quantiles[1]) {
    color = "#9ec1a3";
  } else if (value <= quantiles[2]) {
    color = "#70a9a1";
  } else if (value <= quantiles[3]) {
    color = "#40798c";
  } else {
    color = "#1f363d";
  }
  return color;
}

// Fonction pour mettre à jour la légende de conso totale
function updateLegendTotal(radiusStops) {
  const legendContainer = document.getElementById("legendTot");
  legendContainer.innerHTML = "";

  const legendTitle = document.createElement("div");
  legendTitle.classList.add("legend-title");
  legendContainer.appendChild(legendTitle);

  for (let i = 0; i < radiusStops.length; i++) {
    const stop = radiusStops[i];
    const minValue = stop[0];
    const radius = stop[1];

    const legendItem = document.createElement("div");
    legendItem.classList.add("legend-item");

    const symbol = document.createElement("span");
    symbol.style.backgroundColor = "#ffffff";
    symbol.style.width = `${radius * 2}px`;
    symbol.style.height = `${radius * 2}px`;
    symbol.style.borderRadius = "100%";
    symbol.style.border = "1px solid black";

    const label = document.createElement("span");
    label.textContent = `> ${minValue.toLocaleString()}`;;
    label.style.marginLeft = "5px";

    legendItem.appendChild(symbol);
    legendItem.appendChild(label);
    legendContainer.appendChild(legendItem);
  }
}

// Fonction pour mettre à jour la légende de conso moyenne par abonné
function updateLegendAbonne(quantiles) {
  const legendContainer = document.getElementById("legendAbo");
  legendContainer.innerHTML = "";

  const colors = ["#c0c0c0", "#cfe0c3", "#9ec1a3", "#70a9a1", "#40798c", "#f1f363d"];
  const labels = [
    "No data",
    `<= ${quantiles[0].toFixed(2)}`,
    `${quantiles[0].toFixed(2)} - ${quantiles[1].toFixed(2)}`,
    `${quantiles[1].toFixed(2)} - ${quantiles[2].toFixed(2)}`,
    `${quantiles[2].toFixed(2)} - ${quantiles[3].toFixed(2)}`,
    `> ${quantiles[3].toFixed(2)}`,
  ];

  for (let i = 0; i < labels.length; i++) {
    const legendItem = document.createElement("div");
    legendItem.classList.add("legend-item");

    const symbol = document.createElement("span");
    symbol.style.backgroundColor = colors[i];
    symbol.classList.add("legend-fill");

    const label = document.createElement("span");
    label.textContent = labels[i];
    label.classList.add("legend-label");

    legendItem.appendChild(symbol);
    legendItem.appendChild(label);
    legendContainer.appendChild(legendItem);
  }
}

// Fonction pour calculer le somme de conso des IRIS
var calculateIrisSums = function (data) {
  return data.reduce(function (acc, curr) {
    if (typeof acc[curr.CODE_IRIS] == "undefined") {
      acc[curr.CODE_IRIS] = 0;
    }
    acc[curr.CODE_IRIS] += curr.CONSO;
    return acc;
  }, {});
}

// Fonction pour calculer le somme de conso des communes
var calculateCommuneSums = function (data) {
  return data.reduce(function (acc, curr) {
    if (typeof acc[curr.CODE_COM] == "undefined") {
      acc[curr.CODE_COM] = 0;
    }
    acc[curr.CODE_COM] += curr.CONSO;
    return acc;
  }, {});
}

// Fonction pour calculer la conso moyenne par abonné pour les IRIS
var calculateIrisConsoParAbonne = function (data) {
  var IrisParAbonne = {};
  IrisParAbonne = data.reduce(function (acc, curr) {
      if (typeof acc[curr.CODE_IRIS] == "undefined") {
          acc[curr.CODE_IRIS] = { consoPerPDL: [], PDL: curr.PDL };
      }
      if (curr.PDL > 0) {
          acc[curr.CODE_IRIS].consoPerPDL.push(curr.CONSO / curr.PDL);
      }
      return acc;
  }, {});

  for (var com in IrisParAbonne) {
      if (IrisParAbonne[com].consoPerPDL.length > 0) {
          var sum = IrisParAbonne[com].consoPerPDL.reduce((a, b) => a + b, 0);
          IrisParAbonne[com] = sum / IrisParAbonne[com].consoPerPDL.length; // Calculate average
      } else {
          IrisParAbonne[com] = 0;
      }
  }
  return IrisParAbonne;
};

// Fonction pour calculer la conso moyenne par abonné pour les communes
var calculateCommuneConsoParAbonne = function (data) {
  var CommuneParAbonne = {};
  CommuneParAbonne = data.reduce(function (acc, curr) {
      if (typeof acc[curr.CODE_COM] == "undefined") {
          acc[curr.CODE_COM] = { consoPerPDL: [], PDL: curr.PDL };
      }
      if (curr.PDL > 0) { // Avoid division by zero
          acc[curr.CODE_COM].consoPerPDL.push(curr.CONSO / curr.PDL);
      }
      return acc;
  }, {});

  for (var com in CommuneParAbonne) {
      if (CommuneParAbonne[com].consoPerPDL.length > 0) {
          var sum = CommuneParAbonne[com].consoPerPDL.reduce((a, b) => a + b, 0);
          CommuneParAbonne[com] = sum / CommuneParAbonne[com].consoPerPDL.length; // Calculate average
      } else {
          CommuneParAbonne[com] = 0;
      }
  }
  return CommuneParAbonne;
};

// Fonction pour obtenir le nom du territoire sélectionné
function getTerritoryName(feature, isIris) {
  if (!feature) return 'Rennes Métropole';
  if (isIris) {
    return feature.properties.NOM_IRIS + ' (' + feature.properties.CODE_IRIS + ')';
  } else {
    return feature.properties.libgeo + ' (' + feature.properties.codgeo + ')';
  }
}

// Fonction pour mélanger un tableau de valeurs
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

//// CODE DE L'OBSEVRATOIRE

// Paramétrage de l'espace occupé par la carte et le slider
const sliderButton = document.getElementById("slider-button");
const slider = document.getElementById("slider");
const mapconfig = document.getElementById("map");

slider.classList.add("open");

sliderButton.addEventListener("click", () => {
  if (slider.classList.contains("open")) {
    slider.classList.remove("open");
    slider.classList.add("closed");
    sliderButton.innerText = "Afficher les dataviz";
    sliderButton.classList.add("closed");
    mapconfig.classList.add("closed");
  } else {
    slider.classList.remove("closed");
    slider.classList.add("open");
    sliderButton.innerText = "Masquer les dataviz";
    sliderButton.classList.remove("closed");
    mapconfig.classList.remove("closed");
  }
});

// Paramétrage du bouton d'aide
$(document).ready(function () {
  $("#help-button").click(function () {
    $("#popup").addClass("show");
  });
  $("#close-button").click(function () {
    $("#popup").removeClass("show");
  });
});

window.addEventListener("load", function () {
  const messages = [
    "Le saviez-vous ? Rennes Métropole compte 43 communes et plus de 450 000 habitants.",
    "Le saviez-vous ? En moyenne, chaque habitant de Rennes Métropole consomme environ 4 000 kWh d'électricité par an.",
    "Le saviez-vous ? Rennes Métropole a pour objectif de réduire de 40% ses émissions de gaz à effet de serre d'ici 2030 par rapport à 2010.",
    "Le saviez-vous ? Le chauffage représente près de 60% de la consommation d'énergie d'un ménage moyen à Rennes Métropole.",
    "Le saviez-vous ? Rennes Métropole a déployé plus de 50 stations de recharge pour véhicules électriques à travers la ville.",
    "Le saviez-vous ? Environ 20% de l'énergie consommée à Rennes Métropole provient de sources renouvelables.",
    "Le saviez-vous ? Rennes Métropole a décidé de se doter d’une stratégie de sobriété énergétique et de développement des énergies renouvelables avec l'objectif d'atteindre l’autonomie énergétique d’ici 2050.",
    "Le saviez-vous ? La ville de Rennes abrite l'une des plus grandes centrales photovoltaïques sur toiture de Bretagne, installée sur le toit du Parc des Expositions.",
    "Le saviez-vous ? Le réseau de chaleur de Rennes est alimenté à plus de 50 % par des énergies renouvelables et de récupération. Une grande partie de la chaleur est produite à partir de la valorisation énergétique des déchets.",
    "Le projet Rennes Cogénération produit de l'électricité et de la chaleur à partir de biomasse, principalement du bois. C'est l'un des plus importants projets de ce type en France !",
    "Le saviez-vous ? Dans le cadre de sa politique d'efficacité énergétique, Rennes Métropole a mis en place la Plateforme de la Rénovation de l'Habitat qui vise à conseiller et accompagner les habitants dans leurs travaux de rénovation énergétique."
  ];

  const shuffledMessages = shuffle([...messages]);

  const loadingText = document.getElementById('loading-text');
  const skipButton = document.getElementById('skip-button');
  const redirectText = document.getElementById('redirect-text');
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const loadingDiv = document.getElementById('loading');

  let currentIndex = 0;
  loadingText.textContent = shuffledMessages[currentIndex];

  prevButton.addEventListener('click', function () {
    currentIndex = currentIndex === 0 ? shuffledMessages.length - 1 : currentIndex - 1;
    loadingText.textContent = shuffledMessages[currentIndex];
  });

  nextButton.addEventListener('click', function () {
    currentIndex = currentIndex === shuffledMessages.length - 1 ? 0 : currentIndex + 1;
    loadingText.textContent = shuffledMessages[currentIndex];
  });

  setTimeout(function () {
    skipButton.style.visibility = "visible";
    redirectText.style.visibility = "visible";

    let countdown = 5;
    redirectText.textContent = "Redirection automatique dans " + countdown + " secondes...";

    const countdownIntervalId = setInterval(function () {
      countdown -= 1;
      if (countdown === 0) {
        clearInterval(countdownIntervalId);
        loadingDiv.style.display = "none";
      } else {
        redirectText.textContent = "Redirection automatique dans " + countdown + " secondes...";
      }
    }, 1000);
  }, 2500);

  skipButton.addEventListener("click", function () {
    loadingDiv.style.display = "none";
  });
});

// Paramétrage des filtres en cascade
var isIrisVisible = false;
$(document).ready(function () {
  var currentSelections = {
    filiere: [],
    type: [],
    climat: ["Non"],
    annee: [],
  };
  var allData = [];

  getCachedResponse(conso_ok)
    .then((data) => {
      allData = data;

      ["filiere", "type"].forEach((category) => {
        let uniqueValues = [
          ...new Set(data.map((item) => item[category.toUpperCase()])),
        ]
          .filter(Boolean)
          .sort();

        let options = uniqueValues.map(function (val) {
          return { id: val, text: val };
        });

        $("#" + category + "-select")
          .select2({
            data: options,
            width: "100%",
            closeOnSelect: true,
            dropdownParent: $("#" + category + "-select").parent(),
            placeholder: category === "filiere" ? "Tous types confondus" : "Tous secteurs confondus",
          })
          .val(currentSelections[category])
          .trigger("change");

        $("#" + category + "-select").on(
          "select2:select select2:unselect",
          function (e) {
            currentSelections[category] = $("#" + category + "-select").val() || [];
            applyFilters();
          });
      });

      let uniqueYears = [...new Set(data.map((item) => item["ANNEE"]))].sort();
      let minYear = Math.min(...uniqueYears);
      let maxYear = Math.max(...uniqueYears);

      $("#year-range-slider").ionRangeSlider({
        type: "double",
        grid: true,
        min: minYear,
        max: maxYear,
        from: minYear,
        to: maxYear,
        prettify: function(num) {
            return Math.round(num);
        },
        onFinish: function (data) {
            currentSelections.annee = [];
            var from = data.from;
            var to = data.to;
    
            for (let i = from; i <= to; i++) {
                currentSelections.annee.push(String(i));
            }
    
            if (from === to) {
                document.getElementById('selected-period').innerText = from.toString();
            } else {
                document.getElementById('selected-period').innerText = from + ' - ' + to;
            }
            applyFilters();
        },
    });       

      $("#climat-checkbox").prop('checked', false);
      $("#climat-checkbox").change(function () {
        currentSelections.climat = $(this).is(":checked") ? ["Oui"] : ["Non"];
        if ($(this).is(":checked")) {
          $('#selected-climat').text('Données corrigées du climat');
        } else {
          $('#selected-climat').text('Données non corrigées du climat');
        }
        applyFilters();
      });

      applyFilters();
    });

  function applyFilters() {
    let filteredData = allData;

    filteredData = filteredData.filter(function (item) {
      return ["filiere", "type", "climat"].every(category =>
        currentSelections[category].length == 0 || currentSelections[category].includes(item[category.toUpperCase()])
      ) && (currentSelections["annee"].length == 0 || currentSelections["annee"].includes(item["ANNEE"].toString()));
    });
    removeWarningImages();

    communeSums = calculateCommuneSums(filteredData);
    IrisSums = calculateIrisSums(filteredData);
    CommuneParAbonne = calculateCommuneConsoParAbonne(filteredData);
    IrisParAbonne = calculateIrisConsoParAbonne(filteredData);

    if (currentCommune !== null) {
      filteredData = filteredData.filter(item => String(item.CODE_COM) === currentCommune);
    }
    if (currentIRIS !== null) {
      filteredData = filteredData.filter(item => String(item.CODE_IRIS) === currentIRIS);
    }

    // Affichage des chiffres clés
    const items = [
      { calculation: 'Filiere', type: 'Gaz', container: 'gas-container', element: 'gas-evolution' },
      { calculation: 'Filiere', type: 'Électricité', container: 'electricity-container', element: 'electricity-evolution' },
      { calculation: 'Filiere', type: 'all', container: 'all-container', element: 'all-evolution' },
      { calculation: 'Secteur', type: 'Résidentiel', container: 'residential-container', element: 'residential-evolution' },
      { calculation: 'Secteur', type: 'Industrie', container: 'industrial-container', element: 'industrial-evolution' },
      { calculation: 'Secteur', type: 'Tertiaire', container: 'tertiary-container', element: 'tertiary-evolution' },
      { calculation: 'Secteur', type: 'Agriculture', container: 'agricol-container', element: 'agricol-evolution' },
      { calculation: 'Secteur', type: 'all', container: 'secteur-container', element: 'secteur-evolution' },
    ];

    items.forEach(({ calculation, type, container, element }) => {
      const growthRate = calculation === 'Filiere'
        ? calculateConsumptionEvolution(filteredData, 'FILIERE', type, container)
        : calculateConsumptionEvolution(filteredData, 'TYPE', type, container);

      const domElement = document.getElementById(element);
      domElement.innerText = growthRate === null ? '' : growthRate;
    });

    updateMapDataCom(communeSums);
    updateMapDataIris(IrisSums);
    updateMapDataComAbonne(CommuneParAbonne);
    updateMapDataIrisAbonne(IrisParAbonne);
    createDonutSecteur(filteredData);
    createDonutType(filteredData);
    createStackedAreaChartSecteur(filteredData);
    createStackedAreaChartType(filteredData);
    createConsumptionEvolutionChartSecteur(filteredData);
    createConsumptionEvolutionChartType(filteredData);

    // Mise à jour de la div informative conso commune en fonction des sélections
    map.on('mousemove', 'OBS_COM', function (e) {
      var communeProperties = e.features[0].properties;
      var nomCom = communeProperties.libgeo;
      var codgeo = communeProperties.codgeo;
      var consoabo = CommuneParAbonne[codgeo];
      var consotot = communeSums[codgeo];
      consotot = Number(consotot).toLocaleString('fr-FR');
      consoabo = consoabo.toFixed(1);
      consoabo = Number(consoabo).toLocaleString('fr-FR');
      var infoDiv = document.getElementById('info');
      infoDiv.innerHTML = "<strong>" + nomCom + " (" + codgeo + ")" + "</strong><br>Consommation totale : " + consotot + " MWh<br>Consommation moyenne : " + consoabo + " MWh/abonné";
    });
    map.on('mouseleave', 'OBS_COM', function () {
      var infoDiv = document.getElementById('info');
      infoDiv.innerHTML = "Survolez une entité pour faire apparaître les informations de consommations énergétiques";
    });

    // Mise à jour de la div informative conso IRIS en fonction des sélections
    map.on('mousemove', 'OBS_IRIS', function (e) {
      var irisProperties = e.features[0].properties;
      var nomIris = irisProperties.NOM_IRIS;
      var codeIris = irisProperties.CODE_IRIS;
      var consoabo = IrisParAbonne[codeIris];
      var consotot = IrisSums[codeIris];
      consotot = Number(consotot).toLocaleString('fr-FR');
      consoabo = consoabo.toFixed(1);
      consoabo = Number(consoabo).toLocaleString('fr-FR');
      var infoDiv = document.getElementById('info');
      infoDiv.innerHTML = "<strong>" + nomIris + " (" + codeIris + ")" + "</strong><br>Consommation totale : " + consotot + " MWh" + "</strong><br>Consommation moyenne : " + consoabo + " MWh/abonné";
    });
    map.on('mouseleave', 'OBS_IRIS', function () {
      var infoDiv = document.getElementById('info');
      infoDiv.innerHTML = infoDiv.innerHTML = "Survolez une entité pour faire apparaître les informations de consommations énergétiques";
    });
    return filteredData;
  };

  $(document).ready(function() {
    $("#download-options").select2({
      placeholder: "Télécharger les données",
      minimumResultsForSearch: Infinity,
      templateResult: formatState,
      templateSelection: formatSelection
    });
  
    function formatState (state) {
      if (!state.id) {
        var $state = $('<span>' + state.text + '</span>'); 
        return $state;
      }
      return state.text;
    }
  
    function formatSelection (state) {
      if (!state.id) {
        var $state = $('<span style="color: #ffffff;">' + state.text + '</span>');
        return $state;
      }
      return state.text;
    }
  });

$("#download-options").val(null).trigger('change');
$("#download-options").on("select2:select", function (e) {
  let selectedOption = e.params.data.id;
  switch (selectedOption) {
    case "complete-csv":
      getCachedResponse(conso_ok)
        .then(data => {
          var csv = Papa.unparse(data);
          var csvData = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          var csvURL = null;
          if (navigator.msSaveBlob) {
            csvURL = navigator.msSaveBlob(csvData, 'data_conso_energie_rm.csv');
          } else {
            csvURL = window.URL.createObjectURL(csvData);
          }
          var tempLink = document.createElement('a');
          tempLink.href = csvURL;
          tempLink.setAttribute('download', 'data_conso_energie_rm.csv');
          tempLink.click();
        });
      break;
      case "complete-xls":
      getCachedResponse(conso_ok)
        .then(data => {
          var ws = XLSX.utils.json_to_sheet(data);
          var wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
          XLSX.writeFile(wb, getFilename() + '.xlsx');
        });
      break;
      case "complete-json":
      getCachedResponse(conso_ok)
        .then(data => {
          var json = JSON.stringify(data);
          var jsonBlob = new Blob([json], { type: "application/json" });
          var jsonUrl = URL.createObjectURL(jsonBlob);
          var link = document.createElement('a');
          link.href = jsonUrl;
          link.download = 'data_conso_energie_rm.json';
          link.click();
        });
      break;
    case "filtered-csv":
      getCachedResponse(conso_ok)
        .then(filteredData => {var csv = Papa.unparse(filteredData);
          var csvData = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          var csvURL = null;
          if (navigator.msSaveBlob) {
            csvURL = navigator.msSaveBlob(csvData, 'data_conso_energie_rm_filtered.csv');
          } else {
            csvURL = window.URL.createObjectURL(csvData);
          }
          var tempLink = document.createElement('a');
          tempLink.href = csvURL;
          tempLink.setAttribute('download', getFilename());
          tempLink.click();
        });
      break;
      case "filtered-xls":
      getCachedResponse(conso_ok)
        .then(filteredData => {
          var ws = XLSX.utils.json_to_sheet(filteredData);
          var wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
          XLSX.writeFile(wb, getFilename() + '.xlsx');
        });
      break;
      case "filtered-json":
      getCachedResponse(conso_ok)
      .then(filteredData => {
        var json = JSON.stringify(filteredData);
        var jsonBlob = new Blob([json], { type: "application/json" });
        var jsonUrl = URL.createObjectURL(jsonBlob);
        var link = document.createElement('a');
        link.href = jsonUrl;
        link.download = getFilename() + '.json';
        link.click();
      });
    break;
    default:
      console.log("Unknown option selected");
  }
  $("#download-options").val(null).trigger('change');
});

  // Définition du nom du fichier des données filtrées
  function getFilename() {
    let prefix = "conso";
    let territory = currentCommune ? currentCommune : 
                    currentIRIS ? "iris_" + currentIRIS : 
                    "rm";
    let filiereMapping = {"Électricité": "elec", "Gaz": "gaz"};
    let filiere = currentSelections.filiere.length > 0 ? 
                  "_" + currentSelections.filiere.map(f => filiereMapping[f]).join("-") : "";
    let typeMapping = {"Résidentiel": "resi", "Tertiaire": "ter", "Agriculture": "agri", "Industrie": "indu"};
    let type = currentSelections.type.length > 0 ? 
               "_" + currentSelections.type.map(t => typeMapping[t]).join("-") : "";
    let climatMapping = {"Oui": "c", "Non": "nc"};
    let climat = "_" + (currentSelections.climat[0] ? climatMapping[currentSelections.climat[0]] : "nc");
    let annee = currentSelections.annee.length > 0 ? 
            "_" + currentSelections.annee[0].slice(-2) + 
            (currentSelections.annee.length > 1 ? "-" + currentSelections.annee[currentSelections.annee.length - 1].slice(-2) : "")
            : "_10-21"; 
    return prefix + "_" + territory + filiere + type + climat + annee + ".csv";
  }

  // Configuration des chiffres clés
  function calculateConsumptionEvolution(data, filterType, energyType, containerId) {
    let filterFound = false;
    let consumptionDataFound = false;

    const totalConsumptionPerYear = data.reduce((accumulator, current) => {
      const year = current['ANNEE'];
      if (accumulator[year] === undefined) {
        accumulator[year] = 0;
      }
      if (energyType === 'all' || current[filterType] === energyType) {
        filterFound = true;
        if (Number(current['CONSO']) !== 0) {
          consumptionDataFound = true;
        }
        accumulator[year] += Number(current['CONSO']);
      }
      return accumulator;
    }, {});

    const warningImage = "https://raw.githubusercontent.com/Hugo2876/AUDIAR/main/warning.svg";
    const forbiddenImage = "https://raw.githubusercontent.com/Hugo2876/AUDIAR/main/forbidden.svg";

    let img = document.createElement('img');
    img.width = 30;
    img.height = 30;
    img.className = 'warning-image';

    if (!filterFound) {
      img.src = warningImage;
      img.title = "Aucune donnée pour les filtres sélectionnés";
      document.getElementById(containerId).appendChild(img);
      return null;
    } else {
      const years = Object.keys(totalConsumptionPerYear).sort();
      const initialYear = Number(years[0]);
      const finalYear = Number(years[years.length - 1]);

      const initialConsumption = totalConsumptionPerYear[initialYear];
      const finalConsumption = totalConsumptionPerYear[finalYear];

      const consumptionEvolution = finalConsumption - initialConsumption;
      let prefixedConsumptionEvolution = consumptionEvolution >= 0 ? '+' : '-';
      prefixedConsumptionEvolution += Math.abs(consumptionEvolution).toLocaleString();

      let evolutionRate = ((finalConsumption / initialConsumption) - 1) * 100;
      evolutionRate = evolutionRate === Infinity ? '∞' : evolutionRate.toFixed(1);
      const prefixedEvolutionRate = evolutionRate >= 0 && evolutionRate !== '∞' ? '+' + evolutionRate : evolutionRate;

      if ((isNaN(consumptionEvolution) || isNaN(evolutionRate)) && evolutionRate !== '∞') {
        img.src = forbiddenImage;
        img.title = "Aucune consommation pour l'entité sélectionnée dans les années sélectionnées";
        document.getElementById(containerId).appendChild(img);
        return null;
      } else {
        return prefixedConsumptionEvolution + '\nMWh\n' + '(' + prefixedEvolutionRate + '%)';
      }
    }
  }

  // Fonction pour retirer les images d'alerte
  function removeWarningImages() {
    const warningImages = document.getElementsByClassName('warning-image');
    while (warningImages[0]) {
      warningImages[0].parentNode.removeChild(warningImages[0]);
    }
  }

  // Donut chart de consommation par secteur
  var DonutSecteur;
  var secteurColors = {
    Résidentiel: '#A5665A',
    Industrie: '#796E5B',
    Tertiaire: '#9A9E80',
    Agriculture: '#80B288'
  };

  function createDonutSecteur(data) {
    const groupedData = _.groupBy(data, 'TYPE');

    const labels = Object.keys(groupedData);
    const consoParSecteur = labels.map(label => {
      return _.sumBy(groupedData[label], 'CONSO');
    });

    var ctx = document.getElementById('DonutSecteur');
    var noDataContainer = document.getElementById('noDataContainer5');

    if (_.sum(consoParSecteur) === 0) {
      if (DonutSecteur) {
        DonutSecteur.destroy();
        DonutSecteur = null;
      }
      ctx.style.display = 'none';
      noDataContainer.style.display = 'flex';
    } else {
      ctx.style.display = 'block';
      noDataContainer.style.display = 'none';

      ctx = ctx.getContext('2d');

      if (DonutSecteur) {
        DonutSecteur.data.labels = labels;
        DonutSecteur.data.datasets[0].data = consoParSecteur;
        DonutSecteur.data.datasets[0].backgroundColor = labels.map(label => secteurColors[label] || '#808080');
        DonutSecteur.update();
      } else {
        DonutSecteur = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              label: 'Consommation totale',
              data: consoParSecteur,
              backgroundColor: labels.map(label => secteurColors[label]),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  font: {
                    size: 11,
                    family: 'Montserrat, sans-serif',
                  },
                  boxWidth: 15,
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    var value = context.parsed;
                    value = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
                    return value + ' MWh';
                  }
                },
                displayColors: false,
                bodyFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                titleFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                backgroundColor: '#316d7b',
                borderColor: '#ffffff',
                borderWidth: 1,
              },
            },
          },
        });
      }
    }
  }

  // Donut chart de consommation par type
  var DonutType;
  var typeColors = {
    Électricité: '#316D7B',
    Gaz: '#D1654C'
  };
  function createDonutType(data) {
    const groupedData = _.groupBy(data, 'FILIERE');

    const labels = Object.keys(groupedData);
    const consoParType = labels.map(label => {
      return _.sumBy(groupedData[label], 'CONSO');
    });

    var ctx = document.getElementById('DonutType');
    var noDataContainer = document.getElementById('noDataContainer6');

    if (_.sum(consoParType) === 0) {
      if (DonutType) {
        DonutType.destroy();
        DonutType = null;
      }
      ctx.style.display = 'none';
      noDataContainer.style.display = 'flex';
    } else {
      ctx.style.display = 'block';
      noDataContainer.style.display = 'none';

      ctx = ctx.getContext('2d');

      if (DonutType) {
        DonutType.data.labels = labels;
        DonutType.data.datasets[0].data = consoParType;
        DonutType.data.datasets[0].backgroundColor = labels.map(label => typeColors[label] || '#808080');
        DonutType.update();
      } else {
        DonutType = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              label: 'Consommation totale',
              data: consoParType,
              backgroundColor: labels.map(label => typeColors[label]),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  font: {
                    size: 11,
                    family: 'Montserrat, sans-serif',
                  },
                  boxWidth: 15,
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    var value = context.parsed;
                    value = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
                    return value + ' MWh';
                  }
                },
                displayColors: false,
                bodyFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                titleFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                backgroundColor: '#316d7b',
                borderColor: '#ffffff',
                borderWidth: 1,
              },
            },
          },
        });
      }
    }
  }

  // Stacked chart de consommation par secteur
  var LineStackedSecteur;

  function createStackedAreaChartSecteur(data) {
    const groupedData = data.reduce((acc, row) => {
      acc[row['ANNEE']] = acc[row['ANNEE']] || {};
      acc[row['ANNEE']][row['TYPE']] = (acc[row['ANNEE']][row['TYPE']] || 0) + row['CONSO'];
      return acc;
    }, {});

    const labels = Object.keys(groupedData).sort();
    const types = Array.from(new Set(data.map(row => row['TYPE'])));

    const datasets = types.map(type => {
      const data = labels.map(year => groupedData[year][type] || 0);
      return {
        label: type,
        data: data,
        fill: true,
        borderColor: secteurColors[type],
        backgroundColor: secteurColors[type],
        pointBorderColor: 'white',
        pointRadius: 2.5
      };
    });

    const ctx = document.getElementById('AreaStackedSecteur').getContext('2d');
    const noDataContainer = document.getElementById('noDataContainer1');

    const totalSum = datasets.reduce((total, dataset) => total + dataset.data.reduce((a, b) => a + b, 0), 0);

    if (totalSum === 0) {
      if (LineStackedSecteur) {
        LineStackedSecteur.destroy();
        LineStackedSecteur = null;
      }
      ctx.canvas.style.display = 'none';
      noDataContainer.style.display = 'flex';
    } else {
      ctx.canvas.style.display = 'block';
      noDataContainer.style.display = 'none';

      if (LineStackedSecteur) {
        LineStackedSecteur.data.labels = labels;
        LineStackedSecteur.data.datasets = datasets;
        LineStackedSecteur.update();
      } else {
        LineStackedSecteur = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                stacked: true,
                title: {
                  display: true,
                  text: 'Consommation (MWh)',
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                },
                ticks: {
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  }
                }
              },
              x: {
                stacked: true,
                title: {
                  display: true,
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                },
                ticks: {
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  }
                }
              },
            },
            plugins: {
              legend: {
                labels: {
                  font: {
                    size: 11,
                    family: 'Montserrat, sans-serif',
                  },
                  boxWidth: 10,
                  boxHeight: 5,
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const value = context.parsed.y;
                    return value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' MWh';
                  },
                },
                displayColors: false,
                bodyFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                titleFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                backgroundColor: '#316d7b',
                borderColor: '#ffffff',
                borderWidth: 1,
              },
            },
          },
        });
      }
    }
  }

  // Stacked chart de consommation par type
  var LineStackedType;

  function createStackedAreaChartType(data) {
    const groupedData = data.reduce((acc, row) => {
      acc[row['ANNEE']] = acc[row['ANNEE']] || {};
      acc[row['ANNEE']][row['FILIERE']] = (acc[row['ANNEE']][row['FILIERE']] || 0) + row['CONSO'];
      return acc;
    }, {});

    const labels = Object.keys(groupedData).sort();
    const filieres = Array.from(new Set(data.map(row => row['FILIERE'])));

    const datasets = filieres.map(filiere => {
      const data = labels.map(year => groupedData[year][filiere] || 0);
      return {
        label: filiere,
        data: data,
        fill: true,
        borderColor: typeColors[filiere],
        backgroundColor: typeColors[filiere],
        pointBorderColor: 'white',
        pointRadius: 2.5
      };
    });

    const ctx = document.getElementById('AreaStackedType').getContext('2d');
    const noDataContainer = document.getElementById('noDataContainer2');

    const totalSum = datasets.reduce((total, dataset) => total + dataset.data.reduce((a, b) => a + b, 0), 0);

    if (totalSum === 0) {
      if (LineStackedType) {
        LineStackedType.destroy();
        LineStackedType = null;
      }
      ctx.canvas.style.display = 'none';
      noDataContainer.style.display = 'flex';
    } else {
      ctx.canvas.style.display = 'block';
      noDataContainer.style.display = 'none';

      if (LineStackedType) {
        LineStackedType.data.labels = labels;
        LineStackedType.data.datasets = datasets;
        LineStackedType.update();
      } else {
        LineStackedType = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                stacked: true,
                title: {
                  display: true,
                  text: 'Consommation (MWh)',
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                },
                ticks: {
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  }
                }
              },
              x: {
                stacked: true,
                title: {
                  display: true,
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                },
                ticks: {
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  }
                }
              },
            },
            plugins: {
              legend: {
                labels: {
                  font: {
                    size: 11,
                    family: 'Montserrat, sans-serif',
                  },
                  boxWidth: 10,
                  boxHeight: 5,
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const value = context.parsed.y;
                    return value.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' MWh';
                  },
                },
                displayColors: false,
                bodyFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                titleFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                backgroundColor: '#316d7b',
                borderColor: '#ffffff',
                borderWidth: 1,
              },
            },
          },
        });
      }
    }
  }

  // Line stacked chart de consommation par secteur
  var consumptionEvolutionChartSecteur;

  function createConsumptionEvolutionChartSecteur(data) {

    const consumptionPerYearAndType = data.reduce((accumulator, current) => {
      const year = current['ANNEE'];
      const type = current['TYPE'];
      if (accumulator[year] === undefined) {
        accumulator[year] = {};
      }
      if (accumulator[year][type] === undefined) {
        accumulator[year][type] = 0;
      }
      accumulator[year][type] += Number(current['CONSO']);
      return accumulator;
    }, {});

    const years = Object.keys(consumptionPerYearAndType).sort();
    const types = [...new Set(data.map(item => item['TYPE']))];
    const datasets = types.map(type => ({
      label: type,
      data: years.map(year => consumptionPerYearAndType[year][type] || 0),
      fill: false,
      borderColor: secteurColors[type],
      backgroundColor: secteurColors[type],
      pointRadius: 2
    }));

    const totalSum = datasets.reduce((total, dataset) => total + dataset.data.reduce((a, b) => a + b, 0), 0);

    const ctx = document.getElementById('LineStackedSecteur').getContext('2d');
    const noDataContainer = document.getElementById('noDataContainer3');

    if (totalSum === 0) {
      if (consumptionEvolutionChartSecteur) {
        consumptionEvolutionChartSecteur.destroy();
        consumptionEvolutionChartSecteur = null;
      }
      ctx.canvas.style.display = 'none';
      noDataContainer.style.display = 'flex';
    } else {
      ctx.canvas.style.display = 'block';
      noDataContainer.style.display = 'none';

      if (consumptionEvolutionChartSecteur) {
        consumptionEvolutionChartSecteur.data.labels = years;
        consumptionEvolutionChartSecteur.data.datasets = datasets;
        consumptionEvolutionChartSecteur.update();
      } else {
        consumptionEvolutionChartSecteur = new Chart(ctx, {
          type: 'line',
          data: {
            labels: years,
            datasets: datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            title: {
              display: true,
              text: 'Consommation par année et par secteur'
            },
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                },
                ticks: {
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  }
                }
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: 'Consommation (MWh)',
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                },
                ticks: {
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  }
                }
              }
            },
            plugins: {
              legend: {
                labels: {
                  font: {
                    size: 11,
                    family: 'Montserrat, sans-serif',
                  },
                  boxWidth: 10,
                  boxHeight: 5,
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    var value = context.parsed.y;
                    value = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
                    return value + ' MWh';
                  }
                },
                displayColors: false,
                bodyFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                titleFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                backgroundColor: '#316d7b',
                borderColor: '#ffffff',
                borderWidth: 1,
              },
            },
          }
        });
      }
    }
  }
  document.getElementById('LineStackedSecteur').style.height = '220px';

  // Line stacked chart de consommation par type
  var consumptionEvolutionChartType;
  function createConsumptionEvolutionChartType(data) {

    const consumptionPerYearAndFiliere = data.reduce((accumulator, current) => {
      const year = current['ANNEE'];
      const filiere = current['FILIERE'];
      if (accumulator[year] === undefined) {
        accumulator[year] = {};
      }
      if (accumulator[year][filiere] === undefined) {
        accumulator[year][filiere] = 0;
      }
      accumulator[year][filiere] += Number(current['CONSO']);
      return accumulator;
    }, {});

    const years = Object.keys(consumptionPerYearAndFiliere).sort();
    const filieres = [...new Set(data.map(item => item['FILIERE']))];
    const datasets = filieres.map(filiere => ({
      label: filiere,
      data: years.map(year => consumptionPerYearAndFiliere[year][filiere] || 0),
      fill: false,
      borderColor: typeColors[filiere],
      backgroundColor: typeColors[filiere],
      pointRadius: 2
    }));

    const totalSum = datasets.reduce((total, dataset) => total + dataset.data.reduce((a, b) => a + b, 0), 0);

    const ctx = document.getElementById('LineStackedType').getContext('2d');
    const noDataContainer = document.getElementById('noDataContainer4');

    if (totalSum === 0) {
      if (consumptionEvolutionChartType) {
        consumptionEvolutionChartType.destroy();
        consumptionEvolutionChartType = null;
      }
      ctx.canvas.style.display = 'none';
      noDataContainer.style.display = 'flex';
    } else {
      ctx.canvas.style.display = 'block';
      noDataContainer.style.display = 'none';

      if (consumptionEvolutionChartType) {
        consumptionEvolutionChartType.data.labels = years;
        consumptionEvolutionChartType.data.datasets = datasets;
        consumptionEvolutionChartType.update();
      } else {
        consumptionEvolutionChartType = new Chart(ctx, {
          type: 'line',
          data: {
            labels: years,
            datasets: datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            title: {
              display: true,
              text: 'Consommation par année et par secteur'
            },
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                },
                ticks: {
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                }
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: 'Consommation (MWh)',
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  },
                },
                ticks: {
                  font: {
                    size: 10,
                    family: 'Montserrat, sans-serif',
                  }
                }
              }
            },
            plugins: {
              legend: {
                labels: {
                  font: {
                    size: 11,
                    family: 'Montserrat, sans-serif',
                  },
                  boxWidth: 10,
                  boxHeight: 5,
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    var value = context.parsed.y;
                    value = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
                    return value + ' MWh';
                  }
                },
                displayColors: false,
                bodyFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                titleFont: {
                  size: 12,
                  family: 'Montserrat, sans-serif',
                },
                backgroundColor: '#316d7b',
                borderColor: '#ffffff',
                borderWidth: 1,
              },
            },
          }
        });
      }
    }
  }
  document.getElementById('LineStackedType').style.height = '220px';

  // Initialisation des données carto + graphiques
  var allData;
  var communeData;
  var irisData;

  getCachedResponse(conso_ok)
    .then(data => {
      allData = data;
      applyFilters();
      getCachedResponse(obs_com)
        .then(data => {
          communeData = data;
          document.getElementById("show_communes").addEventListener("click", showCommunes);
          showCommunes();
        });
      getCachedResponse(obs_iris)
        .then(data => {
          irisData = data;
          document.getElementById("show_iris").addEventListener("click", showIris);
        });
    });

  var currentCommune = null;
  var currentIRIS = null;

  // Fonction pour afficher les communes

  function showCommunes() {
    if ($('#iris-selector').data('select2')) {
      $('#iris-selector').select2('destroy');
    }
    document.getElementById('iris-selector').style.display = 'none';

    let communeSelector = document.getElementById('commune-selector');
    communeSelector.style.display = 'block';
    currentIRIS = null;
    currentCommune = null;
    let options = _.map(communeData.features, function (feature) {
      let name = feature.properties.libgeo;
      let code = feature.properties.codgeo;
      return { id: code, text: name + ' (' + code + ')' };
    });

    options.sort((a, b) => {
      if (a.text > b.text) return 1;
      if (a.text < b.text) return -1;
      if (a.id > b.id) return 1;
      if (a.id < b.id) return -1;
      return 0;
    });

    $(communeSelector).select2({
      data: options,
      width: '210px',
      placeholder: 'Liste de communes',
      allowClear: true
    }).on('select2:select', function (e) {
      currentCommune = e.params.data.id;
      applyFilters();
      let feature = communeData.features.find(feature => feature.properties.codgeo === currentCommune);
      document.getElementById('selected-territory').innerText = getTerritoryName(feature, isIrisVisible);
      if (feature) {
        let bbox = turf.bbox(feature);
        let bounds = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        map.fitBounds(bounds, { padding: { top: 100, right: 100, bottom: 100, left: 100 } });
      }
    }).on('select2:unselect', function () {
      document.getElementById('selected-territory').innerText = getTerritoryName(null, isIrisVisible);
      map.flyTo({ zoom: 10, center: [-1.79, 48.12] });
      currentCommune = null;
      applyFilters();
    });

    $(communeSelector).val(null).trigger('change');
    document.getElementById('selected-territory').innerText = getTerritoryName(null, isIrisVisible);
    applyFilters();

    map.on('click', function (e) {
      let features = map.queryRenderedFeatures(e.point, { layers: ['OBS_COM'] });

      if (features.length) {
        let feature = features[0];
        let code = feature.properties.codgeo;
        $('#commune-selector').val(code).trigger('change');

        currentCommune = code;
        applyFilters();

        let bbox = turf.bbox(feature);
        let bounds = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        map.fitBounds(bounds, { padding: { top: 100, right: 100, bottom: 100, left: 100 } });

        document.getElementById('selected-territory').innerText = getTerritoryName(feature, isIrisVisible);
      } else {
        $('#commune-selector').val(null).trigger('change');
        currentCommune = null;
        applyFilters();
        map.flyTo({ zoom: 10, center: [-1.79, 48.12] });

        document.getElementById('selected-territory').innerText = getTerritoryName(null, isIrisVisible);
      }
    });

    map.flyTo({ zoom: 10, center: [-1.79, 48.12] });
    map.setLayoutProperty("OBS_COM", "visibility", "visible");
    map.setLayoutProperty("CENTRO_COM", "visibility", "visible");
    map.setLayoutProperty("OBS_IRIS", "visibility", "none");
    map.setLayoutProperty("CENTRO_IRIS", "visibility", "none");
    document.getElementById("show_communes").classList.add("btn-active");
    document.getElementById("show_iris").classList.remove("btn-active");
    isIrisVisible = false;
    updateLegendTotal(radiusStopsCOM);
    updateLegendAbonne(quantilesComAbonne);
  }

  // Fonction pour afficher les IRIS

  function showIris() {
    if ($('#commune-selector').data('select2')) {
      $('#commune-selector').select2('destroy');
    }
    document.getElementById('commune-selector').style.display = 'none';

    let irisSelector = document.getElementById('iris-selector');
    irisSelector.style.display = 'block';
    currentIRIS = null;
    currentCommune = null;
    let options = _.map(irisData.features, function (feature) {
      let name = feature.properties.NOM_IRIS;
      let code = feature.properties.CODE_IRIS;
      return { id: code, text: name + ' (' + code + ')' };
    });

    options.sort((a, b) => {
      if (a.text > b.text) return 1;
      if (a.text < b.text) return -1;
      if (a.id > b.id) return 1;
      if (a.id < b.id) return -1;
      return 0;
    });

    $(irisSelector).select2({
      data: options,
      width: '210px',
      placeholder: "Liste d'IRIS",
      allowClear: true
    }).on('select2:select', function (e) {
      currentIRIS = e.params.data.id;
      applyFilters();
      let feature = irisData.features.find(feature => feature.properties.CODE_IRIS === currentIRIS);
      document.getElementById('selected-territory').innerText = getTerritoryName(feature, isIrisVisible);
      if (feature) {
        let bbox = turf.bbox(feature);
        let bounds = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        map.fitBounds(bounds, { padding: { top: 100, right: 100, bottom: 100, left: 100 } });
      }
    }).on('select2:unselect', function () {
      document.getElementById('selected-territory').innerText = getTerritoryName(null, isIrisVisible);
      map.flyTo({ zoom: 10, center: [-1.79, 48.12] });
      currentIRIS = null;
      applyFilters();
    });

    $(irisSelector).val(null).trigger('change');
    document.getElementById('selected-territory').innerText = getTerritoryName(null, isIrisVisible);
    applyFilters();

    map.on('click', function (e) {
      let features = map.queryRenderedFeatures(e.point, { layers: ['OBS_IRIS'] });

      if (features.length) {
        let feature = features[0];
        let code = feature.properties.CODE_IRIS;
        $('#iris-selector').val(code).trigger('change');

        currentIRIS = code;
        applyFilters();

        let bbox = turf.bbox(feature);
        let bounds = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        map.fitBounds(bounds, { padding: { top: 100, right: 100, bottom: 100, left: 100 } });

        document.getElementById('selected-territory').innerText = getTerritoryName(feature, isIrisVisible);
      } else {
        $('#iris-selector').val(null).trigger('change');
        currentIRIS = null;
        applyFilters();
        map.flyTo({ zoom: 10, center: [-1.79, 48.12] });

        document.getElementById('selected-territory').innerText = getTerritoryName(null, isIrisVisible);
      }
    });

    map.flyTo({ zoom: 10, center: [-1.79, 48.12] });
    map.setLayoutProperty("OBS_IRIS", "visibility", "visible");
    map.setLayoutProperty("CENTRO_IRIS", "visibility", "visible");
    map.setLayoutProperty("OBS_COM", "visibility", "none");
    map.setLayoutProperty("CENTRO_COM", "visibility", "none");
    document.getElementById("show_iris").classList.add("btn-active");
    document.getElementById("show_communes").classList.remove("btn-active");
    isIrisVisible = true;
    updateLegendTotal(radiusStopsIRIS);
    updateLegendAbonne(quantilesIrisAbonne);
  }

  // Mise à jour des données carto de consommations totales pour les centroïdes des communes
  var updateMapDataCom = function (communeSums) {
    getCachedResponse(centro_com)
      .then((CentroCom) => {
        CentroCom.features.forEach((feature) => {
          const codeCom = feature.properties.codgeo;
          if (communeSums.hasOwnProperty(codeCom)) {
            feature.properties.CONSO = communeSums[codeCom];
          } else {
            feature.properties.CONSO = 0;
          }
        });

        map.getSource('centro_com').setData(CentroCom);
        const consoValues = Object.values(communeSums).filter((conso) => conso !== 0);
        quantiles = calculateQuantiles(consoValues, 5);
        radiusStopsCOM = getRadiusStops(quantiles);
        map.setPaintProperty('CENTRO_COM', 'circle-radius', {
          property: "CONSO",
          type: "exponential",
          stops: radiusStopsCOM,
        });
        if (!isIrisVisible) {
          updateLegendTotal(radiusStopsCOM);
        }
      });
  };

  // Mise à jour des données carto de consommation par abonné pour les polygones des communes
  var updateMapDataComAbonne = function (communeConsoParAbonne) {
    getCachedResponse(obs_com)
      .then((ObsCom) => {
        ObsCom.features.forEach((feature) => {
          const codeCom = feature.properties.codgeo;
          if (communeConsoParAbonne.hasOwnProperty(codeCom)) {
            feature.properties.CONSO = communeConsoParAbonne[codeCom];
          }
        });

        map.getSource('obs_com').setData(ObsCom);

        const consoValues = Object.values(communeConsoParAbonne).filter((conso) => conso !== 0);
        quantilesComAbonne = calculateQuantiles(consoValues, 5);

        const fillColorExpression = ["match", ["get", "codgeo"]];
        for (const codeCom in communeConsoParAbonne) {
          const color = getColorForValue(communeConsoParAbonne[codeCom], quantilesComAbonne);
          fillColorExpression.push(codeCom, color);
        }
        fillColorExpression.push("#c0c0c0");

        map.setPaintProperty('OBS_COM', 'fill-color', fillColorExpression);
        if (!isIrisVisible) {
          updateLegendAbonne(quantilesComAbonne);
        }
      });
  };

  // Mise à jour des données carto de consommation totale pour les centroïdes des IRIS
  var updateMapDataIris = function (IrisSums) {
    getCachedResponse(centro_iris)
      .then((CentroIris) => {
        CentroIris.features.forEach((feature) => {
          const irisCode = feature.properties.CODE_IRIS;
          if (IrisSums.hasOwnProperty(irisCode)) {
            feature.properties.CONSO = IrisSums[irisCode];
          } else {
            feature.properties.CONSO = 0;
          }
        });

        map.getSource("centro_iris").setData(CentroIris);
        const consoValues = Object.values(IrisSums).filter((conso) => conso !== 0);
        quantiles = calculateQuantiles(consoValues, 5);
        radiusStopsIRIS = getRadiusStops(quantiles);
        map.setPaintProperty("CENTRO_IRIS", "circle-radius", {
          property: "CONSO",
          type: "exponential",
          stops: radiusStopsIRIS,
        });
        if (isIrisVisible) {
          updateLegendTotal(radiusStopsIRIS);
        }
      });
  };
});

// Mise à jour des données carto de consommation par abonné pour les polygones des IRIS
var updateMapDataIrisAbonne = function (IrisConsoParAbonne) {
  getCachedResponse(obs_iris)
    .then((ObsIris) => {
      ObsIris.features.forEach((feature) => {
        const codeIris = feature.properties.CODE_IRIS;
        if (IrisConsoParAbonne.hasOwnProperty(codeIris)) {
          feature.properties.CONSO = IrisConsoParAbonne[codeIris];
        }
      });

      map.getSource('obs_iris').setData(ObsIris);

      const consoValues = Object.values(IrisConsoParAbonne).filter((conso) => conso !== 0);
      quantilesIrisAbonne = calculateQuantiles(consoValues, 5);

      const fillColorExpression = ["match", ["get", "CODE_IRIS"]];
      for (const codeIris in IrisConsoParAbonne) {
        const color = getColorForValue(IrisConsoParAbonne[codeIris], quantilesIrisAbonne);
        fillColorExpression.push(codeIris, color);
      }
      fillColorExpression.push("#c0c0c0");

      map.setPaintProperty('OBS_IRIS', 'fill-color', fillColorExpression);
      if (isIrisVisible) {
        updateLegendAbonne(quantilesIrisAbonne);
      }
    });
};

// Initialisation de la carte
function initializeMap() {
  map = new maplibregl.Map({
    container: "map",
    style:
      "https://api.maptiler.com/maps/voyager/style.json?key=rrASqj6frF6l2rrOFR4A",
    zoom: 10,
    center: [-1.79, 48.12],
    minZoom: 10
  });

  // Jointure des contours communaux et des données de consommation
  Promise.all([
    getCachedResponse(obs_com),
    getCachedResponse(conso_ok)
  ])
    .then(([ObsCom, ConsoObs]) => {
      ConsoObs = ConsoObs.filter((entry) => entry.CLIMAT === "Non");
      const communeConsoParAbonne = calculateCommuneConsoParAbonne(ConsoObs);

      const consoValues = Object.values(communeConsoParAbonne).filter((conso) => conso !== 0);
      quantilesComAbonne = calculateQuantiles(consoValues, 5);

      const fillColorExpression = ["match", ["get", "codgeo"]];
      for (const codeCom in communeConsoParAbonne) {
        const color = getColorForValue(communeConsoParAbonne[codeCom], quantilesComAbonne);
        fillColorExpression.push(codeCom, color);
      }
      fillColorExpression.push("#000000");

      map.on("load", function () {
        if (!map.getSource("obs_com")) {
          map.addSource("obs_com", {
            type: "geojson",
            data: ObsCom,
          });
        }

        if (!map.getLayer("OBS_COM")) {
          map.addLayer({
            id: "OBS_COM",
            type: "fill",
            source: "obs_com",
            paint: {
              "fill-color": fillColorExpression,
              "fill-outline-color": "#ffffff",
              "fill-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                1,
                17,
                0,
              ],
            },
          });
        }
        // Définition d'une div informative au survol des communes
        map.on('mousemove', 'OBS_COM', function (e) {
          var communeProperties = e.features[0].properties;
          var nomCom = communeProperties.libgeo;
          var codgeo = communeProperties.codgeo;
          var consoabo = communeConsoParAbonne[codgeo];
          var consotot = communeSums[codgeo];
          consotot = Number(consotot).toLocaleString('fr-FR');
          consoabo = Number(consoabo).toLocaleString('fr-FR');
          var infoDiv = document.getElementById('info');
          var noDataImage = document.getElementById('noDataImageIRIS');

          if (consotot === 0) {
            infoDiv.innerHTML = "<strong>" + nomCom + " (" + codgeo + ")" + "</strong><br>Aucune consommation pour l'entité sélectionnéé'";
            noDataImage.style.display = 'block';
          } else {
            consoabo = consoabo.toFixed(1);
            infoDiv.innerHTML = "<strong>" + nomCom + " (" + codgeo + ")" + "</strong><br>Consommation totale : " + consotot + " MWh" + "</strong><br>Consommation moyenne : " + consoabo + " MWh/abonné";
            noDataImage.style.display = 'none';
          }
        });

        map.on('mouseleave', 'OBS_COM', function () {
          var noDataImage = document.getElementById('noDataImageIRIS');
          infoDiv.innerHTML = "Survolez une entité pour faire apparaître ses informations de consommations énergétiques";
          noDataImage.style.display = 'none';
        });
      });
    });

  // Jointure des centroïdes communaux et des données de consommation
  Promise.all([
    getCachedResponse(centro_com),
    getCachedResponse(conso_ok)
  ])
    .then(([CentroCom, ConsoObs]) => {
      const consoByCode = {};
      ConsoObs.forEach((entry) => {
        const codeCom = entry.CODE_COM;
        const consoValue = entry.CONSO;
        const climatValue = entry.CLIMAT;
        if (climatValue === "Non") {
          if (!consoByCode[codeCom]) {
            consoByCode[codeCom] = 0;
          }
          consoByCode[codeCom] += consoValue;
        }
      });

      ConsoObs = ConsoObs.filter((entry) => entry.CLIMAT === "Non");
      communeSums = calculateCommuneSums(ConsoObs);
      CentroCom.features.forEach((feature) => {
        const codeCom = feature.properties.codgeo;
        if (communeSums.hasOwnProperty(codeCom)) {
          feature.properties.CONSO = communeSums[codeCom];
        }
      });

      const consoValues = Object.values(communeSums).filter((conso) => conso !== 0);
      quantiles = calculateQuantiles(consoValues, 5);
      radiusStopsCOM = getRadiusStops(quantiles);

      map.on("load", function () {
        if (!map.getSource("centro_com")) {
          map.addSource("centro_com", {
            type: "geojson",
            data: CentroCom,
          });
        }

        if (!map.getLayer("CENTRO_COM")) {
          map.addLayer({
            id: "CENTRO_COM",
            type: "circle",
            source: "centro_com",
            paint: {
              "circle-radius": {
                property: "CONSO",
                type: "exponential",
                stops: radiusStopsCOM,
              },
              "circle-color": "#ffffff",
              "circle-opacity": 1,
            },
          });
        }
        updateLegendTotal(radiusStopsCOM);
        updateLegendAbonne(quantilesComAbonne);
      });
    });

  // Jointure des contours des IRIS et des données de consommation
  Promise.all([
    getCachedResponse(obs_iris),
    getCachedResponse(conso_ok)
  ])
    .then(([ObsIris, ConsoObs]) => {
      ConsoObs = ConsoObs.filter((entry) => entry.CLIMAT === "Non");
      const IrisConsoParAbonne = calculateIrisConsoParAbonne(ConsoObs);

      const consoValues = Object.values(IrisConsoParAbonne).filter((conso) => conso !== 0);
      quantilesIrisAbonne = calculateQuantiles(consoValues, 5);

      const fillColorExpression = ["match", ["get", "CODE_IRIS"]];
      for (const codeIris in IrisConsoParAbonne) {
        const color = getColorForValue(IrisConsoParAbonne[codeIris], quantilesIrisAbonne);
        fillColorExpression.push(codeIris, color);
      }
      fillColorExpression.push("#000000");

      map.on("load", function () {
        if (!map.getSource("obs_iris")) {
          map.addSource("obs_iris", {
            type: "geojson",
            data: ObsIris,
          });
        }

        if (!map.getLayer("OBS_IRIS")) {
          map.addLayer({
            id: "OBS_IRIS",
            type: "fill",
            source: "obs_iris",
            paint: {
              "fill-color": fillColorExpression,
              "fill-outline-color": "#ffffff",
              "fill-opacity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                10,
                1,
                20,
                0,
              ],
            },
            layout: {
              visibility: "none",
            }
          });
        }
        // Définition d'une div informative au survol des IRIS
        map.on('mousemove', 'OBS_IRIS', function (e) {
          var irisProperties = e.features[0].properties;
          var nomIris = irisProperties.NOM_IRIS;
          var codeIris = irisProperties.CODE_IRIS;
          var consoabo = IrisConsoParAbonne[codeIris];
          var consotot = IrisSums[codeIris];
          consotot = Number(consotot).toLocaleString('fr-FR');
          consoabo = Number(consoabo).toLocaleString('fr-FR');
          var infoDiv = document.getElementById('info');
          var noDataImage = document.getElementById('noDataImageIRIS');

          if (consotot === 0) {
            infoDiv.innerHTML = "<strong>" + nomIris + " (" + codeIris + ")" + "</strong><br>Aucune consommation pour l'entité sélectionnée";
            noDataImage.style.display = 'block';
          } else {
            consoabo = consoabo.toFixed(1);
            infoDiv.innerHTML = "<strong>" + nomIris + " (" + codeIris + ")" + "</strong><br>Consommation totale : " + consotot + " MWh" + "</strong><br>Consommation moyenne : " + consoabo + " MWh/abonné";
            noDataImage.style.display = 'none';
          }
        });

        map.on('mouseleave', 'OBS_IRIS', function () {
          var infoDiv = document.getElementById('info');
          var noDataImage = document.getElementById('noDataImageIRIS');
          infoDiv.innerHTML = "Survolez une entité pour faire apparaître ses informations de consommations énergétiques";
          noDataImage.style.display = 'none';
        })
      });
    });

  // Jointure des centroïdes IRIS et des données de consommation
  Promise.all([
    getCachedResponse(centro_iris),
    getCachedResponse(conso_ok)
  ])
    .then(([CentroIris, ConsoObs]) => {
      const consoByIris = {};
      ConsoObs.forEach((entry) => {
        const irisCode = entry.CODE_IRIS;
        const consoValue = entry.CONSO;
        const climatValue = entry.CLIMAT;
        if (climatValue === "Non") {
          if (!consoByIris[irisCode]) {
            consoByIris[irisCode] = 0;
          }
          consoByIris[irisCode] += consoValue;
        }
      });

      ConsoObs = ConsoObs.filter((entry) => entry.CLIMAT === "Non");
      IrisSums = calculateIrisSums(ConsoObs);
      CentroIris.features.forEach((feature) => {
        const irisCode = feature.properties.CODE_IRIS;
        if (IrisSums.hasOwnProperty(irisCode)) {
          feature.properties.CONSO = IrisSums[irisCode];
        }
      });

      const consoValues = Object.values(IrisSums).filter((conso) => conso !== 0);
      quantiles = calculateQuantiles(consoValues, 5);
      radiusStopsIRIS = getRadiusStops(quantiles);

      map.on("load", function () {
        if (!map.getSource("centro_iris")) {
          map.addSource("centro_iris", {
            type: "geojson",
            data: CentroIris,
          });
        }

        if (!map.getLayer("CENTRO_IRIS")) {
          map.addLayer({
            id: "CENTRO_IRIS",
            type: "circle",
            source: "centro_iris",
            paint: {
              "circle-radius": {
                property: "CONSO",
                type: "exponential",
                stops: radiusStopsIRIS,
              },
              "circle-color": "#ffffff",
              "circle-opacity": 1,
            },
            layout: {
              visibility: "none",
            },
          });
        }
      });
    });
}

// Appel de chargement de la carte à la fin
window.addEventListener("DOMContentLoaded", initializeMap)