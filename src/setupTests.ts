import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server.js";

beforeAll(() => server.listen()); // Enable mock server before all tests
afterEach(() => server.resetHandlers()); // Reset handlers after each test to prevent interference
afterAll(() => server.close()); // Close server after all tests have run
