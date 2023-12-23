const puppeteer = require('puppeteer');
const chalk = require('chalk');
const pdf = require('pdfkit');
const fs = require('fs');
const ps = require('prompt-sync');
const prompt = ps();

let cTab, link;
async function main() {
    try {
        console.log(chalk.hex('#DEADED').underline.bold("-------------YOUTUBE PLAYLIST ANALYZER-------------"))
        link = prompt(chalk.green.bold.italic("Enter youtube playlist URL : "));
        if (!link) {
            console.log(chalk.red.bold("!!!!! EMPTY URL ENTERED !!!!!"));
        }
        else {
            let browserOpen = puppeteer.launch({
                headless: false,
                defaultViewport: null,
                args: ['--start-maximized']
            });
            let browserInstance = await browserOpen;
            let allTabsArr = await browserInstance.pages();
            cTab = allTabsArr[0];
            await cTab.goto(link);
            await cTab.waitForSelector('yt-formatted-string[class="style-scope yt-dynamic-sizing-formatted-string yt-sans-28"]');
            let name = await cTab.evaluate(function (select) { return document.querySelector(select).innerText }, 'yt-formatted-string[class="style-scope yt-dynamic-sizing-formatted-string yt-sans-28"]');
            let allData = await cTab.evaluate(getData, ".byline-item.style-scope.ytd-playlist-byline-renderer");
            let totalVideos = allData.noOfVideos.split(" ")[0];
            let currentVideos = await getCVideosLength();
            while (totalVideos - currentVideos >= 10) {
                await scrollToBottom();
                currentVideos = await getCVideosLength();
            }
            let finalList = await getStats();
            let pdfDoc = new pdf();
            pdfDoc.pipe(fs.createWriteStream(name.replace(/[^a-zA-Z ]/g, "")+" playlist.pdf"));
            pdfDoc.text("Name of Playlist : " + name);
            pdfDoc.text("Total Videos : " + allData.noOfVideos);
            pdfDoc.text("Total Views : " + allData.noOfViews);
            pdfDoc.text(JSON.stringify(finalList));
            pdfDoc.end();
        }
    } catch (error) {
        console.log(error);
    }
}
main();

function getData(selector) {
    let allElems = document.querySelectorAll(selector);
    let noOfVideos = allElems[0].innerText;
    let noOfViews = allElems[1].innerText;

    return {
        noOfVideos,
        noOfViews
    }
}

async function getCVideosLength() {
    let length = await cTab.evaluate(getLength, '#container>#thumbnail div.style-scope.ytd-thumbnail-overlay-time-status-renderer');
    return length;
}

async function scrollToBottom() {
    await cTab.evaluate(goToBottom);
    function goToBottom() {
        window.scrollBy(0, window.innerHeight);
    }
}

async function getStats() {
    let list = cTab.evaluate(getNameAndDuration, "#video-title", "#container>#thumbnail div.style-scope.ytd-thumbnail-overlay-time-status-renderer");
    return list;
}

function getLength(durationSelect) {
    let durationElem = document.querySelectorAll(durationSelect);
    return durationElem.length;
}

function getNameAndDuration(videoSelector, durationSelector) {
    let videoElem = document.querySelectorAll(videoSelector);
    let durationElem = document.querySelectorAll(durationSelector);

    let currentList = [];

    for (let i = 0; i < durationElem.length; i++) {
        let videoTitle = videoElem[i].innerText;
        let duration = durationElem[i].innerText;
        currentList.push({ videoTitle, duration });
    }

    return currentList;
}