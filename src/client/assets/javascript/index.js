// PROVIDED CODE BELOW (LINES 1 - 80) DO NOT REMOVE

// The store will hold all information needed globally
let store = {
  track_id: undefined,
  player_id: undefined,
  race_id: undefined,
};

// We need our javascript to wait until the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  onPageLoad();
  setupClickHandlers();
});

function enableButtonElement(elem) {
  elem.classList.remove("disabled");
  elem.removeAttribute("disabled");
}

function rejectedAfterTime(timeLimit) {
  return new Promise((res, rej) => {
    window.setTimeout(rej, timeLimit, "API call took too long");
  });
}

function getErrorMessageMarkup(message) {
  return `<h2>An Error has Occurred!</h2><p>${message}<p>`;
}

async function onPageLoad() {
  const allowApiThisTime = 3000;
  const apiTimeoutMsg =
    "Sorry, the API took too long to respond. Please reload the page and try again.";
  try {
    // Creating timeout, so that app fails if API takes too long to respons for track and race calls
    const timeOut = rejectedAfterTime(allowApiThisTime);
    const tracks = getTracks();
    const racers = getRacers();
    Promise.race([tracks, timeOut])
      .then((tracks) => {
        const trackHtml = renderTrackCards(tracks);
        renderAt("#tracks", trackHtml);
      })
      .catch((err) => {
        renderAt("#create-race", getErrorMessageMarkup(apiTimeoutMsg));
      });

    Promise.race([racers, timeOut])
      .then((raceCars) => {
        const racerHtml = renderRacerCars(raceCars);
        renderAt("#racers", racerHtml);
        enableButtonElement(
          window.document.getElementById("submit-create-race")
        );
      })
      .catch((err) => {
        renderAt("#create-race", getErrorMessageMarkup(apiTimeoutMsg));
      });
  } catch (error) {
    renderAt(
      "#create-race",
      getErrorMessageMarkup(
        "Sorry, something went wrong: please reload the page and try again."
      )
    );
  }
}

function setupClickHandlers() {
  document.addEventListener(
    "click",
    (event) => {
      const { target } = event;

      // Race track form field
      if (target.matches(".card.track")) {
        handleSelectTrack(target);
      } else if (target.parentNode.matches(".card.track")) {
        handleSelectTrack(target.parentNode);
      }

      // Podracer form field
      if (target.matches(".card.podracer")) {
        handleSelectPodRacer(target);
      } else if (target.parentNode.matches(".card.podracer")) {
        handleSelectPodRacer(target.parentNode);
      }

      // Submit create race form
      if (target.matches("#submit-create-race")) {
        event.preventDefault();

        // start race
        handleCreateRace();
      }

      // Handle acceleration click
      if (target.matches("#gas-peddle")) {
        handleAccelerate(target);
      }
    },
    false
  );
}

async function delay(ms) {
  try {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  } catch (error) {
    console.log("an error shouldn't be possible here, in delay", error);
  }
}
// ^ PROVIDED CODE ^ DO NOT REMOVE

// This async function controls the flow of the race, add the logic and error handling
async function handleCreateRace() {
  // render starting UI
  // Get player_id and track_id from the store
  const { track_id, player_id } = store;
  if(!track_id || !player_id) {
    alert(`Please select track and racer to start the race!`);
    return;
  }
  
  try {
    // const race = invoke the API call to create the race, then save the result
    const race = await createRace(track_id, player_id);
    renderAt("#race", renderRaceStartView(race.Track, race.Cars));
    // race IDs are zero indexed on API backend, but start at 
    store.race_id = window.parseInt(race.ID) - 1;
    await runCountdown();
    await startRace(store.race_id);
    await runRace(store.race_id);
  } catch (err) {
    console.error("error eith creating a race", err);
    renderAt("#race", getErrorMessageMarkup('There was an error in creating the race: please reload and try again.'));
  }
}

function runRace(raceID) {
  return new Promise((resolve) => {
    // use Javascript's built in setInterval method to get race info every 500ms
    const getRaceInfo = window.setInterval(async () => {
      try {
        const res = await getRace(raceID);
        if (res.status === "in-progress") {
          renderAt("#leaderBoard", raceProgress(res.positions));
        }
        if (res.status === "finished") {
          clearInterval(getRaceInfo); // to stop the interval from repeating
          renderAt("#race", resultsView(res.positions)); // to render the results view
          resolve(res); // resolve the promise
        }
      } catch(err) {
        console.log('An error happened in the async interval of runRace: ', err);
      }
    }, 500);
  }).catch((err) => {
    console.log("An error happened in runRace: ", err);
  });
}

