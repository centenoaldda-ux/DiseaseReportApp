
const StateCodeList = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT",
    "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
    "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
    "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

let searchCriteria = JSON.parse(localStorage.getItem("searchCriteria")) || {
    diseases: [],
    stateCode: "",
    zipcode: "",
    startDate: "",
    endDate: ""
};

let currentStateCode = searchCriteria.stateCode || "";
let currentZipcode = searchCriteria.zipcode || "";


const menuToggle = document.getElementById("menu-toggle");
const menuLinks = document.getElementById("menu-links");

menuToggle.addEventListener("click", function () {
    menuLinks.hidden = !menuLinks.hidden;

    menuToggle.setAttribute(
        "aria-expanded",
        !menuLinks.hidden
    );
});

const locationPanel = document.getElementById("location-panel");
const filtersPanel = document.getElementById("filters-panel");

const locationToggle = document.getElementById("location-toggle");
const filtersToggle = document.getElementById("filters-toggle");


function closePanels() {
    locationPanel.classList.remove("open");
    filtersPanel.classList.remove("open");

    locationToggle.textContent = ">";
    filtersToggle.textContent = ">";

    locationToggle.setAttribute("aria-expanded", "false");
    filtersToggle.setAttribute("aria-expanded", "false");

    locationToggle.setAttribute("aria-label", "Open location search");
    filtersToggle.setAttribute("aria-label", "Open search filters");
}

locationToggle.addEventListener("click", function () {
    const isOpen = locationPanel.classList.contains("open");

    closePanels();

    if (!isOpen) {
        locationPanel.classList.add("open");
        locationToggle.textContent = "<";
        locationToggle.setAttribute("aria-expanded", "true");
        locationToggle.setAttribute("aria-label", "Close location search");
    }
});

filtersToggle.addEventListener("click", function () {
    const isOpen = filtersPanel.classList.contains("open");

    closePanels();

    if (!isOpen) {
        filtersPanel.classList.add("open");
        filtersToggle.textContent = "<";
        filtersToggle.setAttribute("aria-expanded", "true");
        filtersToggle.setAttribute("aria-label", "Close search filters");
    }
});

const openSearchForm = document.getElementById("open-search-form");

if (openSearchForm) {
    openSearchForm.addEventListener("click", function (event) {
        event.preventDefault();

        closePanels();

        filtersPanel.classList.add("open");
        filtersToggle.textContent = "<";
        filtersToggle.setAttribute("aria-expanded", "true");
        filtersToggle.setAttribute("aria-label", "Close search filters");

        menuLinks.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
    });
}


