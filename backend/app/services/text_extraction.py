# import os
# import json
# import base64
# from openai import AzureOpenAI
# from sqlalchemy.orm import Session
# import logging

# from app.db.models import Page, ExtractedText

# # Setup logging
# logger = logging.getLogger(__name__)

# # Add debug prints for troubleshooting
# print("==== Text Extraction Service Initialization ====")
# print(f"AZURE_OPENAI_API_KEY: {'[SET]' if os.getenv('AZURE_OPENAI_API_KEY') else '[NOT SET]'}")
# print(f"AZURE_OPENAI_API_VERSION: {os.getenv('AZURE_OPENAI_API_VERSION')}")
# print(f"AZURE_OPENAI_ENDPOINT: {os.getenv('AZURE_OPENAI_ENDPOINT')}")
# print(f"AZURE_OPENAI_DEPLOYMENT: {os.getenv('AZURE_OPENAI_DEPLOYMENT')}")

# # Initialize Azure OpenAI client
# try:
#     api_key = os.getenv("AZURE_OPENAI_API_KEY")
#     api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2023-12-01-preview")  # Default to stable version
#     azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
#     VISION_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    
#     print(f"Attempting to initialize AzureOpenAI client with:")
#     print(f"- API version: {api_version}")
#     print(f"- Endpoint: {azure_endpoint}")
#     print(f"- Deployment: {VISION_DEPLOYMENT_NAME}")
    
#     if not all([api_key, azure_endpoint, VISION_DEPLOYMENT_NAME, api_version]):
#         logger.warning("Missing Azure OpenAI credentials. Vision extraction may not work.")
#         print("MISSING REQUIRED CREDENTIALS - client will be None")
#         client = None
#     else:
#         try:
#             # Using the simplest initialization possible to avoid any proxy issues
#             # Create new environment with only what we need
#             import openai
#             print(f"OpenAI version: {openai.__version__}")
            
#             # Try different client init approaches based on version
#             if openai.__version__ >= "1.0.0":
#                 # For newer OpenAI versions
#                 client = AzureOpenAI(
#                     api_key=api_key,
#                     api_version=api_version,
#                     azure_endpoint=azure_endpoint
#                 )
#             else:
#                 # For older OpenAI versions
#                 client = AzureOpenAI(
#                     api_key=api_key,
#                     api_version=api_version,
#                     azure_endpoint=azure_endpoint,
#                     http_client=None  # Avoid any custom http client settings
#                 )
                
#             logger.info("Azure OpenAI Vision service configured successfully")
#             print("Client initialized successfully!")
#         except Exception as client_error:
#             print(f"ERROR initializing client: {str(client_error)}")
#             logger.error(f"Error initializing AzureOpenAI client: {str(client_error)}")
#             client = None
# except Exception as e:
#     logger.error(f"Error configuring Azure services: {str(e)}")
#     print(f"EXCEPTION during setup: {str(e)}")
#     client = None

# print(f"Final client status: {'Initialized' if client is not None else 'NOT initialized'}")

# async def extract_text_with_gpt_vision(page_id: int, image_path: str, db: Session):
#     """Extract text from page image using Azure OpenAI's GPT Vision model"""
#     print(f"Starting text extraction for page {page_id} with image: {image_path}")
#     try:
#         if client is None:
#             print("Cannot extract text - Azure OpenAI client not initialized")
#             return {
#                 "success": False,
#                 "error": "Azure OpenAI client not initialized"
#             }
        
#         if not os.path.exists(image_path):
#             print(f"Image file not found: {image_path}")
#             return {
#                 "success": False,
#                 "error": f"Image file not found: {image_path}"
#             }
            
#         # Prepare image for GPT Vision
#         print(f"Reading image file and preparing request...")
#         with open(image_path, "rb") as image_file:
#             image_data = image_file.read()
#             b64_image = base64.b64encode(image_data).decode('utf-8')
            
