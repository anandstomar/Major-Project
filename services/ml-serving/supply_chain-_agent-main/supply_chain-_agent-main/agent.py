import os
from dotenv import load_dotenv
import sys
import numpy
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from google.api_core.exceptions import ResourceExhausted
if not hasattr(numpy, '_core'):
    # For NumPy 1.x environments looking for 2.x
    sys.modules['numpy._core'] = numpy.core
elif not hasattr(numpy, 'core'):
    # For NumPy 2.x environments looking for 1.x
    numpy.core = numpy._core
    sys.modules['numpy.core'] = numpy._core

load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import create_agent

from tools.forecast_tool import forecast_tool
from tools.retriever_tool import retriever_tool
from tools.analysis_tool import inventory_analysis_tool


# Load Gemini
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",   # safer stable model
    temperature=0.3
)

print(retriever_tool.description)

tools = [forecast_tool, retriever_tool, inventory_analysis_tool]

agent = create_agent(
    model=llm,
    tools=tools
)

@retry(
    retry=retry_if_exception_type(ResourceExhausted),
    wait=wait_exponential(multiplier=2, min=4, max=20),
    stop=stop_after_attempt(4)
)
def run_agent(query: str):
    response = agent.invoke(
        {
            "messages": [
                {"role": "user", "content": query}
            ]
        }
    )

    return response["messages"][-1].content

if __name__ == "__main__":
    print("Supply Chain AI Agent Started 🚀")
    print("Type 'exit' to quit.\n")

    while True:
        user_input = input("Enter your query: ")
        
        if not user_input.strip(): 
            continue

        if user_input.lower() == "exit":
            print("Exiting agent...")
            break

        try:
            result = run_agent(user_input)
            # print("\nAI Response:\n")
            # print(result)
            # print("\n" + "-"*50 + "\n")
            # This handles the specific format Gemini/LangChain returns
            if isinstance(result, list) and len(result) > 0:
                # Check if it's a list of dicts (like you had)
                if isinstance(result[0], dict) and "text" in result[0]:
                    print(result[0]["text"])
                else:
                    print(result[0])
            else:
                # If it's just a direct string
                print(result)
                
            print("\n" + "-"*50 + "\n")
        except Exception as e:
            print("Error:", str(e))

        except Exception as e:
            print("Error:", str(e))