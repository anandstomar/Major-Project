import os
import pandas as pd
from dotenv import load_dotenv

from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from langchain_core.tools import Tool

load_dotenv()

_vectorstore = None


def get_vectorstore():
    global _vectorstore

    if _vectorstore is not None:
        return _vectorstore

    # Load dataset
    df = pd.read_csv("data/supply_chain_data.csv")

    # Convert rows into documents
    documents = []
    for _, row in df.iterrows():
        text = " | ".join([f"{col}: {row[col]}" for col in df.columns])
        documents.append(Document(page_content=text))

    # Create embeddings
    embeddings = GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001",
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )

    # Create FAISS index
    _vectorstore = FAISS.from_documents(documents, embeddings)

    return _vectorstore


def retrieve_data(query: str):
    vectorstore = get_vectorstore()

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    docs = retriever.invoke(query)

    return "\n\n".join([doc.page_content for doc in docs])


retriever_tool = Tool(
    name="SupplyChainRAGTool",
    func=retrieve_data,
    # description="Retrieve historical supply chain records and inventory insights from the dataset."
    description="Query this tool to find ANY data from the supply chain CSV, including SKU details, Price, Stock levels, Supplier info, and Revenue. Input should be the SKU ID or a specific question about the records."
)