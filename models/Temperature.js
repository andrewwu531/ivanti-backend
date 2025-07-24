const mongoose = require("mongoose");

const temperatureSchema = new mongoose.Schema(
  {
    personName: {
      type: String,
      required: [true, "Person name is required"],
      trim: true,
    },
    temperature: {
      type: Number,
      required: [true, "Temperature is required"],
      min: [-100, "Temperature cannot be below -100°C"],
      max: [100, "Temperature cannot be above 100°C"],
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
temperatureSchema.index({ personName: 1, recordedAt: -1 });

module.exports = mongoose.model("Temperature", temperatureSchema);
