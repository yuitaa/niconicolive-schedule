import express from "express";
import { createEvents } from "ics";
import { main as scrape } from "./scraper.mjs";

const app = express();

app.get("/calendar.ics", async (req, res) => {
  try {
    const calendarType = req.query.type || "all";
    const events = await scrape(calendarType);

    const filename = `calendar-${calendarType}.ics`;

    const formattedEvents = events.map((e) => {
      const date = new Date(e.start);

      return {
        title: e.title,
        description: e.description,
        start: [
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
          date.getHours(),
          date.getMinutes(),
        ],
        duration: { minutes: 30 },
      };
    });

    createEvents(formattedEvents, (error, value) => {
      if (error) {
        console.error(error);
        return res.status(500).send("Failed to generate calendar");
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.send(value);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
