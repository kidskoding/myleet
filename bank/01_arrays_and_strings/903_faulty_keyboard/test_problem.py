from solution import final_string


def test_final_string_one_reverse():
    assert final_string("string") == "rtsng"


def test_final_string_double_reverse_cancels():
    assert final_string("poiinter") == "ponter"


def test_final_string_no_i():
    assert final_string("abc") == "abc"


def test_final_string_ends_with_i():
    assert final_string("abi") == "ba"


def test_final_string_only_trailing_is():
    assert final_string("aii") == "a"
