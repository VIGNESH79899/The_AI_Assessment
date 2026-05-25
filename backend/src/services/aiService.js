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

export async function searchLiterature(query) {
  const url = `${env.aiServiceUrl.replace(/\/+$/, '')}/api/literature/search?q=${encodeURIComponent(query)}`;
  console.log(`[AI_SERVICE] Sending literature search request to: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: { "x-internal-service-token": env.aiServiceToken },
      timeout: 30000
    });
    console.log(`[AI_SERVICE] Search Success: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`[AI_SERVICE] Error during literature search at ${url}: ${error.message}`);
    throw error;
  }
}

export async function generateLiteratureSurvey(payload) {
  const url = `${env.aiServiceUrl.replace(/\/+$/, '')}/api/literature/generate-survey`;
  console.log(`[AI_SERVICE] Sending literature survey generation request to: ${url}`);
  
  try {
    const response = await axios.post(url, payload, {
      headers: { "x-internal-service-token": env.aiServiceToken },
      timeout: 180000 // 3 minutes timeout for multi-stage LLM summaries
    });
    console.log(`[AI_SERVICE] Survey Generation Success: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`[AI_SERVICE] Error generating literature survey at ${url}: ${error.message}`);
    throw error;
  }
}
