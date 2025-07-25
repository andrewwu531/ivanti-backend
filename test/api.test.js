// test/api.test.js - Simple version without database mocking
const request = require("supertest");
const { app } = require("../app");

describe("Temperature API", () => {
  let server;

  beforeAll(() => {
    server = app.listen(5001);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe("GET /api/temperature-records", () => {
    it("should return success response", async () => {
      const response = await request(app)
        .get("/api/temperature-records")
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("POST /api/temperature-records", () => {
    it("should create a new temperature record", async () => {
      const recordData = {
        personName: "Test User",
        temperatureSeries: [36.8, 37.1, 36.9],
      };

      const response = await request(app)
        .post("/api/temperature-records")
        .send(recordData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.personName).toBe(recordData.personName);
      expect(response.body.data.temperatureSeries).toEqual(
        recordData.temperatureSeries
      );
      expect(response.body.data.id).toBeDefined();
    });

    it("should return 400 for invalid data", async () => {
      const invalidData = {
        personName: "",
        temperatureSeries: [],
      };

      const response = await request(app)
        .post("/api/temperature-records")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should return 400 for missing person name", async () => {
      const invalidData = {
        temperatureSeries: [36.8, 37.1],
      };

      const response = await request(app)
        .post("/api/temperature-records")
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body.status).toBe("OK");
      expect(response.body.message).toBe("Server is running");
    });
  });
});
