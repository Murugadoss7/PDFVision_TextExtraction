# Azure OpenAI Setup Guide

## 1. Update the Backend Code

I've updated the `backend/app/services/text_extraction.py` file to use Azure OpenAI instead of the standard OpenAI client:

```python
# Initialize AzureOpenAI client
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2023-12-01")
)

# GPT-4 Vision deployment name
VISION_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4-vision")
```

## 2. Environment Variables

You need to set up the following Azure OpenAI environment variables in your `.env` file:

```
# Azure OpenAI API Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_VERSION=2023-12-01
AZURE_OPENAI_DEPLOYMENT=your-gpt4-vision-deployment-name

# Database Configuration
DATABASE_URL=sqlite:///./database/pdf_extractor.db

# CORS settings
ALLOWED_ORIGINS=http://localhost:5173
```

## 3. Azure OpenAI Resources Configuration

1. **Create an Azure OpenAI resource** in your Azure account:
   - Go to the Azure Portal
   - Create a new Azure OpenAI resource
   - Select a region where GPT-4 Vision is available (e.g., East US, West Europe)

2. **Create a deployment**:
   - In your Azure OpenAI resource, go to "Model Deployments"
   - Create a new deployment using GPT-4 Vision model (`gpt-4-vision-preview`)
   - Give the deployment a name (this will be your `AZURE_OPENAI_DEPLOYMENT` value)
   - Set appropriate capacity limits based on your usage needs

3. **Get your API Key and Endpoint**:
   - In your Azure OpenAI resource, go to "Keys and Endpoint"
   - Copy one of the keys to use as your `AZURE_OPENAI_API_KEY`
   - Copy the endpoint to use as your `AZURE_OPENAI_ENDPOINT`

## 4. Testing the Integration

You can test the Azure OpenAI integration using the provided test script:

```bash
# Navigate to backend directory
cd backend

# Run the test script
python test_azure_openai.py
```

This will verify that:
1. Your environment variables are correctly configured
2. The Azure OpenAI client can authenticate
3. The GPT-4 Vision model is accessible
4. Text extraction from sample images works

## 5. Error Handling

Common errors with Azure OpenAI and their solutions:

1. **Authentication error (401)**:
   - Check that your `AZURE_OPENAI_API_KEY` is correct and active
   - Ensure your Azure OpenAI resource is properly provisioned

2. **Resource not found (404)**:
   - Verify your `AZURE_OPENAI_ENDPOINT` is correct
   - Ensure your `AZURE_OPENAI_DEPLOYMENT` name matches the deployment in Azure

3. **Rate limiting (429)**:
   - Azure OpenAI has different rate limits than OpenAI
   - Check your quota and usage in the Azure portal
   - Consider implementing retry logic with exponential backoff

4. **Model not available (403)**:
   - Ensure GPT-4 Vision is available in your selected region
   - Check that your Azure subscription has access to GPT-4 Vision
   - Verify your deployment is active and healthy

## 6. Performance Considerations

- **Regional Selection**: Choose regions closer to your users for better latency
- **Capacity Planning**: Set appropriate tokens per minute (TPM) limits
- **Cost Optimization**: Monitor usage through Azure Cost Management
- **Backup Strategy**: Consider setting up deployments in multiple regions

## 7. Additional Resources

- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Azure OpenAI Python SDK](https://learn.microsoft.com/en-us/python/api/overview/azure/ai-services?view=azure-python)
- [GPT-4 Vision capabilities in Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/gpt-with-vision)
- [Azure OpenAI Service models](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models)
- [Azure OpenAI quotas and limits](https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits) 