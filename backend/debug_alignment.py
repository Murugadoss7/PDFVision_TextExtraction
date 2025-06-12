#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.wordextract import parse_html_to_word_format, WordGenerator
from app.api.routes.documents import parse_html_to_word_format as api_parse_html_to_word_format

def test_alignment_conversion():
    print("=== Testing HTML to Word Alignment Conversion ===\n")
    
    # Test HTML that should have center alignment like CKEditor outputs
    test_html = '''<div style="text-align: center">
<p>BEACON PRESS</p>
<p>TestingBoston, Massachusettswww.beacon.org</p>
</div>
<p>Beacon Press booksare published under the auspices ofthe Unitarian Universalist Association of Congregations.</p>'''
    
    print("1. Input HTML:")
    print(test_html)
    print()
    
    # Test the wordextract.py function directly
    print("2. Testing parse_html_to_word_format from wordextract.py:")
    try:
        blocks = parse_html_to_word_format(test_html)
        print(f"Parsed {len(blocks)} blocks:")
        for i, block in enumerate(blocks):
            print(f"  Block {i}: text='{block['text'][:50]}...', alignment='{block.get('alignment', 'None')}'")
    except Exception as e:
        print(f"Error in wordextract.py parsing: {e}")
        import traceback
        traceback.print_exc()
    print()
    
    # Test the API route function
    print("3. Testing parse_html_to_word_format from API routes:")
    try:
        api_blocks = api_parse_html_to_word_format(test_html, 1)
        print(f"API parsed {len(api_blocks)} blocks:")
        for i, block in enumerate(api_blocks):
            print(f"  Block {i}: text='{block['text'][:50]}...', alignment='{block.get('alignment', 'None')}'")
    except Exception as e:
        print(f"Error in API parsing: {e}")
        import traceback
        traceback.print_exc()
    print()
    
    # Test Word generation
    print("4. Testing Word document generation:")
    try:
        # Use the blocks from wordextract.py
        if 'blocks' in locals():
            # Convert to format expected by WordGenerator
            formatted_text = []
            for i, block in enumerate(blocks):
                formatted_text.append({
                    'text': block['text'],
                    'page': 1,
                    'block_no': i,
                    'line_no': 0,
                    'font': 'Calibri',
                    'size': 11,
                    'color': (0, 0, 0),
                    'is_bold': block.get('bold', False),
                    'is_italic': block.get('italic', False), 
                    'alignment': block.get('alignment', 'left'),
                    'is_title': False,
                    'is_heading': False,
                    'is_indent': False,
                    'is_last_span_in_line': True,
                    'bbox': [0, 0, 100, 20]
                })
                print(f"  WordGen Block {i}: text='{formatted_text[i]['text'][:30]}...', alignment='{formatted_text[i]['alignment']}'")
            
            print(f"Creating Word document with {len(formatted_text)} blocks...")
            generator = WordGenerator(formatted_text)
            generator.generate_document('debug_alignment_test.docx')
            print("Word document created: debug_alignment_test.docx")
        else:
            print("No blocks to generate Word document")
    except Exception as e:
        print(f"Error in Word generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_alignment_conversion() 