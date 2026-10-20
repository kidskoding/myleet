from solution import decode_string


def test_decode_string_simple_repeat():
    assert decode_string("3[a]2[bc]") == "aaabcbc"


def test_decode_string_nested():
    assert decode_string("3[a2[c]]") == "accaccacc"


def test_decode_string_no_brackets():
    assert decode_string("abc") == "abc"
