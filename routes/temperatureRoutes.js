const express = require("express");
const router = express.Router();
const Temperature = require("../models/Temperature");

// GET all temperature records
router.get("/", async (req, res) => {
  try {
    const { personName, startDate, endDate, limit = 100 } = req.query;

    let query = {};

    // Filter by person name if provided
    if (personName) {
      query.personName = { $regex: personName, $options: "i" };
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) {
        query.recordedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.recordedAt.$lte = new Date(endDate);
      }
    }

    const temperatures = await Temperature.find(query)
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: temperatures,
      count: temperatures.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching temperature records",
      error: error.message,
    });
  }
});

// GET single temperature record by ID
router.get("/:id", async (req, res) => {
  try {
    const temperature = await Temperature.findById(req.params.id);

    if (!temperature) {
      return res.status(404).json({
        success: false,
        message: "Temperature record not found",
      });
    }

    res.json({
      success: true,
      data: temperature,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching temperature record",
      error: error.message,
    });
  }
});

// POST new temperature record
router.post("/", async (req, res) => {
  try {
    const { personName, temperature } = req.body;

    if (!personName || temperature === undefined) {
      return res.status(400).json({
        success: false,
        message: "Person name and temperature are required",
      });
    }

    const newTemperature = new Temperature({
      personName,
      temperature: parseFloat(temperature),
    });

    const savedTemperature = await newTemperature.save();

    res.status(201).json({
      success: true,
      message: "Temperature record created successfully",
      data: savedTemperature,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating temperature record",
      error: error.message,
    });
  }
});

// PUT update temperature record
router.put("/:id", async (req, res) => {
  try {
    const { personName, temperature } = req.body;

    const updateData = {};
    if (personName !== undefined) updateData.personName = personName;
    if (temperature !== undefined)
      updateData.temperature = parseFloat(temperature);

    const updatedTemperature = await Temperature.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTemperature) {
      return res.status(404).json({
        success: false,
        message: "Temperature record not found",
      });
    }

    res.json({
      success: true,
      message: "Temperature record updated successfully",
      data: updatedTemperature,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating temperature record",
      error: error.message,
    });
  }
});

// DELETE temperature record
router.delete("/:id", async (req, res) => {
  try {
    const deletedTemperature = await Temperature.findByIdAndDelete(
      req.params.id
    );

    if (!deletedTemperature) {
      return res.status(404).json({
        success: false,
        message: "Temperature record not found",
      });
    }

    res.json({
      success: true,
      message: "Temperature record deleted successfully",
      data: deletedTemperature,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting temperature record",
      error: error.message,
    });
  }
});

// GET temperature statistics
router.get("/stats/summary", async (req, res) => {
  try {
    const stats = await Temperature.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          averageTemperature: { $avg: "$temperature" },
          minTemperature: { $min: "$temperature" },
          maxTemperature: { $max: "$temperature" },
          uniquePeople: { $addToSet: "$personName" },
        },
      },
      {
        $project: {
          _id: 0,
          totalRecords: 1,
          averageTemperature: { $round: ["$averageTemperature", 2] },
          minTemperature: 1,
          maxTemperature: 1,
          uniquePeopleCount: { $size: "$uniquePeople" },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalRecords: 0,
        averageTemperature: 0,
        minTemperature: 0,
        maxTemperature: 0,
        uniquePeopleCount: 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching temperature statistics",
      error: error.message,
    });
  }
});

module.exports = router;
