/* Imports */
import axios from "axios";
import { Tabletojson } from "tabletojson";
import tunnel from "tunnel";

import { hash } from "../utils/hash";
import { calculateStars } from "../utils/stars";
import { Platform } from "./";

/* Definitions */
const platformName = "goodjudgment";
let endpoint = "https://goodjudgment.io/superforecasts/";
String.prototype.replaceAll = function replaceAll(search, replace) {
  return this.split(search).join(replace);
};

/* Body */
export const goodjudgment: Platform = {
  name: platformName,
  label: "Good Judgment",
  color: "#7d4f1b",
  async fetcher() {
    // Proxy fuckery
    let proxy;
    /*
	 * try {
    proxy = await axios
      .get("http://pubproxy.com/api/proxy")
      .then((query) => query.data);
    console.log(proxy);
  } catch (error) {
    console.log("Proxy generation failed; using backup proxy instead");
    // hard-coded backup proxy
		*/
    proxy = {
      ip: process.env.BACKUP_PROXY_IP,
      port: process.env.BACKUP_PROXY_PORT,
    };
    // }
    let agent = tunnel.httpsOverHttp({
      proxy: {
        host: proxy.ip,
        port: proxy.port,
      },
    });

    let content = await axios
      .request({
        url: "https://goodjudgment.io/superforecasts/",
        method: "get",
        headers: {
          "User-Agent": "Chrome",
        },
        // agent,
        // port: 80,
      })
      .then((query) => query.data);

    // Processing
    let results = [];
    let jsonTable = Tabletojson.convert(content, { stripHtmlFromCells: false });
    jsonTable.shift(); // deletes first element
    jsonTable.pop(); // deletes last element
    // console.log(jsonTable)
    for (let table of jsonTable) {
      // console.log(table)
      let title = table[0]["0"].split("\t\t\t").splice(3)[0];
      if (title != undefined) {
        title = title.replaceAll("</a>", "");
        let id = `${platformName}-${hash(title)}`;
        let description = table
          .filter((row) => row["0"].includes("BACKGROUND:"))
          .map((row) => row["0"])
          .map((text) =>
            text
              .split("BACKGROUND:")[1]
              .split("Examples of Superforecaster")[0]
              .split("AT A GLANCE")[0]
              .replaceAll("\n\n", "\n")
              .split("\n")
              .slice(3)
              .join(" ")
              .replaceAll("      ", "")
              .replaceAll("<br> ", "")
          )[0];
        let options = table
          .filter((row) => "4" in row)
          .map((row) => ({
            name: row["2"]
              .split('<span class="qTitle">')[1]
              .replace("</span>", ""),
            probability: Number(row["3"].split("%")[0]) / 100,
            type: "PROBABILITY",
          }));
        let analysis = table.filter((row) =>
          row[0] ? row[0].toLowerCase().includes("commentary") : false
        );
        // "Examples of Superforecaster Commentary" / Analysis
        // The following is necessary twice, because we want to check if there is an empty list, and then get the first element of the first element of the list.
        analysis = analysis ? analysis[0] : "";
        analysis = analysis ? analysis[0] : ""; // not a duplicate
        // console.log(analysis)
        let standardObj = {
          id: id,
          title: title,
          url: endpoint,
          platform: platformName,
          description: description,
          options: options,
          timestamp: new Date().toISOString(),
          qualityindicators: {
            stars: calculateStars(platformName, {}),
          },
          extra: {
            superforecastercommentary: analysis || "",
          },
        };
        results.push(standardObj);
      }
    }

    console.log(
      "Failing is not unexpected; see utils/pullSuperforecastsManually.sh/js"
    );

    return results;
  },
};