async function runCountdown() {
  try {
    // wait for the DOM to load
    await delay(1000);
    let timer = 3;

    return new Promise((resolve) => {
      // use Javascript's built in setInterval method to count down once per second
      const intervalTimer = window.setInterval(() => {
        // run this DOM manipulation to decrement the countdown for the user
        document.getElementById("big-numbers").innerHTML = --timer;

        // if the countdown is done, clear the interval, resolve the promise, and return
        if (timer === 0) {
          window.clearInterval(intervalTimer);
          resolve();
        }
      }, 1000);
    });
  } catch (error) {
    console.log("Error in runCountdown: ", error);
  }
}

function handleSelectPodRacer(target) {
  // remove class selected from all racer options
  const selected = document.querySelector("#racers .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  // add class selected to current target
  target.classList.add("selected");

  store["player_id"] = window.parseInt(target.id);
}

function handleSelectTrack(target) {
  // remove class selected from all track options
  const selected = document.querySelector("#tracks .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  // add class selected to current target
  target.classList.add("selected");
  const trackName = window.document.querySelector("#tracks .selected h3")
    .textContent;

  store["track_id"] = window.parseInt(target.id);
  store["track_name"] = trackName;
}

function handleAccelerate() {
  // Expects RACE ID
  accelerate(store.race_id).catch(err => {
    console.log('Error in handleAccelerate: ', err);
    renderAt("#race", getErrorMessageMarkup('Problem with gas pedal! Please reload the race.'));
  });
}

// HTML VIEWS ------------------------------------------------
// Provided code - do not remove

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
			<h4>Loading Racers...</4>
		`;
  }

  const results = racers.map(renderRacerCard).join("");

  return `${results}`;
}

function renderRacerCard(racer) {
  const { id, driver_name, top_speed, acceleration, handling } = racer;

  return `
		<li class="card podracer" id="${id}">
			<h3>Driver: ${driver_name}</h3>
			<p>Top Speed: ${top_speed}</p>
			<p>Acceleration: ${acceleration}</p>
			<p>Handling: ${handling}</p>
		</li>
	`;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
			<h4>Loading Tracks...</4>
		`;
  }

  const results = tracks.map(renderTrackCard).join("");

  return `${results}`;
}

function renderTrackCard(track) {
  const { id, name } = track;

  return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`;
}

function renderCountdown(count) {
  return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(trackName, racers) {
  return `
		<header>
			<h1>Race: ${trackName}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function resultsView(positions) {
  positions.sort((a, b) => (a.final_position > b.final_position ? 1 : -1));

  return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`;
}

function raceProgress(positions) {
  const userPlayer = positions.find(
    (e) => window.parseInt(e.id) === window.parseInt(store.player_id)
  );
  userPlayer.driver_name += " (you)";

  positions = positions.sort((a, b) => (a.segment > b.segment ? -1 : 1));
  let count = 1;

  const results = positions.map(
    (p) => `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`
  ).join("");

  return `
		<main>
			<h3>Leaderboard</h3>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`;
}

function renderAt(element, html) {
  const node = document.querySelector(element);

  node.innerHTML = html;
}

// ^ Provided code ^ do not remove

// API CALLS ------------------------------------------------

const SERVER = "http://localhost:8000";

function defaultFetchOpts() {
  return {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": SERVER,
    },
  };
}

// TODO - Make a fetch call (with error handling!) to each of the following API endpoints

function getTracks() {
  // GET request to `${SERVER}/api/tracks`
  return fetch(`${SERVER}/api/tracks`)
    .then((response) => response.json())
    .catch((err) => console.log("Problem with getTracks request::", err));
}

function getRacers() {
  // GET request to `${SERVER}/api/cars`
  return fetch(`${SERVER}/api/cars`)
    .then((response) => response.json())
    .catch((err) => console.log("Problem with getRacers request::", err));
}

function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };

  return fetch(`${SERVER}/api/races`, {
    method: "POST",
    ...defaultFetchOpts(),
    dataType: "jsonp",
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .catch((err) => console.log("Problem with createRace request::", err));
}

function getRace(id) {
  // GET request to `${SERVER}/api/races/${id}`
  return fetch(`${SERVER}/api/races/${id}`)
    .then((data) => data.json())
    .then((race) => race)
    .catch((err) => console.log("Problem with getRace ", err));
}

function startRace(id) {
  return fetch(`${SERVER}/api/races/${id}/start`, {
    method: "POST",
    ...defaultFetchOpts(),
  }).catch((err) => console.log("Problem with startRace request::", err));
}

function accelerate(raceId) {
  // POST request to `${SERVER}/api/races/${id}/accelerate`
  // options parameter provided as defaultFetchOpts
  // no body or datatype needed for this request
  return fetch(`${SERVER}/api/races/${raceId}/accelerate`, {
    method: "POST",
    ...defaultFetchOpts(),
  }).catch((err) => console.log("Problem with accelerate request::", err));
}