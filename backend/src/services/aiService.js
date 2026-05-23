import axios from "axios";
import { env } from "../config/env.js";

export async function generateAssignment(payload) {
  const response = await axios.post(`${env.aiServiceUrl}/api/generate`, payload, {
    headers: { "x-internal-service-token": env.aiServiceToken },
    timeout: 120000
  });
  return response.data;
}