#             # Call GPT Vision API
#             print(f"Calling GPT Vision API with model: {VISION_DEPLOYMENT_NAME}")
#             try:
#                 response = client.chat.completions.create(
#                     model=VISION_DEPLOYMENT_NAME,  # Use Azure deployment name
#                     messages=[
#                         {
#                             "role": "user",
#                             "content": [
#                                 {"type": "text", "text": "Extract all text from this PDF page. Preserve the formatting, including paragraphs, lists, and other structures. MAke sure the m-dash, n-dash, dobuble codesReturn the result as plain text."},
#                                 {
#                                     "type": "image_url",
#                                     "image_url": {
#                                         "url": f"data:image/jpeg;base64,{b64_image}",
#                                     }
#                                 }
#                             ]
#                         }
#                     ],
#                     max_tokens=4096
#                 )
                
#                 print("Successfully received response from GPT Vision API")
                
#                 # Extract text from response
#                 extracted_text = response.choices[0].message.content
#                 print(f"Extracted text length: {len(extracted_text)} characters")
#             except Exception as api_error:
#                 print(f"ERROR calling GPT Vision API: {str(api_error)}")
#                 return {
#                     "success": False,
#                     "error": f"API call failed: {str(api_error)}"
#                 }
            
#             # Create basic JSON structure for formatting (simple example)
#             formatted_text = json.dumps({
#                 "blocks": [
#                     {
#                         "type": "paragraph",
#                         "text": extracted_text
#                     }
#                 ]
#             })
            
#             # Update database with extracted text
#             page = db.query(Page).filter(Page.id == page_id).first()
#             if page:
#                 # Create or update extracted text record
#                 if page.extracted_text:
#                     page.extracted_text.raw_text = extracted_text
#                     page.extracted_text.formatted_text = formatted_text
#                 else:
#                     db_extracted_text = ExtractedText(
#                         page_id=page_id,
#                         raw_text=extracted_text,
#                         formatted_text=formatted_text
#                     )
#                     db.add(db_extracted_text)
                
#                 # Update page status
#                 page.status = "processed"
#                 db.commit()
#                 print(f"Successfully updated database with extracted text for page {page_id}")
                
#                 return {
#                     "success": True,
#                     "page_id": page_id,
#                     "text_length": len(extracted_text)
#                 }
#             else:
#                 print(f"Page not found in database: {page_id}")
#                 return {
#                     "success": False,
#                     "error": "Page not found in database"
#                 }
                
#     except Exception as e:
#         print(f"ERROR during text extraction: {str(e)}")
#         # Update page status to error
#         page = db.query(Page).filter(Page.id == page_id).first()
#         if page:
#             page.status = "error"
#             db.commit()
            
#         return {
#             "success": False,
#             "error": str(e)
#         } 

import os
import json
import base64
from openai import AzureOpenAI
from sqlalchemy.orm import Session
import logging

from app.db.models import Page, ExtractedText

# Setup logging
logger = logging.getLogger(__name__)

# Add debug prints for troubleshooting
print("==== Text Extraction Service Initialization ====")
print(f"AZURE_OPENAI_API_KEY: {'[SET]' if os.getenv('AZURE_OPENAI_API_KEY') else '[NOT SET]'}")
print(f"AZURE_OPENAI_API_VERSION: {os.getenv('AZURE_OPENAI_API_VERSION')}")
print(f"AZURE_OPENAI_ENDPOINT: {os.getenv('AZURE_OPENAI_ENDPOINT')}")
print(f"AZURE_OPENAI_DEPLOYMENT: {os.getenv('AZURE_OPENAI_DEPLOYMENT')}")

