import axios from "axios";
import * as cheerio from "cheerio";
import vm from "vm";

const targets = [
  {
    url: "https://anime.nicovideo.jp/live/reserved-regular.html",
    key: "live_reserved_regular",
    type: "regular",
  },
  {
    url: "https://anime.nicovideo.jp/live/reserved-ikkyo.html",
    key: "live_reserved_ikkyo",
    type: "ikkyo",
  },
];

const sandboxTemplate = () => ({
  window: { TKTK: {} },
  s: (v) =>
    v.trim().replace(/&(lt|gt|amp|quot|#x27|#x60|#x2F|#x3D);/g, (m) => {
      return (
        {
          "&lt;": "<",
          "&gt;": ">",
          "&amp;": "&",
          "&quot;": '"',
          "&#x27;": "'",
          "&#x60;": "`",
          "&#x2F;": "/",
          "&#x3D;": "=",
        }[m] || m
      );
    }),
  d_s: (v) => v,
  n: (v) => Number(v),
  b: (v) => v === "true",
});

async function extractFromPage({ url, key }) {
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);
  const scriptContent = $("#tktk-module").html();

  const sandbox = sandboxTemplate();
  const context = vm.createContext(sandbox);
  const script = new vm.Script(scriptContent);
  script.runInContext(context);

  const events = sandbox.window.TKTK[key];
  if (!Array.isArray(events)) {
    return [];
  }

  return events.map((event) => ({
    title: event.title,
    start: event.startTime,
    description: event.watchUrl,
  }));
}

export async function main(calendarType = "all") {
  let allEvents = [];

  const targetsToFetch =
    calendarType === "all"
      ? targets
      : targets.filter((t) => t.type === calendarType);

  for (const target of targetsToFetch) {
    const events = (await extractFromPage(target)).filter((e) => {
      return !e.title.includes("【ニコニコプレミアム会員限定】");
    });
    allEvents = allEvents.concat(events);
  }

  return allEvents;
}
