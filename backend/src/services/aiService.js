import axios from "axios";
import { env } from "../config/env.js";

export async function generateAssignment(payload) {
  const url = `${env.aiServiceUrl.replace(/\/+$/, '')}/generate-assignment`;
  console.log(`[AI_SERVICE] Sending generation request to: ${url}`);
  
  try {
    const response = await axios.post(url, payload, {
      headers: { "x-internal-service-token": env.aiServiceToken },
      timeout: 120000
    });
    console.log(`[AI_SERVICE] Success: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`[AI_SERVICE] Error calling AI service at ${url}`);
    if (error.response) {
      console.error(`[AI_SERVICE] Response Status: ${error.response.status}`);
      console.error(`[AI_SERVICE] Response Body:`, error.response.data);
    } else if (error.request) {
      console.error(`[AI_SERVICE] No response received. Error: ${error.message}`);
    } else {
      console.error(`[AI_SERVICE] Request Setup Error: ${error.message}`);
    }
    throw error;
  }
}

export async function generateFreeWriting(payload) {
  const url = `${env.aiServiceUrl.replace(/\/+$/, '')}/api/generate-free-writing`;
  console.log(`[AI_SERVICE] Sending free writing request to: ${url}`);
  
  try {
    const response = await axios.post(url, payload, {
      headers: { "x-internal-service-token": env.aiServiceToken },
      timeout: 120000
    });
    console.log(`[AI_SERVICE] Success: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`[AI_SERVICE] Error calling AI service at ${url}`);
    if (error.response) {
      console.error(`[AI_SERVICE] Response Status: ${error.response.status}`);
      console.error(`[AI_SERVICE] Response Body:`, error.response.data);
    } else if (error.request) {
      console.error(`[AI_SERVICE] No response received. Error: ${error.message}`);
    } else {
      console.error(`[AI_SERVICE] Request Setup Error: ${error.message}`);
    }
    throw error;
  }
}
