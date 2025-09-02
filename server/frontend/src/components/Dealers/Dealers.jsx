import React, { useState, useEffect } from 'react';
import "./Dealers.css";
import "../assets/style.css";
import Header from '../Header/Header';
import review_icon from "../assets/reviewicon.png";

const Dealers = () => {
  const [dealersList, setDealersList] = useState([]);
  const [states, setStates] = useState([]);

  // NOTE: trailing slash matters
  const dealersRoot = "/djangoapp/get_dealers/"; 

  const fetchDealers = async (state) => {
    // Use query param (matches your Django view)
    const url = (state && state !== "All")
      ? `${dealersRoot}?state=${encodeURIComponent(state)}`
      : dealersRoot;

    const res = await fetch(url, { method: "GET" });
    const ret = await res.json();

    if (ret.status === 200 && Array.isArray(ret.dealers)) {
      const all = ret.dealers;
      setDealersList(all);
      // build the state list from data
      setStates([...new Set(all.map(d => d.state))].sort());
    } else {
      setDealersList([]);
    }
  };

  useEffect(() => { fetchDealers(); }, []);  // initial load

  const onStateChange = (e) => fetchDealers(e.target.value);

  const isLoggedIn = sessionStorage.getItem("username") != null;

  return (
    <div>
      <Header/>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Dealer Name</th>
            <th>City</th>
            <th>Address</th>
            <th>Zip</th>
            <th>
              <select name="state" id="state" defaultValue="" onChange={onStateChange}>
                <option value="" disabled hidden>State</option>
                <option value="All">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </th>````````
            {isLoggedIn ? <th>Review Dealer</th> : null}
          </tr>
        </thead>
        <tbody>
          {dealersList.map(dealer => (
            <tr key={dealer.id}>
              <td>{dealer.id}</td>
              <td><a href={`/dealer/${dealer.id}`}>{dealer.full_name}</a></td>
              <td>{dealer.city}</td>
              <td>{dealer.address}</td>
              <td>{dealer.zip}</td>
              <td>{dealer.state}</td>
              {isLoggedIn ? (
                <td>
                  <a href={`/postreview/${dealer.id}`}>
                    <img src={review_icon} className="review_icon" alt="Post Review"/>
                  </a>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dealers;
