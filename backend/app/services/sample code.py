import os
import fitz  # PyMuPDF
import logging
from pathlib import Path
import json
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
from dotenv import load_dotenv
from openai import AzureOpenAI
import base64
from PIL import Image
import re
import tempfile
import shutil
import io
import string
from .confidence_scorer import ConfidenceScorer

# Load environment variables
load_dotenv()

@dataclass
class TextBlock:
    text: str
    position: Dict
    font: str
    size: float
    line_number: int
    style: Dict
    paragraph_type: str = "text"
    confidence_score: float = 1.0
    verification_status: str = "unverified"
    original_text: str = None
    correction_history: List = None
    potential_issues: List = None
    
    def __post_init__(self):
        if self.original_text is None:
            self.original_text = self.text
        if self.correction_history is None:
            self.correction_history = []
        if self.potential_issues is None:
            self.potential_issues = []

class PDFTextCorrector:
    def __init__(self, pdf_path: str, confidence_config: Dict = None):
        self.pdf_path = pdf_path
        self.blocks = []
        self.logger = self.setup_logging()
        self.configure_azure_services()
        
        # Initialize the confidence scorer
        self.confidence_scorer = ConfidenceScorer(confidence_config)
        
        # Define verification status constants
        self.VERIFICATION_STATUS = {
            "UNVERIFIED": "unverified",
            "VERIFIED": "verified",
            "CORRECTED": "corrected"
        }

    def setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        return logging.getLogger(__name__)
    
    def configure_azure_services(self):
        """Configure Azure services"""
        # Load environment variables
        load_dotenv()
        
        # Azure OpenAI
        try:
            api_key = os.getenv("AZURE_OPENAI_API_KEY")
            api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2023-12-01-preview")
            azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
            self.deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT")
            
            if not all([api_key, azure_endpoint, self.deployment_name]):
                self.logger.warning("Missing Azure OpenAI credentials. Vision extraction may not work.")
                self.vision_available = False
            else:
                self.azure_client = AzureOpenAI(
                    api_key=api_key,
                    api_version=api_version,
                    azure_endpoint=azure_endpoint
                )
                self.vision_available = True
                self.logger.info("Azure OpenAI Vision service configured successfully")
        except Exception as e:
            self.logger.error(f"Error configuring Azure services: {str(e)}")
            self.vision_available = False

    def extract_text(self, page_num: int) -> List[TextBlock]:
        """Extract text from a PDF page using Azure Vision API or fallback methods"""
        self.logger.info(f"Extracting text from page {page_num} using Azure Vision")
        
        try:
            doc = fitz.open(self.pdf_path)
            if page_num > len(doc):
                self.logger.warning(f"Page {page_num} is out of range (document has {len(doc)} pages)")
                return []
                
            page = doc[page_num-1]
            
            # Try Azure Vision API if available
            if self.vision_available:
                try:
                    # Convert page to image
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # Higher resolution for better OCR
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    
                    # Convert image to base64
                    img_byte_arr = io.BytesIO()
                    img.save(img_byte_arr, format='PNG')
                    img_byte_arr = img_byte_arr.getvalue()
                    base64_encoded_image = base64.b64encode(img_byte_arr).decode('utf-8')
                    
                    # Call Azure OpenAI Vision API
                    blocks = self._extract_text_with_azure_vision(base64_encoded_image, page_num)
                    
                    if blocks:
                        self.logger.info(f"Extracted {len(blocks)} text blocks from page {page_num} using Azure Vision")
                        return blocks
                except Exception as e:
                    self.logger.error(f"Azure Vision extraction failed: {str(e)}")
                    self.logger.info("Falling back to basic text extraction")
            
            # Fallback: use basic PyMuPDF text extraction
            self.logger.info(f"Using fallback text extraction for page {page_num}")
            return self._extract_text_fallback(page, page_num)
                
        except Exception as e:
            self.logger.error(f"Error extracting text from page {page_num}: {str(e)}")
            self.logger.exception("Full traceback:")
            return []

    def _extract_text_with_azure_vision(self, base64_image: str, page_num: int) -> List[TextBlock]:
        """Extract text using Azure OpenAI Vision API"""
        try:
            # Construct the prompt for GPT-4 Vision
            prompt = (
                "Extract all text from this scanned document image. "
                "For each text element, I need: \n"
                "1. The exact text content\n"
                "2. The position (approximate x,y coordinates where the text appears on the page)\n"
                "3. Whether the text is a heading, paragraph, or list item\n"
                "Format your response as a JSON array with these fields for each text element."
            )
            
            # Call Azure OpenAI Vision API
            response = self.azure_client.chat.completions.create(
                model=self.deployment_name,
                messages=[
                    {"role": "system", "content": "You are a text extraction assistant that analyzes document images and extracts text content with layout information."},
                    {"role": "user", "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                    ]}
                ],
                max_tokens=4000,
                temperature=0
            )
            
            # Process the response
            content = response.choices[0].message.content
            
            # Try to extract JSON content from the response
            blocks = []
            current_block = 0
            
            # Parse the JSON response - look for JSON data in the response
            json_match = re.search(r'```json(.*?)```', content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1).strip()
            else:
                # Try to find JSON without markdown formatting
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    # Look for JSON object instead of array
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(0)
                    else:
                        # Just try to parse the whole response
                        json_str = content
            
            try:
                # Try to parse the JSON
                extracted_data = json.loads(json_str)
                
                # Handle both array and object formats
                if isinstance(extracted_data, dict) and 'elements' in extracted_data:
                    extracted_elements = extracted_data['elements']
                elif isinstance(extracted_data, list):
                    extracted_elements = extracted_data
                else:
                    extracted_elements = [extracted_data]
                
                # Create TextBlock objects from the extracted data
                for element in extracted_elements:
                    text = element.get('text', '').strip()
                    if not text:
                        continue
                    
                    # Get position information if available
                    position = element.get('position', {})
                    if not position:
                        position = {
                            "x0": element.get('x', 0),
                            "y0": element.get('y', 0),
                            "x1": element.get('x', 0) + 100,  # Default width
                            "y1": element.get('y', 0) + 20    # Default height
                        }
                    else:
                        position = {
                            "x0": position.get('x', 0),
                            "y0": position.get('y', 0),
                            "x1": position.get('x', 0) + position.get('width', 100),
                            "y1": position.get('y', 0) + position.get('height', 20)
                        }
                    
                    # Determine paragraph type
                    p_type = element.get('type', '').lower()
                    if 'heading' in p_type:
                        paragraph_type = 'heading'
                    elif 'list' in p_type:
                        paragraph_type = 'list'
                    else:
                        paragraph_type = 'text'
                    
                    # Get font information if available
                    font = element.get('font', 'Arial')
                    size = element.get('size', 12)
                    is_bold = element.get('is_bold', False)
                    is_italic = element.get('is_italic', False)
                    
                    # Create TextBlock
                    block = TextBlock(
                        text=text,
                        position=position,
                        font=font,
                        size=size,
                        line_number=current_block,
                        style={
                            'font_style': 'italic' if is_italic else 'normal',
                            'font_weight': 'bold' if is_bold else 'normal',
                            'font_family': font,
                            'font_size': size,
                            'color': '#000000'
                        },
                        paragraph_type=paragraph_type,
                        confidence_score=0.95  # High confidence since using GPT Vision
                    )
                    blocks.append(block)
                    current_block += 1
                
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract text based on structure
                self.logger.warning("Failed to parse JSON response. Attempting to extract text based on structure.")
                
                # Simple regex-based extraction as fallback
                text_matches = re.findall(r'"text"\s*:\s*"([^"]+)"', content)
                for i, text in enumerate(text_matches):
                    if text.strip():
                        block = TextBlock(
                            text=text,
                            position={"x0": 0, "y0": i*20, "x1": 100, "y1": i*20+20},
                            font="Arial",
                            size=12,
                            line_number=i,
                            style={
                                'font_style': 'normal',
                                'font_weight': 'normal',
                                'font_family': 'Arial',
                                'font_size': 12,
                                'color': '#000000'
                            },
                            paragraph_type="text",
                            confidence_score=0.8
                        )
                        blocks.append(block)
            
            # If no structured data was extracted, use the entire response as a single block
            if not blocks:
                # Clean the content of markdown formatting
                cleaned_content = re.sub(r'```json|```', '', content).strip()
                block = TextBlock(
                    text=cleaned_content,
                    position={"x0": 0, "y0": 0, "x1": 500, "y1": 500},
                    font="Arial",
                    size=12,
                    line_number=0,
                    style={
                        'font_style': 'normal',
                        'font_weight': 'normal',
                        'font_family': 'Arial',
                        'font_size': 12,
                        'color': '#000000'
                    },
                    paragraph_type="text",
                    confidence_score=0.7
                )
                blocks.append(block)
            
            # Sort blocks by vertical position
            blocks.sort(key=lambda b: b.position['y0'])
            return blocks
            
        except Exception as e:
            self.logger.error(f"Error extracting text with Azure Vision: {str(e)}")
            self.logger.exception("Full traceback:")
            return []
            
    def _extract_text_fallback(self, page, page_num):
        """Extract text using PyMuPDF's basic text extraction when Vision API is not available"""
        blocks = []
        current_block = 0
        
        # Extract text blocks using PyMuPDF
        dict_blocks = page.get_text("dict")["blocks"]
        
        for block_idx, block in enumerate(dict_blocks):
            if "lines" in block:
                for line_idx, line in enumerate(block["lines"]):
                    for span in line["spans"]:
                        if not span["text"].strip():
                            continue
                        
                        # Create text block
                        text_block = TextBlock(
                            text=span["text"],
                            position={
                                "x0": span["bbox"][0],
                                "y0": span["bbox"][1],
                                "x1": span["bbox"][2],
                                "y1": span["bbox"][3]
                            },
                            font=span.get("font", "Arial"),
                            size=span.get("size", 12),
                            line_number=current_block,
                            style={
                                'font_style': 'italic' if 'italic' in span.get("font", "").lower() else 'normal',
                                'font_weight': 'bold' if 'bold' in span.get("font", "").lower() else 'normal',
                                'font_family': span.get("font", "Arial"),
                                'font_size': span.get("size", 12),
                                'color': '#000000'
                            },
                            paragraph_type="text",
                            confidence_score=0.9  # Default confidence since not from OCR
                        )
                        blocks.append(text_block)
                        current_block += 1
        
        self.logger.info(f"Extracted {len(blocks)} text blocks using fallback method from page {page_num}")
        return blocks

    def _estimate_paragraph_type(self, text: str) -> str:
        """Estimate paragraph type based on text content and length"""
        text = text.strip()
        
        # Check if it's a heading (short text with few words)
        if len(text) < 100 and len(text.split()) < 10:
            return "heading"
        
        # Check if it's a list item
        if text.startswith(('•', '-', '*', '1.', '2.')):
            return "list"
            
        return "text"

    def process_page(self, page_num: int) -> None:
        """Process a single page"""
        try:
            self.logger.info(f"Processing page {page_num}")
            
            # Extract text using Azure Vision or fallback
            self.blocks = self.extract_text(page_num)
            
            if not self.blocks:
                self.logger.warning(f"No text blocks found on page {page_num}")
                return
            
            self.logger.info(f"Found {len(self.blocks)} text blocks on page {page_num}")
            
        except Exception as e:
            self.logger.error(f"Error processing page {page_num}: {str(e)}")
            self.logger.exception("Full traceback:")
            raise

    def extract_text_with_formatting(self) -> list:
        """Extract and format text from all pages, compatible with PyMuPDF output format"""
        try:
            doc = fitz.open(self.pdf_path)
            result = []
            page_start_indices = {}
            
            for page_num in range(1, len(doc) + 1):
                # Record the start index for this page
                page_start_indices[page_num] = len(result)
                
                # Process the page
                self.process_page(page_num)
                
                # Add resulting blocks to the formatted output
                for block in self.blocks:
                    # Check if the block belongs to the current page
                    if getattr(block, 'page', 0) == page_num:
                        # Prepare metadata for confidence scoring
                        metadata = {
                            "font": block.font,
                            "size": block.size,
                            "is_bold": "bold" in block.style.get("font_weight", "").lower() if block.style else False,
                            "is_italic": "italic" in block.style.get("font_style", "").lower() if block.style else False,
                            "bbox": [
                                block.position.get("x0", 0), 
                                block.position.get("y0", 0),
                                block.position.get("x1", 100), 
                                block.position.get("y1", 20)
                            ],
                            "page": page_num,
                            "block_no": getattr(block, 'block_number', 0),
                            "line_no": block.line_number
                        }
                        
                        # Use confidence scorer to calculate confidence and identify issues
                        confidence_score = self.confidence_scorer.calculate_confidence(block.text, metadata)
                        potential_issues = self.confidence_scorer.identify_issues(block.text, metadata)
                        
                        # Adjust confidence based on source data (Vision API typically has good OCR)
                        confidence_category = self.confidence_scorer.get_confidence_category(confidence_score)
                        
                        # Convert TextBlock to the format expected by the viewer
                        formatted_block = {
                            "text": block.text,
                            "font": block.font,
                            "size": block.size,
                            "color": (0, 0, 0),  # Default color
                            "is_bold": "bold" in block.style.get("font_weight", "").lower() if block.style else False,
                            "is_italic": "italic" in block.style.get("font_style", "").lower() if block.style else False,
                            "page": page_num,
                            "bbox": [
                                block.position.get("x0", 0), 
                                block.position.get("y0", 0),
                                block.position.get("x1", 100), 
                                block.position.get("y1", 20)
                            ],
                            "block_no": getattr(block, 'block_number', 0),
                            "line_no": block.line_number,
                            "is_last_span_in_line": True,  # Simplification since we don't have span information
                            "is_first_span_in_line": True,
                            # Enhanced error detection and verification fields
                            "confidence_score": confidence_score,
                            "confidence_category": confidence_category,
                            "verification_status": self.VERIFICATION_STATUS["UNVERIFIED"],
                            "original_text": block.original_text or block.text,
                            "correction_history": block.correction_history or [],
                            "potential_issues": potential_issues
                        }
                        result.append(formatted_block)
            
            # Record the total length
            page_start_indices["total"] = len(result)
            
            # Add page mapping metadata
            if result:
                result[0]["_page_mapping"] = page_start_indices
                # Add error detection metadata
                result[0]["_error_detection_metadata"] = {
                    "total_issues": sum(1 for item in result if item.get("potential_issues")),
                    "extraction_method": "vision_api",
                    "confidence_threshold": self.confidence_scorer.config["thresholds"]["medium_confidence"],
                    "extraction_timestamp": datetime.now().isoformat(),
                    "confidence_config": self.confidence_scorer.get_config()
                }
            
            return result
        except Exception as e:
            self.logger.error(f"Error in extract_text_with_formatting: {str(e)}")
            return []

    def update_confidence_config(self, config: Dict) -> None:
        """
        Update the confidence scoring configuration.
        
        Args:
            config (Dict): New configuration options
        """
        self.confidence_scorer.update_config(config)

    def get_extraction_issues(self, formatted_text: List[Dict], confidence_threshold: float = None) -> List[Dict]:
        """
        Get all extraction issues from the formatted text.
        
        Args:
            formatted_text (List[Dict]): The extracted text data
            confidence_threshold (float, optional): Confidence threshold below which text is considered an issue
            
        Returns:
            List[Dict]: List of issues with their locations and details
        """
        # Use provided threshold or default from config
        if confidence_threshold is None:
            confidence_threshold = self.confidence_scorer.config["thresholds"]["medium_confidence"]
        
        issues = []
        
        for idx, item in enumerate(formatted_text):
            # Skip metadata elements
            if idx == 0 and "_page_mapping" in item:
                continue
            
            # Check confidence score against threshold
            if item.get("confidence_score", 1.0) < confidence_threshold or item.get("potential_issues"):
                issue = {
                    "index": idx,
                    "page": item.get("page"),
                    "block_no": item.get("block_no"),
                    "line_no": item.get("line_no"),
                    "text": item.get("text"),
                    "confidence": item.get("confidence_score", 1.0),
                    "confidence_category": item.get("confidence_category", "unknown"),
                    "issues": item.get("potential_issues", []),
                    "verification_status": item.get("verification_status", self.VERIFICATION_STATUS["UNVERIFIED"])
                }
                issues.append(issue)
        
        return issues

def main():
    """Test function for extracting text from a PDF."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python extractor_GPTVision.py <pdf_file> [page_number]")
        return
        
    pdf_path = sys.argv[1]
    page_number = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    
    corrector = PDFTextCorrector(pdf_path)
    
    if len(sys.argv) > 2:
        # Process single page
        corrector.process_page(page_number)
        # Print extracted text
        for block in corrector.blocks:
            print(f"Text: {block.text}")
            print(f"Position: {block.position}")
            print(f"Confidence: {block.confidence_score}")
            print("-" * 50)
    else:
        # Process all pages
        formatted_text = corrector.extract_text_with_formatting()
        print(f"Extracted {len(formatted_text)} text elements from all pages")
        # Print sample of the first few elements
        for i, text in enumerate(formatted_text[:5]):
            print(f"Element {i}: {text['text']}")
            print(f"Page: {text['page']}, Block: {text['block_no']}")
            print("-" * 50)

if __name__ == "__main__":
    main() 