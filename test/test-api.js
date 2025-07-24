const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testAPI() {
  try {
    console.log("Testing Temperature API...\n");

    // Test 1: Create a temperature record
    console.log("1. Creating temperature record...");
    const createResponse = await axios.post(`${BASE_URL}/temperatures`, {
      personName: "John Doe",
      temperature: 37.2,
    });
    console.log("✅ Created:", createResponse.data.data);
    const recordId = createResponse.data.data._id;

    // Test 2: Get all records
    console.log("\n2. Getting all records...");
    const getAllResponse = await axios.get(`${BASE_URL}/temperatures`);
    console.log("✅ Retrieved:", getAllResponse.data.count, "records");

    // Test 3: Get specific record
    console.log("\n3. Getting specific record...");
    const getOneResponse = await axios.get(
      `${BASE_URL}/temperatures/${recordId}`
    );
    console.log("✅ Retrieved specific record:", getOneResponse.data.data);

    // Test 4: Update record
    console.log("\n4. Updating record...");
    const updateResponse = await axios.put(
      `${BASE_URL}/temperatures/${recordId}`,
      {
        temperature: 36.8,
      }
    );
    console.log("✅ Updated:", updateResponse.data.data);

    // Test 5: Get statistics
    console.log("\n5. Getting statistics...");
    const statsResponse = await axios.get(
      `${BASE_URL}/temperatures/stats/summary`
    );
    console.log("✅ Statistics:", statsResponse.data.data);

    // Test 6: Delete record
    console.log("\n6. Deleting record...");
    const deleteResponse = await axios.delete(
      `${BASE_URL}/temperatures/${recordId}`
    );
    console.log("✅ Deleted:", deleteResponse.data.message);

    console.log("\n🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };
