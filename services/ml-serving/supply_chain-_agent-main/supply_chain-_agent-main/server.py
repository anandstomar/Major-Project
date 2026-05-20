from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import your existing agent logic
from agent import run_agent

# Initialize the FastAPI app
app = FastAPI(
    title="Supply Chain AI Agent API",
    description="API for querying the LangChain Supply Chain Agent"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Define what the incoming data should look like
class QueryRequest(BaseModel):
    query: str

# 2. Define what the outgoing data should look like
class QueryResponse(BaseModel):
    response: str

# Helper function to replicate the cleanup logic from your CLI script
def clean_agent_response(result):
    if isinstance(result, list) and len(result) > 0:
        if isinstance(result[0], dict) and "text" in result[0]:
            return result[0]["text"]
        else:
            return str(result[0])
    return str(result)

# 3. Create the POST endpoint
@app.post("/api/chat", response_model=QueryResponse)
async def chat_with_agent(request: QueryRequest):
    try:
        # Pass the user's string to your LangChain agent
        raw_result = run_agent(request.query)
        
        # Clean up the format
        final_text = clean_agent_response(raw_result)
        
        return QueryResponse(response=final_text)
        
    except Exception as e:
        # If LangChain or Gemini throws an error, return a 500 status
        raise HTTPException(status_code=500, detail=str(e))

# 4. Run the server
if __name__ == "__main__":
    print("Starting Supply Chain API Server 🚀")
    # Runs on http://localhost:8000
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)