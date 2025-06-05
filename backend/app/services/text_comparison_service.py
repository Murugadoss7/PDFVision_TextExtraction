import difflib
import logging
from typing import List, Dict, Any, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TextComparisonService:
    def compare_texts(self, text_a: str, text_b: str) -> List[Dict[str, Any]]:
        """
        Compares two texts (Text A - OCR, Text B - Editable PDF) and returns structured differences.

        Args:
            text_a (str): The OCR'd text from Document A.
            text_b (str): The extracted text from Document B's existing layer.

        Returns:
            List[Dict[str, Any]]: A list of dictionaries, where each dictionary represents a difference.
                                  Each dictionary contains:
                                  - 'type': Type of change ('replace', 'delete', 'insert', 'equal').
                                  - 'original_text_a_segment': The segment from text_a involved in the diff.
                                  - 'suggested_text_b_segment': The segment from text_b involved in the diff.
                                  - 'a_start_index': Start index in text_a for this segment.
                                  - 'a_end_index': End index in text_a for this segment.
                                  - 'b_start_index': Start index in text_b for this segment.
                                  - 'b_end_index': End index in text_b for this segment.
        """
        differences = []
        try:
            logger.info(f"TextComparisonService: Starting comparison between Text A (len: {len(text_a)}) and Text B (len: {len(text_b)}).")
            
            # Using SequenceMatcher to find differing blocks
            # We split by lines first for a more robust comparison, then could go finer.
            # For simplicity here, we'll compare word by word by splitting the string.
            # A more sophisticated approach might involve NLP sentence tokenization.
            
            words_a = text_a.split() # Simplistic word tokenization
            words_b = text_b.split() # Simplistic word tokenization

            logger.info(f"TextComparisonService: Split into {len(words_a)} words (A) and {len(words_b)} words (B).")

            matcher = difflib.SequenceMatcher(None, words_a, words_b, autojunk=False)
            
            # To map word indices back to character indices, we need to track original positions.
            # This is a simplified example. Real-world scenarios need more robust index mapping.
            # We'll store (start_char_index, end_char_index) for each word.

            def get_char_indices(text_content: str, word_list: List[str]) -> List[Tuple[int, int]]:
                indices = []
                current_pos = 0
                for word in word_list:
                    # Skip whitespace to find the start of the next word
                    while current_pos < len(text_content) and text_content[current_pos].isspace():
                        current_pos += 1
                    
                    start = current_pos
                    end = start + len(word)
                    
                    # Validate that we're actually at the expected word
                    if start < len(text_content) and end <= len(text_content):
                        actual_word = text_content[start:end]
                        if actual_word == word:
                            indices.append((start, end))
                            current_pos = end
                        else:
                            # Fallback: try to find the word from current position
                            word_start = text_content.find(word, current_pos)
                            if word_start != -1:
                                indices.append((word_start, word_start + len(word)))
                                current_pos = word_start + len(word)
                            else:
                                # Last resort: use current position
                                indices.append((current_pos, current_pos + len(word)))
                                current_pos += len(word)
                    else:
                        # Handle edge case where we've reached end of text
                        indices.append((start, min(end, len(text_content))))
                        current_pos = len(text_content)
                
                return indices

            indices_a = get_char_indices(text_a, words_a)
            indices_b = get_char_indices(text_b, words_b)

            logger.info(f"TextComparisonService: Calculated {len(indices_a)} char indices for A, {len(indices_b)} for B.")

            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                original_segment_a_words = words_a[i1:i2]
                suggested_segment_b_words = words_b[j1:j2]

                # Get character indices for segments
                # This is simplified: it takes the start of the first word and end of the last word
                a_start_char = indices_a[i1][0] if i1 < len(indices_a) else (indices_a[i1-1][1] if i1 > 0 else 0)
                a_end_char = indices_a[i2-1][1] if i2 > 0 and i2 <= len(indices_a) else (indices_a[i1-1][1] if i1 > 0 else 0)
                if not original_segment_a_words and i2 > 0 and i1 == i2 : # Handle insertions relative to end of previous A segment
                     a_start_char = indices_a[i2-1][1] if i2 > 0 else 0
                     a_end_char = a_start_char
                elif not original_segment_a_words and i1 == 0 and i2 == 0: # Handle insertion at the beginning
                     a_start_char = 0
                     a_end_char = 0
                
                b_start_char = indices_b[j1][0] if j1 < len(indices_b) else (indices_b[j1-1][1] if j1 > 0 else 0)
                b_end_char = indices_b[j2-1][1] if j2 > 0 and j2 <= len(indices_b) else (indices_b[j1-1][1] if j1 > 0 else 0)
                if not suggested_segment_b_words and j2 > 0 and j1 == j2: # Handle deletions relative to end of previous B segment
                    b_start_char = indices_b[j2-1][1] if j2 > 0 else 0
                    b_end_char = b_start_char
                elif not suggested_segment_b_words and j1 == 0 and j2 == 0: # Handle deletion at the beginning
                    b_start_char = 0
                    b_end_char = 0

                diff = {
                    'type': tag,
                    'original_text_a_segment': " ".join(original_segment_a_words),
                    'suggested_text_b_segment': " ".join(suggested_segment_b_words),
                    'a_start_index': a_start_char, 
                    'a_end_index': a_end_char,
                    'b_start_index': b_start_char,
                    'b_end_index': b_end_char,
                }
                
                logger.debug(f"TextComparisonService: Diff {tag} - A[{a_start_char}:{a_end_char}]='{diff['original_text_a_segment']}', B[{b_start_char}:{b_end_char}]='{diff['suggested_text_b_segment']}'")
                
                differences.append(diff)
            
            logger.info(f"TextComparisonService: Successfully compared texts, {len(differences)} opcodes generated.")
            return differences
        except Exception as e:
            logger.error(f"TextComparisonService: Error during text comparison: {e}")
            return []

