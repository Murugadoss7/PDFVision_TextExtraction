import os
from dotenv import load_dotenv
from openai import AzureOpenAI

# Load environment variables
load_dotenv()

# Print OpenAI package version
import openai
print(f"Using OpenAI Python SDK version: {openai.__version__}")

# Get credentials
api_key = os.getenv("AZURE_OPENAI_API_KEY")
api_version = os.getenv("AZURE_OPENAI_API_VERSION")
azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT")

print(f"API Version: {api_version}")
print(f"Azure Endpoint: {azure_endpoint}")
print(f"Deployment Name: {deployment_name}")

# Test client creation
try:
    client = AzureOpenAI(
        api_key=api_key,
        api_version=api_version,
        azure_endpoint=azure_endpoint
    )
    print("Successfully created AzureOpenAI client")
    
    # Test a simple completion
    try:
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello world"}
            ]
        )
        print("API Call successful!")
        print(f"Response: {response.choices[0].message.content}")
    except Exception as call_error:
        print(f"Error calling the API: {str(call_error)}")
        
except Exception as client_error:
    print(f"Error creating client: {str(client_error)}") 