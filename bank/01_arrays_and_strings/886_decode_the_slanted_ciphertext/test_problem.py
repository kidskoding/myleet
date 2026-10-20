from solution import decode_ciphertext


def test_decode_ciphertext_example():
    assert decode_ciphertext("ch   ie   pr", 3) == "cipher"


def test_decode_ciphertext_with_spaces():
    assert decode_ciphertext("iveo    eed   l te   olc", 4) == "i love leetcode"


def test_decode_ciphertext_single_row():
    assert decode_ciphertext("coding", 1) == "coding"


def test_decode_ciphertext_empty():
    assert decode_ciphertext("", 5) == ""


def test_decode_ciphertext_strips_trailing_padding():
    assert decode_ciphertext("a   b   c", 3) == "abc"


def test_decode_ciphertext_internal_space_kept():
    assert decode_ciphertext("a d bc", 2) == "ab cd"