if __name__ == '__main__':
    # Example Usage
    service = TextComparisonService()
    text_a_sample = "This is the first OCR text from document A. It might contain some errors."
    text_b_sample = "This is the first editable text from document B. It should be quite accurate."
    
    print(f"Comparing:\nText A: {text_a_sample}\nText B: {text_b_sample}\n")
    comparison_result = service.compare_texts(text_a_sample, text_b_sample)

    if comparison_result:
        for diff_item in comparison_result:
            print(f"Type: {diff_item['type']}")
            print(f"  Original (A): '{diff_item['original_text_a_segment']}' (Indices: {diff_item['a_start_index']}-{diff_item['a_end_index']})")
            print(f"  Suggested (B): '{diff_item['suggested_text_b_segment']}' (Indices: {diff_item['b_start_index']}-{diff_item['b_end_index']})")
            print("---")
    else:
        print("No differences found or an error occurred.")

    text_c_sample = "The quick brown fox."
    text_d_sample = "The slow yellow cat."
    print(f"Comparing:\nText C: {text_c_sample}\nText D: {text_d_sample}\n")
    comparison_result_2 = service.compare_texts(text_c_sample, text_d_sample)
    if comparison_result_2:
        for diff_item in comparison_result_2:
            print(f"Type: {diff_item['type']}")
            print(f"  Original (C): '{diff_item['original_text_a_segment']}' (Indices: {diff_item['a_start_index']}-{diff_item['a_end_index']})")
            print(f"  Suggested (D): '{diff_item['suggested_text_b_segment']}' (Indices: {diff_item['b_start_index']}-{diff_item['b_end_index']})")
            print("---")

    text_e_sample = "Hello world"
    text_f_sample = "Hello beautiful world"
    print(f"Comparing:\nText E: {text_e_sample}\nText F: {text_f_sample}\n")
    comparison_result_3 = service.compare_texts(text_e_sample, text_f_sample)
    if comparison_result_3:
        for diff_item in comparison_result_3:
            print(f"Type: {diff_item['type']}")
            print(f"  Original (E): '{diff_item['original_text_a_segment']}' (Indices: {diff_item['a_start_index']}-{diff_item['a_end_index']})")
            print(f"  Suggested (F): '{diff_item['suggested_text_b_segment']}' (Indices: {diff_item['b_start_index']}-{diff_item['b_end_index']})")
            print("---") 