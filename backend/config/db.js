const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI must be defined before connecting to MongoDB");
  }

  try {
    await mongoose.connect(uri, {
      autoIndex: process.env.NODE_ENV !== "production",
      maxPoolSize: 20,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

module.exports = connectDB;