const map = L.map("map").setView([37.5407, -77.4360], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


const markers = L.markerClusterGroup();
map.addLayer(markers);

function displayReports() {
    markers.clearLayers();
    const reports = JSON.parse(localStorage.getItem("diseaseReports")) || [];

    const matchingReports = reports.filter(function (report) {

        const diseaseMatches =
            searchCriteria.diseases.length === 0 ||
            searchCriteria.diseases.includes(report.diseaseType);


        const stateMatches =
            !searchCriteria.stateCode ||
            report.stateCode === searchCriteria.stateCode;


        const zipcodeMatches =
            !searchCriteria.zipcode ||
            String(report.zipcode) === String(searchCriteria.zipcode);

        const startDateMatches =
            !searchCriteria.startDate ||
            report.date >= searchCriteria.startDate;


        const endDateMatches =
            !searchCriteria.endDate ||
            report.date <= searchCriteria.endDate;

        return diseaseMatches &&
            stateMatches &&
            zipcodeMatches &&
            startDateMatches &&
            endDateMatches;
    });

    matchingReports.forEach(function (report) {

        const latitude = Number(report.latitude);
        const longitude = Number(report.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }
        const marker = L.marker([latitude, longitude]);

        marker.bindPopup(`
            <b>Disease:</b> ${report.diseaseName || report.diseaseType}<br>
            <b>State:</b> ${report.stateCode}<br>
            <b>Zipcode:</b> ${report.zipcode}<br>
            <b>Date:</b> ${report.date}<br>
            <b>Experience:</b> ${report.experience || "No description provided"}
        `);

        markers.addLayer(marker);
    });
}


async function getZipcodeLocation(zipcode, stateCode) {

    try {
        const response = await fetch(
            `https://api.zippopotam.us/us/${zipcode}`
        );

        if (!response.ok) {
            alert("ZIP code not found. Please try again.");
            return null;
        }

        const data = await response.json();

        const place = data.places[0];

        const zipState = place["state abbreviation"];
        if (zipState !== stateCode) {
            alert("The ZIP code does not belong to the selected state.");
            return null;
        }

        return {
            latitude: Number(place.latitude),
            longitude: Number(place.longitude)
        };

    } catch (error) {
        console.error("Error finding ZIP code location:", error);
        alert("Unable to find the location. Please try again.");
        return null;
    }
}


const newStateInput = document.getElementById("new-state");
const newZipcodeInput = document.getElementById("new-zipcode");
const searchZipcodeButton = document.getElementById("search-zipcode");

searchZipcodeButton.addEventListener("click", async function () {

    const newState = newStateInput.value.trim().toUpperCase();
    const newZipcode = newZipcodeInput.value.trim();

    if (!StateCodeList.includes(newState)) {
        alert("Please enter a valid state abbreviation.");
        return;
    }

    if (!/^\d{5}$/.test(newZipcode)) {
        alert("Please enter a valid ZIP code.");
        return;
    }

    const location = await getZipcodeLocation(newZipcode, newState);

    if (location === null) {
        return;
    }

    currentStateCode = newState;
    currentZipcode = newZipcode;

    searchCriteria.stateCode = newState;
    searchCriteria.zipcode = newZipcode;

    localStorage.setItem(
        "searchCriteria",
        JSON.stringify(searchCriteria)
    );

    document.getElementById("StateCode").value = newState;
    document.getElementById("zipcode").value = newZipcode;

    map.setView(
        [location.latitude, location.longitude],
        12
    );

    displayReports();

    closePanels();
});



const searchForm = document.getElementById("search-form");

searchForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const selectedDiseases = [];

    document.querySelectorAll(
        'input[name="disease-type"]:checked'
    ).forEach(function (checkbox) {
        selectedDiseases.push(checkbox.value);
    });

    const stateCode = document.getElementById("StateCode").value
        .trim()
        .toUpperCase();

    const zipcode = document.getElementById("zipcode").value.trim();

    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;


    if (selectedDiseases.length === 0) {
        alert("Please select a disease.");
        return;
    }

    if (!StateCodeList.includes(stateCode)) {
        alert("Please enter a valid state abbreviation.");
        return;
    }

    if (!/^\d{5}$/.test(zipcode)) {
        alert("Please enter a valid ZIP code.");
        return;
    }

    if (startDate && endDate && startDate > endDate) {
        alert("The start date cannot be after the end date.");
        return;
    }

    const location = await getZipcodeLocation(zipcode, stateCode);

    if (location === null) {
        return;
    }

    searchCriteria = {
        diseases: selectedDiseases,
        stateCode: stateCode,
        zipcode: zipcode,
        startDate: startDate,
        endDate: endDate
    };

    localStorage.setItem(
        "searchCriteria",
        JSON.stringify(searchCriteria)
    );

    currentStateCode = stateCode;
    currentZipcode = zipcode;

    newStateInput.value = stateCode;
    newZipcodeInput.value = zipcode;

    map.setView(
        [location.latitude, location.longitude],
        12
    );

    displayReports();

    closePanels();
});


function loadPreviousSearch() {


    document.getElementById("StateCode").value =
        searchCriteria.stateCode || "";

    document.getElementById("zipcode").value =
        searchCriteria.zipcode || "";


    document.getElementById("start-date").value =
        searchCriteria.startDate || "";

    document.getElementById("end-date").value =
        searchCriteria.endDate || "";


    document.querySelectorAll(
        'input[name="disease-type"]'
    ).forEach(function (checkbox) {

        checkbox.checked =
            searchCriteria.diseases.includes(checkbox.value);
    });

    newStateInput.value = currentStateCode;
    newZipcodeInput.value = currentZipcode;
}


async function initializeMap() {
    loadPreviousSearch();

    displayReports();

    if (currentStateCode && currentZipcode) {

        const location = await getZipcodeLocation(
            currentZipcode,
            currentStateCode
        );

        if (location !== null) {
            map.setView(
                [location.latitude, location.longitude],
                12
            );
        }
    }
}

initializeMap();
