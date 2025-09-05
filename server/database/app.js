// server/database/app.js
const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3030;
const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo_db:27017/";

// ------- middleware -------
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// ------- seed data -------
const reviewsPath = path.join(__dirname, "data", "reviews.json");
const dealersPath = path.join(__dirname, "data", "dealerships.json");
const reviews_data = JSON.parse(fs.readFileSync(reviewsPath, "utf8"));
const dealerships_data = JSON.parse(fs.readFileSync(dealersPath, "utf8"));

// ------- db -------
mongoose
  .connect(MONGO_URL, { dbName: "dealershipsDB" })
  .then(() => console.log("[api] Mongo connected:", MONGO_URL))
  .catch((err) => console.error("[api] Mongo error:", err));

// ------- models -------
const Reviews = require("./review");
const Dealerships = require("./dealership");

// ------- seed on boot (idempotent) -------
(async () => {
  try {
    const [rCount, dCount] = await Promise.all([
      Reviews.estimatedDocumentCount(),
      Dealerships.estimatedDocumentCount(),
    ]);

    if (rCount === 0) {
      await Reviews.insertMany(reviews_data.reviews || []);
      console.log(`[api] Seeded ${reviews_data.reviews?.length || 0} reviews`);
    }
    if (dCount === 0) {
      await Dealerships.insertMany(dealerships_data.dealerships || []);
      console.log(
        `[api] Seeded ${dealerships_data.dealerships?.length || 0} dealerships`
      );
    }
  } catch (err) {
    console.error("[api] Seeding error:", err);
  }
})();

// ------- routes -------
app.get("/", (_req, res) => res.send("Welcome to the Mongoose API"));

app.get("/fetchReviews", async (_req, res) => {
  try {
    const docs = await Reviews.find();
    res.json(docs);
  } catch {
    res.status(500).json({ error: "Error fetching documents" });
  }
});

app.get("/fetchReviews/dealer/:id", async (req, res) => {
  try {
    // normalize to number; many labs store dealership as Number
    const dealerId = Number(req.params.id);
    const query = Number.isFinite(dealerId)
      ? { dealership: dealerId }
      : { dealership: req.params.id };
    const docs = await Reviews.find(query);
    res.json(docs);
  } catch {
    res.status(500).json({ error: "Error fetching documents" });
  }
});

app.get("/fetchDealers", async (_req, res) => {
  try {
    const docs = await Dealerships.find();
    res.json(docs);
  } catch (error) {
    console.error("fetchDealers error:", error);
    res.status(500).json({ error: "Error fetching documents" });
  }
});

app.get("/fetchDealers/:state", async (req, res) => {
  try {
    const docs = await Dealerships.find({ state: req.params.state });
    res.json(docs);
  } catch (error) {
    console.error("fetchDealers/:state error:", error);
    res.status(500).json({ error: "Error fetching documents" });
  }
});

app.get("/fetchDealer/:id", async (req, res) => {
  try {
    const idNum = Number(req.params.id); // dataset uses numeric id
    const doc = await Dealerships.findOne({ id: idNum });
    if (!doc) return res.status(404).json({ error: "Dealer not found" });
    res.json(doc);
  } catch (error) {
    console.error("fetchDealer/:id error:", error);
    res.status(500).json({ error: "Error fetching document" });
  }
});

app.post("/insert_review", async (req, res) => {
  // debug: prove this handler is running and body is parsed
  console.log(
    "[api] /insert_review hit",
    "ctype=", req.headers["content-type"],
    "typeof body=", typeof req.body
  );

  try {
    // 1) Accept JSON or string body safely
    let data = req.body;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { data = {}; }
    }
    if (!data || typeof data !== "object") data = {};

    // 2) Coerce types + safe defaults
    const name          = (data.name ?? "").toString() || "Anonymous";
    const dealership    = Number(data.dealership) || 0;
    const reviewText    = (data.review ?? "").toString();
    const purchase      = !!data.purchase;
    const purchase_date = (data.purchase_date ?? "").toString();  // "YYYY-MM-DD"
    const car_make      = (data.car_make ?? "").toString();
    const car_model     = (data.car_model ?? "").toString();
    const car_year      = data.car_year === "" || data.car_year == null
                          ? null
                          : Number(data.car_year);

    // 3) Compute next id
    const last = await Reviews.find().sort({ id: -1 }).limit(1);
    const new_id = last.length ? (Number(last[0].id) || 0) + 1 : 1;

    // 4) Build and save
    const doc = new Reviews({
      id: new_id,
      name,
      dealership,
      review: reviewText,
      purchase,
      purchase_date,
      car_make,
      car_model,
      car_year,
    });

    console.log("[api] saving doc:", doc.toObject()); // debug
    const saved = await doc.save();
    return res.json(saved);

  } catch (err) {
    console.error("[api] insert_review error:", err);
    let details = err?.message || err;
    if (err?.errors) {
      details = Object.fromEntries(
        Object.entries(err.errors).map(([k, v]) => [k, v.message])
      );
    }
    return res.status(400).json({ error: "Error inserting review", details });
  }
});

// ------- start -------
app.listen(PORT, "0.0.0.0", () =>
  console.log(`[api] Server is running on http://0.0.0.0:${PORT}`)
);
