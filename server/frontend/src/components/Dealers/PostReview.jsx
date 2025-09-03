import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import "./Dealers.css";
import "../assets/style.css";
import Header from '../Header/Header';

const PostReview = () => {
  const [dealer, setDealer] = useState({});
  const [review, setReview] = useState("");
  const [model, setModel] = useState("");         // controlled select
  const [year, setYear] = useState("");
  const [date, setDate] = useState("");
  const [carmodels, setCarmodels] = useState([]);

  const params = useParams();
  const id = params.id;

  // base URL in a safer way
  const root = window.location.origin + "/";

  // NOTE: trailing slashes matter with your Django settings
  const dealer_url    = `${root}djangoapp/dealer/${id}/`;
  const review_url    = `${root}djangoapp/add_review/`;
  const carmodels_url = `${root}djangoapp/get_cars/`;

  const postreview = async () => {
    let name =
      (sessionStorage.getItem("firstname") || "") +
      " " +
      (sessionStorage.getItem("lastname") || "");
    name = name.trim();
    if (!name || name.toLowerCase().includes("null")) {
      name = sessionStorage.getItem("username") || "Anonymous";
    }
  
    if (!model || review.trim() === "" || date === "" || year === "") {
      alert("All details are mandatory");
      return;
    }
  
    // model comes in as "MAKE|MODEL"
    const [make_chosen, model_chosen] = model.split("|");
  
    const payload = {
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
        body: JSON.stringify(payload),
      });
  
      // Try to parse JSON, but don't rely on it existing
      let body = {};
      try {
        body = await res.clone().json();
      } catch (_) {
        /* non-JSON or empty body */
      }
  
      if (res.ok || body.status === 200) {
        window.location.href = `${window.location.origin}/dealer/${id}`;
        return;
      }
  
      // Not ok: show some detail if we have it
      const errText = await res.text().catch(() => "");
      console.error("add_review failed:", res.status, body, errText);
      alert("Posting review failed. Please try again.");
    } catch (e) {
      console.error("Network error while posting review:", e);
      alert("Network error while posting review.");
    }
  };  

  const get_dealer = async () => {
    try {
      const res = await fetch(dealer_url, { method: "GET" });
      const retobj = await res.json();
      if (retobj.status === 200) {
        const dealerobjs = Array.from(retobj.dealer || []);
        if (dealerobjs.length > 0) setDealer(dealerobjs[0]);
      }
    } catch (e) {
      // optionally show a toast
    }
  };

  const get_cars = async () => {
    try {
      const res = await fetch(carmodels_url, { method: "GET" });
      const retobj = await res.json();
      const carmodelsarr = Array.from(retobj.cars || retobj.CarModels || []);
      setCarmodels(carmodelsarr);
    } catch (e) {
      setCarmodels([]);
    }
  };

  useEffect(() => {
    get_dealer();
    get_cars();
  }, [id]); // re-run if id changes

  const currentYear = new Date().getFullYear();

  return (
    <div>
      <Header />
      <div style={{ margin: "5%" }}>
        <h1 style={{ color: "darkblue" }}>{dealer.full_name}</h1>

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
            {carmodels.map((cm, idx) => (
              <option
                key={`${cm.CarMake}-${cm.CarModel}-${idx}`}
                value={`${cm.CarMake}|${cm.CarModel}`}
              >
                {cm.CarMake} {cm.CarModel}
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
            max={currentYear}
            min={2015}
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
};

export default PostReview;
