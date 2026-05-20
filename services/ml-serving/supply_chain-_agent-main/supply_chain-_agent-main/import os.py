import os
from langchain_google_genai import ChatGoogleGenerativeAI

os.environ["GOOGLE_API_KEY"] = "AIzaSyBZXW9Oi84ZpIO5C_My_15FNS5q1IpYxxo"

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash"
)

response = llm.invoke("Hello")
print(response.content)