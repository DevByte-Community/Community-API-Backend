const request = require("supertest");
const { getTestContainersManager, resetTestContainersManager } = require("../testContainers");

jest.setTimeout(120000);

let testManager;
let app;
let db;
let adminAgent;

beforeAll(async () => {
  testManager = getTestContainersManager();

  await testManager.setup({
    createUsers: true,
    userDefinitions: {
      ADMIN: {
        fullname: "Tech Admin",
        email: "techadmin@example.com",
        password: "Password123!",
        role: "ADMIN",
      },
    },
  });

  app = testManager.app;
  db = testManager.getModels();

  const users = testManager.getUsers();
  const adminUser = users.ADMIN;

  adminAgent = request.agent(app);
  const login = await adminAgent.post("/api/v1/auth/signin").send({
    email: adminUser.email,
    password: "Password123!",
  });

  expect(login.status).toBe(200);
  expect(login.headers["set-cookie"]).toBeDefined();
});

afterAll(async () => {
  if (testManager) {
    await testManager.teardown();
    resetTestContainersManager();
  }
});

describe("Tech CRUD Integration (Testcontainers v10)", () => {
  test("POST /api/v1/techs - create tech", async () => {
    const res = await adminAgent
      .post("/api/v1/techs")
      .field("name", "NodeJS")
      .field("description", "Server runtime")
      .attach("icon", Buffer.from([0x89, 0x50, 0x4E]), "icon.png");

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test("GET /api/v1/techs - list", async () => {
    const res = await adminAgent.get("/api/v1/techs");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("DELETE /api/v1/techs/:id - delete tech", async () => {
    const tech = await db.Tech.create({
      name: "ToDelete",
      description: "temp",
    });

    const res = await adminAgent.delete(`/api/v1/techs/${tech.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
