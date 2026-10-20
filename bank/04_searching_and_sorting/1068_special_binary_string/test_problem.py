from solution import make_largest_special


def test_make_largest_special_example():
    assert make_largest_special("11011000") == "11100100"


def test_make_largest_special_minimal():
    assert make_largest_special("10") == "10"


def test_make_largest_special_equal_blocks():
    assert make_largest_special("1010") == "1010"


def test_make_largest_special_reorder_top_level():
    assert make_largest_special("101100") == "110010"


def test_make_largest_special_nested_reorder():
    assert make_largest_special("1101011000") == "1110010100"


def test_make_largest_special_already_largest():
    assert make_largest_special("111000") == "111000"