# Initialize Azure OpenAI client
try:
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2023-12-01-preview")  # Default to stable version
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    VISION_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    
    print(f"Attempting to initialize AzureOpenAI client with:")
    print(f"- API version: {api_version}")
    print(f"- Endpoint: {azure_endpoint}")
    print(f"- Deployment: {VISION_DEPLOYMENT_NAME}")
    
    if not all([api_key, azure_endpoint, VISION_DEPLOYMENT_NAME, api_version]):
        logger.warning("Missing Azure OpenAI credentials. Vision extraction may not work.")
        print("MISSING REQUIRED CREDENTIALS - client will be None")
        client = None
    else:
        try:
            # Import OpenAI to check version
            import openai
            print(f"OpenAI version: {openai.__version__}")
            
            # Simple initialization without any extra parameters that might cause issues
            client = AzureOpenAI(
                api_key=api_key,
                api_version=api_version,
                azure_endpoint=azure_endpoint
            )
                
            logger.info("Azure OpenAI Vision service configured successfully")
            print("Client initialized successfully!")
        except Exception as client_error:
            print(f"ERROR initializing client: {str(client_error)}")
            logger.error(f"Error initializing AzureOpenAI client: {str(client_error)}")
            client = None
except Exception as e:
    logger.error(f"Error configuring Azure services: {str(e)}")
    print(f"EXCEPTION during setup: {str(e)}")
    client = None

print(f"Final client status: {'Initialized' if client is not None else 'NOT initialized'}")

def process_layout_markers(text_content: str) -> dict:
    """
    Process layout markers from OCR text and create structured formatting data
    
    Args:
        text_content (str): Raw OCR text with layout markers
        
    Returns:
        dict: Structured formatting data for Word export
    """
    try:
        # Create clean text without markers for raw_text storage
        clean_text = text_content
        for marker in ['[CENTER]', '[INDENT]', '[TITLE]', '[HEADING]']:
            clean_text = clean_text.replace(marker, '')
        
        # Split content into lines for processing
        lines = text_content.split('\n')
        formatted_blocks = []
        current_block = []
        block_number = 0
        
        for line_no, line in enumerate(lines):
            line = line.strip()
            
            # Skip empty lines but preserve paragraph breaks
            if not line:
                if current_block:
                    # End current block
                    block_text = '\n'.join(current_block)
                    if block_text.strip():
                        formatted_blocks.append({
                            "type": "paragraph",
                            "text": block_text.strip(),
                            "block_no": block_number,
                            "alignment": "left",
                            "font_size": 11,
                            "is_bold": False,
                            "is_italic": False
                        })
                        block_number += 1
                    current_block = []
                continue
            
            # Parse layout markers
            alignment = "left"
            font_size = 11
            is_bold = False
            is_title = False
            is_heading = False
            is_indent = False
            
            # Check for markers and remove them from the line
            if '[CENTER]' in line:
                alignment = "center"
                line = line.replace('[CENTER]', '').strip()
                
            if '[TITLE]' in line:
                is_title = True
                is_bold = True
                font_size = 16
                line = line.replace('[TITLE]', '').strip()
                
            if '[HEADING]' in line:
                is_heading = True
                is_bold = True
                font_size = 13
                line = line.replace('[HEADING]', '').strip()
                
            if '[INDENT]' in line:
                is_indent = True
                line = line.replace('[INDENT]', '').strip()
            
            # If we have markers that indicate a new block, finish current block first
            if (alignment == "center" or is_title or is_heading) and current_block:
                block_text = '\n'.join(current_block)
                if block_text.strip():
                    formatted_blocks.append({
                        "type": "paragraph",
                        "text": block_text.strip(),
                        "block_no": block_number,
                        "alignment": "left",
                        "font_size": 11,
                        "is_bold": False,
                        "is_italic": False
                    })
                    block_number += 1
                current_block = []
            
            # Add the processed line
            if line:  # Only add non-empty lines
                if alignment == "center" or is_title or is_heading:
                    # These create their own blocks
                    formatted_blocks.append({
                        "type": "paragraph",
                        "text": line,
                        "block_no": block_number,
                        "alignment": alignment,
                        "font_size": font_size,
                        "is_bold": is_bold,
                        "is_italic": False,
                        "is_title": is_title,
                        "is_heading": is_heading,
                        "is_indent": is_indent
                    })
                    block_number += 1
                else:
                    # Regular text - add to current block
                    if is_indent:
                        line = "    " + line  # Add indentation
                    current_block.append(line)
        
        # Process any remaining block
        if current_block:
            block_text = '\n'.join(current_block)
            if block_text.strip():
                formatted_blocks.append({
                    "type": "paragraph",
                    "text": block_text.strip(),
                    "block_no": block_number,
                    "alignment": "left",
                    "font_size": 11,
                    "is_bold": False,
                    "is_italic": False
                })
        
        # Return structured data similar to what WordGenerator expects
        return {
            "blocks": formatted_blocks,
            "clean_text": clean_text.strip(),
            "has_formatting": len([b for b in formatted_blocks if b.get('alignment') != 'left' or b.get('is_bold') or b.get('font_size') != 11]) > 0
        }
        
    except Exception as e:
        print(f"Error processing layout markers: {e}")
        # Fallback to simple block structure
        return {
            "blocks": [{
                "type": "paragraph",
                "text": text_content,
                "block_no": 0,
                "alignment": "left",
                "font_size": 11,
                "is_bold": False,
                "is_italic": False
            }],
            "clean_text": text_content,
            "has_formatting": False
        }

