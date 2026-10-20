from solution import is_valid


def test_is_valid_empty_string():
    assert is_valid("") is True


def test_is_valid_single_pair():
    assert is_valid("()") is True


def test_is_valid_mixed_brackets_true():
    assert is_valid("()[]{}") is True


def test_is_valid_nested_true():
    assert is_valid("{[]}") is True


def test_is_valid_unmatched_closing_false():
    assert is_valid("(]") is False


def test_is_valid_unclosed_opening_false():
    assert is_valid("(()") is False
