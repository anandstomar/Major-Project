import pandas as pd
from langchain.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

@tool
def inventory_analysis_tool(query: str) -> str:
    """
    Use this tool for complex tabular queries, mathematical calculations, 
    aggregations, and filtering multiple columns (e.g., 'total revenue for stock below 30').
    Pass the user's exact query into this tool.
    """
    # 1. Load your local dataframe
    df = pd.read_csv("data/supply_chain_data.csv") 
    columns = ", ".join(df.columns.tolist())
    
    # 2. Initialize a basic Gemini model
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
    
    # 3. Create a strict, lightweight prompt
    prompt = f"""
    You are a data analyst. I have a pandas dataframe named 'df' with these exact columns:
    [{columns}]
    
    Write ONLY the raw python pandas code to answer this user query: "{query}"
    
    Rules:
    1. Return ONLY the code. No markdown, no backticks (```), no python tags, no explanations.
    2. The code must be a single expression that evaluates to the final answer.
    3. Do not use print().
    
    Example for counting rows: len(df[df['Stock levels'] < 20])
    Example for summing: df[df['Availability'] < 30]['Revenue generated'].sum()
    """
    
    try:
        # Step 4: Make ONE API call to get the code string
        code_string = llm.invoke(prompt).content.replace('```python', '').replace('```', '').strip()
        
        # Step 5: Execute the code securely on your local machine
        result = eval(code_string, {"pd": pd, "df": df})
        
        return f"Analysis complete. The result is: {result}"
        
    except Exception as e:
        # If it fails, it will tell you exactly what code it tried to write
        return f"Error executing data analysis. Tried running: `{code_string}`. Error: {str(e)}"