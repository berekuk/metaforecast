/* Imports */
import axios from "axios";
import { databaseUpsert } from "../database/database-wrapper.js";
import { calculateStars } from "../utils/stars.js";

/* Definitions */
let htmlEndPointEntrance = "https://api.smarkets.com/v3/events/";
let VERBOSE = false;
let empty = (x) => x;
/* Support functions */

async function fetchEvents(url) {
  let response = await axios({
    url: htmlEndPointEntrance + url,
    method: "GET",
    headers: {
      "Content-Type": "text/html",
    },
  }).then((res) => res.data);
  VERBOSE ? console.log(response) : empty();
  return response;
}

async function fetchMarkets(eventid) {
  let response = await axios({
    url: `https://api.smarkets.com/v3/events/${eventid}/markets/`,
    method: "GET",
    headers: {
      "Content-Type": "text/json",
    },
  })
    .then((res) => res.data)
    .then((res) => res.markets);
  return response;
}

async function fetchContracts(marketid) {
  let response = await axios({
    url: `https://api.smarkets.com/v3/markets/${marketid}/contracts/`,
    method: "GET",
    headers: {
      "Content-Type": "text/html",
    },
  }).then((res) => res.data);
  VERBOSE ? console.log(response) : empty();
  return response;
}

async function fetchPrices(marketid) {
  let response = await axios({
    url: `https://api.smarkets.com/v3/markets/${marketid}/last_executed_prices/`,
    method: "GET",
    headers: {
      "Content-Type": "text/html",
    },
  }).then((res) => res.data);
  VERBOSE ? console.log(response) : empty();
  return response;
}

/* Body */

export async function smarkets() {
  let htmlPath =
    "?state=new&state=upcoming&state=live&type_domain=politics&type_scope=single_event&with_new_type=true&sort=id&limit=50";

  let events = [];
  while (htmlPath) {
    let data = await fetchEvents(htmlPath);
    events.push(...data.events);
    htmlPath = data.pagination.next_page;
  }
  VERBOSE ? console.log(events) : empty();
  let markets = [];
  for (let event of events) {
    VERBOSE ? console.log(Date.now()) : empty();
    VERBOSE ? console.log(event.name) : empty();
    let eventMarkets = await fetchMarkets(event.id);
    eventMarkets = eventMarkets.map((market) => ({
      ...market,
      slug: event.full_slug,
    }));
    VERBOSE ? console.log("Markets fetched") : empty();
    VERBOSE ? console.log(event.id) : empty();
    VERBOSE ? console.log(market) : empty();
    markets.push(...eventMarkets);
    //let lastPrices = await fetchPrices(market.id)
  }
  VERBOSE ? console.log(markets) : empty();

  let results = [];
  for (let market of markets) {
    VERBOSE ? console.log("================") : empty();
    VERBOSE ? console.log("Market: ", market) : empty();
    let id = `smarkets-${market.id}`;
    let name = market.name;

    let contracts = await fetchContracts(market.id);
    VERBOSE ? console.log("Contracts: ", contracts) : empty();
    let prices = await fetchPrices(market.id);
    VERBOSE
      ? console.log("Prices: ", prices["last_executed_prices"][market.id])
      : empty();

    let options = {};
    for (let contract of contracts["contracts"]) {
      options[contract.id] = { name: contract.name };
    }
    for (let price of prices["last_executed_prices"][market.id]) {
      options[price.contract_id] = {
        ...options[price.contract_id],
        probability: price.last_executed_price
          ? Number(price.last_executed_price)
          : null,
        type: "PROBABILITY",
      };
    }
    options = Object.values(options);
    // monkey patch the case where there are only two options and only one has traded.
    if (
      options.length == 2 &&
      options.map((option) => option.probability).includes(null)
    ) {
      let nonNullPrice =
        option[0].probability == null
          ? option[1].probability
          : option[0].probability;
      options = options.map((option) => {
        let probability = option.probability;
        return {
          ...option,
          probability: probability == null ? 100 - nonNullPrice : probability,
          // yes, 100, because prices are not yet normalized.
        };
      });
    }

    // Normalize normally
    let totalValue = options
      .map((element) => Number(element.probability))
      .reduce((a, b) => a + b, 0);

    options = options.map((element) => ({
      ...element,
      probability: Number(element.probability) / totalValue,
    }));
    VERBOSE ? console.log(options) : empty();

    /*
    if(contracts["contracts"].length == 2){
      isBinary = true
      percentage = ( Number(prices["last_executed_prices"][market.id][0].last_executed_price) + (100 - Number(prices["last_executed_prices"][market.id][1].last_executed_price)) ) / 2
      percentage = Math.round(percentage)+"%"
      let contractName = contracts["contracts"][0].name
      name = name+ (contractName=="Yes"?'':` (${contracts["contracts"][0].name})`)
    }
    */
    let result = {
      id: id,
      title: name,
      url: "https://smarkets.com/event/" + market.event_id + market.slug,
      platform: "Smarkets",
      description: market.description,
      options: options,
      timestamp: new Date().toISOString(),
      qualityindicators: {
        stars: calculateStars("Smarkets", {}),
      },
    };
    VERBOSE ? console.log(result) : empty();
    results.push(result);
  }
  VERBOSE ? console.log(results) : empty();

  await databaseUpsert({ contents: results, group: "smarkets" });
  VERBOSE ? console.log(JSON.stringify(results, null, 4)) : empty();
  VERBOSE ? console.dir(results, { depth: null }) : empty();
}
//smarkets()
