#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.wordextract import parse_html_to_word_format, WordGenerator

def test_generic_alignment():
    print("=== Testing GENERIC Alignment Solution ===\n")
    
    # Test with completely different content - medical document
    test_html1 = '''<div style="text-align: center">
<h1>MEDICAL RECORDS</h1>
<p>St. Mary's Hospital</p>
<p>Patient ID: 12345</p>
</div>
<p>Patient Name: John Smith</p>
<p style="text-align: right">Date: 2024-01-15</p>
<p style="text-align: justify">This patient was admitted for routine surgery and recovered well. The procedure was completed without complications and the patient was discharged after 3 days.</p>'''
    
    # Test with legal document content
    test_html2 = '''<div style="text-align: center">
<h2>LEGAL CONTRACT</h2>
<p>Smith & Associates Law Firm</p>
</div>
<p>WHEREAS, the parties agree to the following terms:</p>
<p style="text-align: right">Signature: ________________</p>'''
    
    # Test with technical manual content
    test_html3 = '''<p style="text-align: center">TECHNICAL SPECIFICATIONS</p>
<p>Device Model: TX-9000</p>
<div style="text-align: center">
<p>WARNING: HIGH VOLTAGE</p>
</div>
<p style="text-align: justify">Operating this device requires proper safety precautions. Always wear protective equipment when handling electrical components.</p>'''
    
    test_cases = [
        ("Medical Document", test_html1),
        ("Legal Document", test_html2), 
        ("Technical Manual", test_html3)
    ]
    
    for doc_type, html_content in test_cases:
        print(f"=== {doc_type} ===")
        print("Input HTML:")
        print(html_content)
        print()
        
        try:
            blocks = parse_html_to_word_format(html_content)
            print(f"Parsed {len(blocks)} blocks:")
            for i, block in enumerate(blocks):
                print(f"  Block {i}: text='{block['text'][:40]}...', alignment='{block.get('alignment', 'None')}'")
            
            # Test Word generation
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
            
            doc_filename = f"test_{doc_type.lower().replace(' ', '_')}.docx"
            generator = WordGenerator(formatted_text)
            generator.generate_document(doc_filename)
            print(f"✅ Word document created: {doc_filename}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
        
        print("-" * 50)
        print()

if __name__ == "__main__":
    test_generic_alignment() 