async def extract_text_with_gpt_vision(page_id: int, image_path: str, db: Session):
    """Extract text from page image using Azure OpenAI's GPT Vision model"""
    print(f"Starting text extraction for page {page_id} with image: {image_path}")
    try:
        if client is None:
            print("Cannot extract text - Azure OpenAI client not initialized")
            return {
                "success": False,
                "error": "Azure OpenAI client not initialized"
            }
        
        if not os.path.exists(image_path):
            print(f"Image file not found: {image_path}")
            return {
                "success": False,
                "error": f"Image file not found: {image_path}"
            }
            
        # Prepare image for GPT Vision
        print(f"Reading image file and preparing request...")
        with open(image_path, "rb") as image_file:
            image_data = image_file.read()
            b64_image = base64.b64encode(image_data).decode('utf-8')
            
            # Call GPT Vision API
            print(f"Calling GPT Vision API with model: {VISION_DEPLOYMENT_NAME}")
            try:
                response = client.chat.completions.create(
                    model=VISION_DEPLOYMENT_NAME,  # Use Azure deployment name
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": """You are a document reconstruction assistant.

You will be shown a scanned image of a printed document. Your task is to extract ALL text exactly as it appears, preserving maximum accuracy and layout awareness.

CRITICAL ACCURACY INSTRUCTIONS:
- Transcribe each word and character as literally and faithfully as possible, exactly as they appear in the image
- Preserve any apparent spelling errors, old spellings, inconsistent punctuation, or misprints; do NOT correct or "normalize" them
- If a word looks unusual but is as shown in the image, keep it unchanged
- If characters or ligatures appear unique or ambiguous, match the visual form as closely as possible

SPECIAL CHARACTER HANDLING:
- Accurately represent special characters like en-dash (–), em-dash (—), soft hyphens (­), curly quotes ("), smart quotes ("), and apostrophes (')
- Preserve bullet points (•, ◦, ▪, ■) and special symbols (©, ®, ™, §, ¶) exactly as shown
- Maintain any accented characters (é, ñ, ü, etc.) and foreign language text precisely
- Keep mathematical symbols (±, ≤, ≥, ∞, °) and fractions as they appear

LAYOUT AND FORMATTING AWARENESS:
- Preserve paragraph structure and visual alignment as seen in the image
- Maintain line breaks that appear to be intentional paragraph separations
- Keep centered text alignment when clearly visible
- Preserve any visible indentation patterns
- Recognize and maintain numbered/bulleted lists structure
- Maintain spacing between sections when visually apparent

TEXT STRUCTURE WITH LAYOUT MARKERS:
Use these simple markers to indicate layout while keeping the output as plain text:

[CENTER] - Place before text that appears visually centered
[INDENT] - Place before text that is clearly indented
[TITLE] - Place before text that appears to be a title or heading (larger/bold)
[HEADING] - Place before text that appears to be a heading (emphasizes)

RETURN FORMAT:
- Return ONLY the extracted text content with layout markers
- Use double line breaks (\\n\\n) to separate distinct paragraphs  
- Use single line breaks (\\n) for lines within the same paragraph
- Do NOT use any other markup, formatting codes, or explanations
- Do NOT add commentary or notes about the extraction process
- Ensure the text flows naturally and maintains the document's logical reading order
- If the page appears to be completely blank or contains no readable text, return an empty response

EXAMPLE OUTPUT FORMAT:
[CENTER][TITLE]MAIN TITLE
[CENTER]Subtitle or Publisher
[CENTER]Website URL

[HEADING]Section Heading
Regular paragraph text that flows normally and maintains 
the original structure as seen in the document.

[INDENT]Indented paragraph or bullet point
[INDENT]Another indented item

Extract all visible text with maximum fidelity to the original document."""},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{b64_image}",
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=4096
                )
                
                print("Successfully received response from GPT Vision API")
                
                # Extract text from response
                extracted_text = response.choices[0].message.content
                print(f"Extracted text length: {len(extracted_text)} characters")
                
                # Check if page has any meaningful text content
                if not extracted_text or not extracted_text.strip():
                    print(f"Page {page_id} contains no text content - skipping")
                    # Update page status to indicate no text found
                    page = db.query(Page).filter(Page.id == page_id).first()
                    if page:
                        page.status = "no_text"
                        db.commit()
                    
                    return {
                        "success": True,
                        "page_id": page_id,
                        "text_length": 0,
                        "message": "Page contains no text content - skipped"
                    }
                
                # Additional check for pages with only whitespace or minimal content
                cleaned_text = extracted_text.strip()
                if len(cleaned_text) < 3:  # Less than 3 characters is likely noise
                    print(f"Page {page_id} contains minimal text content ({len(cleaned_text)} chars) - skipping")
                    # Update page status to indicate minimal text found
                    page = db.query(Page).filter(Page.id == page_id).first()
                    if page:
                        page.status = "minimal_text"
                        db.commit()
                    
                    return {
                        "success": True,
                        "page_id": page_id,
                        "text_length": len(cleaned_text),
                        "message": f"Page contains minimal text content ({len(cleaned_text)} chars) - skipped"
                    }
                
                # Process layout markers and create structured formatting
                formatted_data = process_layout_markers(extracted_text)
                formatted_text_json = json.dumps(formatted_data)
            except Exception as api_error:
                print(f"ERROR calling GPT Vision API: {str(api_error)}")
                return {
                    "success": False,
                    "error": f"API call failed: {str(api_error)}"
                }
            
            # Update database with extracted text
            page = db.query(Page).filter(Page.id == page_id).first()
            if page:
                # Create or update extracted text record
                if page.extracted_text:
                    page.extracted_text.raw_text = extracted_text
                    page.extracted_text.formatted_text = formatted_text_json
                else:
                    db_extracted_text = ExtractedText(
                        page_id=page_id,
                        raw_text=extracted_text,
                        formatted_text=formatted_text_json
                    )
                    db.add(db_extracted_text)
                
                # Update page status
                page.status = "processed"
                db.commit()
                print(f"Successfully updated database with extracted text for page {page_id}")
                
                return {
                    "success": True,
                    "page_id": page_id,
                    "text_length": len(extracted_text)
                }
            else:
                print(f"Page not found in database: {page_id}")
                return {
                    "success": False,
                    "error": "Page not found in database"
                }
                
    except Exception as e:
        print(f"ERROR during text extraction: {str(e)}")
        # Update page status to error
        page = db.query(Page).filter(Page.id == page_id).first()
        if page:
            page.status = "error"
            db.commit()
            
        return {
            "success": False,
            "error": str(e)
        }