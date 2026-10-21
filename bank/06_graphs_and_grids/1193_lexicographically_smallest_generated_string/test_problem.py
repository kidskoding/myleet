from solution import generate_string


def test_generate_string_example_one():
    assert generate_string("TFTF", "ab") == "ababa"


def test_generate_string_impossible():
    assert generate_string("TFTF", "abc") == ""


def test_generate_string_single_f():
    assert generate_string("F", "d") == "a"


def test_generate_string_all_t():
    assert generate_string("TTT", "a") == "aaa"


def test_generate_string_break_f_with_b():
    assert generate_string("F", "a") == "b"
