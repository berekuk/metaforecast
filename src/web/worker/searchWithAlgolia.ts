import algoliasearch from "algoliasearch";

import { FrontendForecast } from "../platforms";

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
);
const index = client.initIndex("metaforecast");

let buildFilter = ({
  starsThreshold,
  filterByPlatforms,
  forecastsThreshold,
}) => {
  let starsFilter = starsThreshold
    ? `qualityindicators.stars >= ${starsThreshold}`
    : null;
  let platformsFilter = filterByPlatforms
    ? filterByPlatforms.map((platform) => `platform:"${platform}"`).join(" OR ")
    : null;
  console.log(platformsFilter);
  // let numForecastsFilter = forecastsThreshold ? `has_numforecasts:true AND qualityindicators.numforecasts >= ${forecastsThreshold}` : null
  let numForecastsFilter =
    forecastsThreshold > 0
      ? `qualityindicators.numforecasts >= ${forecastsThreshold}`
      : null;
  let finalFilter = [starsFilter, platformsFilter, numForecastsFilter]
    .filter((f) => f != null)
    .map((f) => `( ${f} )`)
    .join(" AND ");
  console.log(
    "searchWithAlgolia.js/searchWithAlgolia/buildFilter",
    finalFilter
  );
  return finalFilter;
};

let buildFacetFilter = ({ filterByPlatforms }) => {
  let platformsFilter = [];
  if (filterByPlatforms.length > 0) {
    platformsFilter = [
      [filterByPlatforms.map((platform) => `platform:${platform}`)],
    ];
  }
  console.log(platformsFilter);
  console.log(
    "searchWithAlgolia.js/searchWithAlgolia/buildFacetFilter",
    platformsFilter
  );
  return platformsFilter;
};

let normalizeArray = (array) => {
  if (array.length == 0) {
    return [];
  }
  let mean = array.reduce((a, b) => a + b) / array.length;
  let sd = Math.sqrt(
    array.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b)
  );
  let normalizedArray = array.map((result) => (result - sd) / mean);
  return normalizedArray;
};

let noExactMatch = (queryString, result) => {
  queryString = queryString.toLowerCase();
  let title = result.title.toLowerCase();
  let description = result.description.toLowerCase();
  let optionsstringforsearch = result.optionsstringforsearch.toLowerCase();
  return !(
    title.includes(queryString) ||
    description.includes(queryString) ||
    optionsstringforsearch.includes(queryString)
  );
};

// only query string
export default async function searchWithAlgolia({
  queryString,
  hitsPerPage = 5,
  starsThreshold,
  filterByPlatforms,
  forecastsThreshold,
}): Promise<FrontendForecast[]> {
  let response = await index.search<FrontendForecast>(queryString, {
    hitsPerPage,
    filters: buildFilter({
      starsThreshold,
      forecastsThreshold,
      filterByPlatforms,
    }),
    //facetFilters: buildFacetFilter({filterByPlatforms}),
    getRankingInfo: true,
  });
  let results: FrontendForecast[] = response.hits;

  let recursionError = ["metaforecast", "metaforecasts", "metaforecasting"];
  if (
    (!results || results.length == 0) &&
    !recursionError.includes(queryString.toLowerCase())
  ) {
    results = [
      {
        id: "not-found",
        title: "No search results match your query",
        url: "https://metaforecast.org",
        platform: "metaforecast",
        platformLabel: "Metaforecast",
        description: "Maybe try a broader query?",
        options: [
          {
            name: "Yes",
            probability: 0.995,
            type: "PROBABILITY",
          },
          {
            name: "No",
            probability: 0.005,
            type: "PROBABILITY",
          },
        ],
        timestamp: `${new Date().toISOString().slice(0, 10)}`,
        qualityindicators: {
          numforecasts: 1,
          numforecasters: 1,
          stars: 5,
        },
        // noExactSearchResults: true,
        // optionsstringforsearch: "Yes, No",
        // has_numforecasts: true,
      },
    ];
  } else if (recursionError.includes(queryString.toLowerCase())) {
    results = [
      {
        id: "recursion-error",
        title: `Did you mean: ${queryString}?`,
        url: "https://metaforecast.org/recursion?bypassEasterEgg=true",
        platform: "metaforecast",
        platformLabel: "Metaforecast",
        description:
          "Fatal error: Too much recursion. Click to proceed anyways",
        options: [
          {
            name: "Yes",
            probability: 0.995,
            type: "PROBABILITY",
          },
          {
            name: "No",
            probability: 0.005,
            type: "PROBABILITY",
          },
        ],
        timestamp: `${new Date().toISOString().slice(0, 10)}`,
        qualityindicators: {
          numforecasts: 1,
          numforecasters: 1,
          stars: 5,
        },
        // noExactSearchResults: true,
        // optionsstringforsearch: "Yes, No",
        // has_numforecasts: true,
      },
      ...results,
    ];
  } else if (
    queryString &&
    queryString.split(" ").length == 1 &&
    noExactMatch(queryString, results[0])
  ) {
    results.unshift({
      id: "not-found-2",
      title: "No search results appear to match your query",
      url: "https://metaforecast.org",
      platform: "metaforecast",
      platformLabel: "Metaforecast",
      description: "Maybe try a broader query? That said, we could be wrong.",
      options: [
        {
          name: "Yes",
          probability: 0.65,
          type: "PROBABILITY",
        },
        {
          name: "No",
          probability: 0.35,
          type: "PROBABILITY",
        },
      ],
      timestamp: `${new Date().toISOString().slice(0, 10)}`,
      qualityindicators: {
        numforecasts: 1,
        numforecasters: 1,
        stars: 1,
      },
      // noExactSearchResults: true,
      // optionsstringforsearch: "Yes, No",
      // has_numforecasts: true,
    });
  } else {
    // results[0].noExactSearchResults = false;
  }

  return results;
}
// Examples:
// searchWithAlgolia({queryString: "Life"}, () => null)
// searchWithAlgolia({queryString: "Life", forecastsThreshold: 100}, () => null)
// searchWithAlgolia({queryString: "Life", forecastsThreshold: 100, starsThreshold: 4}, () => null)
// searchWithAlgolia({queryString: "Life", forecastsThreshold: 100, starsThreshold: 3, filterByPlatforms: ["Metaculus", "PolyMarket"]}, () => null)
