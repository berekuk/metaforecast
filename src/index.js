/* Imports */
import { Parser, transforms } from 'json2csv'
import fs from 'fs'
import readline from "readline"

import {csetforetell} from "./csetforetell-fetch.js"
import {elicit} from "./elicit-fetch.js"
import {estimize} from "./estimize-fetch.js"
import {fantasyscotus} from "./fantasyscotus-fetch.js"
import {foretold} from "./foretold-fetch.js"
import {goodjudgment} from "./goodjudgment-fetch.js"
import {goodjudgmentopen} from "./goodjudmentopen-fetch.js"
import {hypermind} from "./hypermind-fetch.js"
import {ladbrokes} from "./ladbrokes-fetch.js"
import {metaculus} from "./metaculus-fetch.js"
import {polymarket} from "./polymarket-fetch.js"
import {predictit} from "./predictit-fetch.js"
import {omen} from "./omen-fetch.js"
import {smarkets} from "./smarkets-fetch.js"
import {williamhill} from "./williamhill-fetch.js"

/* Definitions */
let opts = {}
let json2csvParser = new Parser({ transforms:  [transforms.flatten()]});
let sets = ["csetforetell", "elicit", "estimize", "fantasyscotus", "foretold", "givewellopenphil", "goodjudgment","goodjudmentopen", "hypermind", "ladbrokes", "metaculus", "polymarket", "predictit", "omen", "smarkets", "williamhill", "xrisk"]

let suffix = "-questions"
let locationData = "./data/"
let sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* Support functions */
let getJSON = (set) => {
  let rawdata = fs.readFileSync(locationData + set + suffix + ".json")
  console.log(set)
  //console.log(rawdata)
  let data = JSON.parse(rawdata)
  return data
}
let csvfromjson = (json) => json2csvParser.parse(json)

let writefile = (data, set, suffix, filetype = ".csv") => {
  fs.writeFileSync(locationData + set + suffix + filetype, data)
}

let coverttocsvandmerge = async () => {
  let merged = []
  for(let set of sets){
    let json = getJSON(set)
    //let csv = csvfromjson(json)
    //writefile(csv, set, suffix)
    merged = merged.concat(json)
    //console.log(merged)
  }
  let mergedprocessed = merged.map(element => ({...element, optionsstringforsearch: element.options.map(option => option.name).join(", ")}))
  writefile(JSON.stringify(mergedprocessed, null, 2), "metaforecasts", "", ".json")
  
  /* Transform into a csv 
  let preparedforcsv = []
  mergedprocessed.forEach(element => {
    preparedforcsv.push({
        "title": element.title,
        "description": element.description?element.description.replaceAll("\n", " "):"",
        "optionsstringforsearch": element.optionsstringforsearch
    })
  } ) 
  //console.log(preparedforcsv)
  
  let mergedcsv = csvfromjson(preparedforcsv)
  writefile(mergedcsv, "metaforecasts", "")
  */

  console.log("Done")

}

let isEmptyArray = arr => arr.length == 0
let addtohistory = () => {
  console.log(new Date().toISOString())
  let currentJSONraw = fs.readFileSync(locationData + "metaforecasts.json")
  let currentJSON = JSON.parse(currentJSONraw)
  let historyJSONraw = fs.readFileSync(locationData + "metaforecasts_history.json")
  let historyJSON = JSON.parse(historyJSONraw)

  let currentForecastsWithAHistory = currentJSON.filter(element => !isEmptyArray(historyJSON.filter(historyElement => historyElement.title == element.title && historyElement.url == element.url )))
  // console.log(currentForecastsWithAHistory)

  let currentForecastsWithoutAHistory = currentJSON.filter(element => isEmptyArray(historyJSON.filter(historyElement => historyElement.title == element.title && historyElement.url == element.url )))
  // console.log(currentForecastsWithoutAHistory)
  
  // Add both types of forecast
  let newHistoryJSON = []
  for(let historyElement of historyJSON){
    let correspondingNewElement = currentForecastsWithAHistory.filter(element => historyElement.title == element.title && historyElement.url == element.url )
    let historyWithNewElement = historyElement["history"].concat({
      "timestamp": correspondingNewElement.timestamp,
      "options": correspondingNewElement.options,
      "qualityindicators": correspondingNewElement.qualityindicators
    })
    let newHistoryElement = {...historyElement, "history": historyWithNewElement}
    newHistoryJSON.push(newHistoryElement)
  }

  for(let currentForecast of currentForecastsWithoutAHistory){
    let newHistoryElement = ({...currentForecast, "history": [{
      "timestamp": currentForecast.timestamp,
      "options": currentForecast.options,
      "qualityindicators": currentForecast.qualityindicators
    }]})
    delete newHistoryElement.timestamp
    delete newHistoryElement.options
    delete newHistoryElement.qualityindicators
    newHistoryJSON.push(newHistoryElement)
  }

  console.log(newHistoryJSON)
  writefile(JSON.stringify(newHistoryJSON, null, 2), "metaforecasts_history", "", ".json")
  /*
  
  let forecastsAlreadyInHistory = currentJSON.filter(element => !isEmptyArray(historyJSON.filter(historyElement => historyElement.title == element.title && historyElement.url == element.url )))
  */
  console.log(new Date().toISOString())
}

async function whattodo(message,callback){
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(message, (answer) => {
    rl.close();
    callback(answer)
  });
}

let functions = [csetforetell, elicit, estimize, fantasyscotus,  foretold, goodjudgment, goodjudgmentopen, hypermind, ladbrokes, metaculus, polymarket, predictit, omen, smarkets, williamhill, coverttocsvandmerge, addtohistory]
let functionNames =  functions.map(fun => fun.name)// ["csetforetell", "elicit", "estimize", "fantasyscotus", /* "foretold", */ "goodjudgment", "goodjudgmentopen", "hypermind", "ladbrokes", "metaculus", "polymarket", "predictit", "omen", "smarkets", "williamhill", "coverttocsvandmerge"]
let whattodoMessage = functionNames
    .slice(0,functionNames.length-2)
    .map((functionName,i) => `[${i}]: Download predictions from ${functionName}`)
    .join('\n') +
  `\n[${functionNames.length-2}]: Merge jsons them into one big json` + 
  `\n[${functionNames.length-1}]: Add to history` + 
  `\n[${functionNames.length}]: All of the above` + 
  `\nChoose one option, wisely: #`

let tryCatchTryAgain = async (fun) => {
  try{
    console.log("Initial try")
    await fun()
  }catch (error) {
    console.log("Second try")
    console.log(error)
    await fun()
  }
}
  
let executeoption = async (option) => {
  option = Number(option)
  //console.log(functionNames[option])
  if(option < 0){
    console.log(`Error, ${option} < 0 or ${option} < 0`)
  }else if(option < functions.length){
    await tryCatchTryAgain(functions[option])
  } else if(option == functions.length){
    for(let fun of functions){
      console.log(fun.name)
      await tryCatchTryAgain(fun)
    }
  }
}

/* BODY */
let commandLineUtility  = () => {
  console.log(process.argv)
  if(process.argv.length==3){
      const option = process.argv[2] // e.g., npm start 15 <-
      const optionNum = Number(option)
      if(!isNaN(optionNum)){
        executeoption(optionNum)
      }else if(option == "all"){
        executeoption(functions.length) // 15 = execute all fetchers
      }else{
        whattodo(whattodoMessage, executeoption)
      }
  }else(
    whattodo(whattodoMessage, executeoption)
  )
}
commandLineUtility()
