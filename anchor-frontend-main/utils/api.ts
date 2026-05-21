import { AppConfig } from './config';

export async function fetchWithRetry(
  endpoint: string, 
  options: RequestInit = {}, 
  retries = 3, 
  backoff = 1000
): Promise<Response> {
  
  const url = `${AppConfig.API_BASE_URL}${endpoint}`;
  
  // 👇 1. GRAB THE TOKEN FROM LOCAL STORAGE
  const token = localStorage.getItem("access_token");

  // 👇 2. INJECT IT INTO THE HEADERS AS A "BEARER" TOKEN
  const headers = {
    ...options.headers,
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  // 👇 3. PASS THE NEW HEADERS INTO THE FETCH CALL
  const fetchOptions = { ...options, headers };

  console.log(`Fetching: ${url} with options:`, fetchOptions);
  
  try {
    // ⚠️ MAKE SURE YOU USE fetchOptions HERE, NOT options
    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      console.error(`🚨 [DEBUG] 401 Unauthorized caught on endpoint: ${endpoint}`);
      
      localStorage.removeItem("access_token"); 
      window.location.hash = "/login"; 
      
      return response; 
    }

    if (response.status >= 500 && response.status < 600) {
      throw new Error(`Server Error: ${response.status}`);
    }
    
    return response;
    
  } catch (error) {
    if (retries > 0) {
      console.warn(`Fetch failed for ${endpoint}. Retrying in ${backoff}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(endpoint, options, retries - 1, backoff * 2);
    } else {
      throw new Error(`Failed to fetch after multiple attempts: ${error}`);
    }
  }
}




// import { AppConfig } from './config';

// export async function fetchWithRetry(
//   endpoint: string, 
//   options: RequestInit = {}, 
//   retries = 3, 
//   backoff = 1000
// ): Promise<Response> {
  
//   const url = `${AppConfig.API_BASE_URL}${endpoint}`;
  
//   console.log(`Fetching: ${url} with options:`, options);
  
//   try {
//     const response = await fetch(url, options);

//     if (response.status === 401) {
//       // 👇 This will tell us EXACTLY which microservice is failing!
//       console.error(`🚨 [DEBUG] 401 Unauthorized caught on endpoint: ${endpoint}`);
      
//       // 👇 TEMPORARILY DISABLED so you don't get kicked out while debugging!
//       localStorage.removeItem("access_token"); 
//       window.location.hash = "/login"; // <-- This is the correct hash routing for later!
      
//       return response; // Return it so the app doesn't crash
//     }

//     // If it's a server error (5xx), throw so we can catch and retry
//     if (response.status >= 500 && response.status < 600) {
//       throw new Error(`Server Error: ${response.status}`);
//     }
    
//     return response;
    
//   } catch (error) {
//     if (retries > 0) {
//       console.warn(`Fetch failed for ${endpoint}. Retrying in ${backoff}ms... (${retries} retries left)`);
//       await new Promise(resolve => setTimeout(resolve, backoff));
//       // Retry, doubling the wait time (exponential backoff)
//       return fetchWithRetry(endpoint, options, retries - 1, backoff * 2);
//     } else {
//       throw new Error(`Failed to fetch after multiple attempts: ${error}`);
//     }
//   }
// }