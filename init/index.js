const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8', '208.67.222.222']);

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const MONGO_URL = process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("connected to DB"); 
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  await Listing.deleteMany({});
  
  // Add geometry coordinates to each listing
  const geometryMap = {
    "Malibu": [-118.6829, 34.0195],
    "New York City": [-74.0060, 40.7128],
    "Aspen": [-106.8175, 39.1911],
    "Florence": [11.2558, 43.7696],
    "Portland": [-122.6765, 45.5152],
    "Cancun": [-87.3498, 21.1619],
    "Lake Tahoe": [-120.1023, 39.0968],
    "Los Angeles": [-118.2437, 34.0522],
    "Verbier": [7.2269, 46.0972],
    "Serengeti National Park": [34.8888, -2.3333],
    "Amsterdam": [4.8952, 52.3702],
    "Fiji": [177.9789, -17.7134],
    "Cotswolds": [-1.8019, 51.8330],
  };

  initData.data = initData.data.map((obj) => ({
    ...obj,
    owner: "507f1f77bcf86cd799439011", // Use a valid ObjectId format
    geometry: {
      type: "Point",
      coordinates: geometryMap[obj.location] || [0, 0],
    },
  }));
  await Listing.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();
