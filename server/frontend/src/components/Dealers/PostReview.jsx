import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./Dealers.css";
import "../assets/style.css";
import Header from "../Header/Header";

export default function PostReview() {
  const { id } = useParams();

  // UI state
  const [dealer, setDealer] = useState(null);
  const [review, setReview] = useState("");
  const [model, setModel] = useState("");              // stores "MAKE|MODEL"
  const [year, setYear] = useState("");
  const [date, setDate] = useState("");
  const [carmodels, setCarmodels] = useState([]);

  // API endpoints (no window.location slicing)
  const dealer_url    = `/djangoapp/dealer/${id}/`;
  const review_url    = `/djangoapp/add_review/`;
  const carmodels_url = `/djangoapp/get_cars/`;

  // ---- helpers ----
  const getNameFromSession = () => {
    const fn = sessionStorage.getItem("firstname") || "";
    const ln = sessionStorage.getItem("lastname") || "";
    let name = `${fn} ${ln}`.trim();
    if (!name || name.toLowerCase().includes("null")) {
      name = sessionStorage.getItem("username") || "Anonymous";
    }
    return name;
  };

  // ---- data loads ----
  const get_dealer = async () => {
    try {
      const res = await fetch(dealer_url);
      const data = await res.json();
      const list = Array.isArray(data.dealer) ? data.dealer : data.dealer ? [data.dealer] : [];
      setDealer(list[0] || null);
    } catch (e) {
      console.error("dealer fetch error:", e);
    }
  };

  const get_cars = async () => {
    try {
      const res = await fetch(carmodels_url, { method: "GET" });
      const data = await res.json();
      // backend returns { cars: [...] }
      const list = Array.isArray(data.cars) ? data.cars : [];
      setCarmodels(list);
    } catch (e) {
      console.error("car models fetch error:", e);
    }
  };

  useEffect(() => {
    get_dealer();
    get_cars();
  }, [id]);

  // ---- submit ----
  const postreview = async () => {
    const name = getNameFromSession();

    if (!model || review.trim() === "" || !date || !year) {
      alert("All details are mandatory");
      return;
    }

    // "MAKE|MODEL"
    // prepare payload (you already have these vars defined)
const [make_chosen, model_chosen] = (model || "").split("|");
const clientGeneratedId = Math.floor(Date.now() / 1000); // simple unique-ish int

const payload = {
  id: clientGeneratedId,
  name,
  dealership: Number(id),
  review: review.trim(),
  purchase: true,
  purchase_date: date,
  car_make: make_chosen,
  car_model: model_chosen,
  car_year: year,
};

try {
  const res = await fetch(review_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",     // keep the session cookie
    body: JSON.stringify(payload),
  });

  // some servers return 200 + JSON, others return JSON even on non-200
  let text = await res.text();
  let json = {};
  try { json = JSON.parse(text || "{}"); } catch {}

  const succeeded =
    res.ok ||
    json?.status === 200 ||
    json?.ok === true ||
    json?._id || json?.id || json?.insertedId;

  if (succeeded) {
    // go back to the dealer page and bust cache so the new review shows right away
    window.location.href = `${window.location.origin}/dealer/${id}?t=${Date.now()}`;
  } else {
    alert("Posting review failed. Please try again.");
    console.warn("post review response", res.status, json, text);
  }
} catch (e) {
  alert("Network error while posting review.");
  console.error(e);
}
  };

  return (
    <div>
      <Header />
      <div style={{ margin: "5%" }}>
        <h1 style={{ color: "darkblue" }}>
          {dealer ? dealer.full_name : "Loading dealer..."}
        </h1>

        <textarea
          id="review"
          cols="50"
          rows="7"
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />

        <div className="input_field">
          Purchase Date{" "}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="input_field">
          Car Make
          <select
            name="cars"
            id="cars"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="" disabled hidden>
              Choose Car Make and Model
            </option>
            {carmodels.map((c, idx) => (
              <option key={`${c.CarMake}-${c.CarModel}-${idx}`} value={`${c.CarMake}|${c.CarModel}`}>
                {c.CarMake} {c.CarModel}
              </option>
            ))}
          </select>
        </div>

        <div className="input_field">
          Car Year{" "}
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            max={new Date().getFullYear()}
            min={2010}
          />
        </div>

        <div>
          <button className="postreview" onClick={postreview}>
            Post Review
          </button>
        </div>
      </div>
    </div>
  );
}
