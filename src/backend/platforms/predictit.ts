import axios from "axios";

import { calculateStars } from "../utils/stars";
import toMarkdown from "../utils/toMarkdown";
import { Platform } from "./";

const platformName = "predictit";

/* Support functions */
async function fetchmarkets() {
  let response = await axios({
    method: "get",
    url: "https://www.predictit.org/api/marketdata/all/",
  });
  let openMarkets = response.data.markets.filter(
    (market) => market.status == "Open"
  );
  return openMarkets;
}

async function fetchmarketrules(market_id) {
  let response = await axios({
    method: "get",
    url: "https://www.predictit.org/api/Market/" + market_id,
  });
  return response.data.rule;
}

async function fetchmarketvolumes() {
  let response = await axios({
    method: "get",
    url: "https://predictit-f497e.firebaseio.com/marketStats.json",
  });
  return response.data;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Body */
export const predictit: Platform = {
  name: platformName,
  label: "PredictIt",
  color: "#460c00",
  async fetcher() {
    let markets = await fetchmarkets();
    let marketVolumes = await fetchmarketvolumes();

    markets = markets.map((market) => ({
      ...market,
      TotalSharesTraded: marketVolumes[market.id]["TotalSharesTraded"],
    }));
    // console.log(markets)

    let results = [];
    for (let market of markets) {
      // console.log(market.name)
      let id = `${platformName}-${market.id}`;
      let isbinary = market.contracts.length == 1;
      await sleep(3000 * (1 + Math.random()));
      let descriptionraw = await fetchmarketrules(market.id);
      let descriptionprocessed1 = toMarkdown(descriptionraw);
      let description = descriptionprocessed1;
      let shares_volume = market["TotalSharesTraded"];
      // let percentageFormatted = isbinary ? Number(Number(market.contracts[0].lastTradePrice) * 100).toFixed(0) + "%" : "none"

      let options = market.contracts.map((contract) => ({
        name: contract.name,
        probability: contract.lastTradePrice,
        type: "PROBABILITY",
      }));
      let totalValue = options
        .map((element) => Number(element.probability))
        .reduce((a, b) => a + b, 0);

      if (options.length != 1 && totalValue > 1) {
        options = options.map((element) => ({
          ...element,
          probability: Number(element.probability) / totalValue,
        }));
      } else if (options.length == 1) {
        let option = options[0];
        let probability = option["probability"];
        options = [
          {
            name: "Yes",
            probability: probability,
            type: "PROBABILITY",
          },
          {
            name: "No",
            probability: 1 - probability,
            type: "PROBABILITY",
          },
        ];
      }

      let obj = {
        id: id,
        title: market["name"],
        url: market.url,
        platform: platformName,
        description: description,
        options: options,
        timestamp: new Date().toISOString(),
        qualityindicators: {
          stars: calculateStars(platformName, {}),
          shares_volume: shares_volume,
        },
      };
      // console.log(obj)
      results.push(obj);
    }

    return results;
  },
};
