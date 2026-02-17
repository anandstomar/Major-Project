import { AppConfig } from './config';

export async function fetchWithRetry(
  endpoint: string, 
  options: RequestInit = {}, 
  retries = 3, 
  backoff = 1000
): Promise<Response> {
  
  const url = `${AppConfig.API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, options);

    if (response.status === 401) {
      console.warn("Session expired. Logging out...");
      localStorage.removeItem("access_token"); // Destroy the dead token
      window.location.href = "/login";         // Force redirect to the login page
      throw new Error("Unauthorized - Redirecting to login");
    }

    // If it's a server error (5xx), throw so we can catch and retry
    if (response.status >= 500 && response.status < 600) {
      throw new Error(`Server Error: ${response.status}`);
    }
    
    return response;
    
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch failed. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      // Retry, doubling the wait time (exponential backoff)
      return fetchWithRetry(endpoint, options, retries - 1, backoff * 2);
    } else {
      throw new Error(`Failed to fetch after multiple attempts: ${error}`);
    }
  }
}