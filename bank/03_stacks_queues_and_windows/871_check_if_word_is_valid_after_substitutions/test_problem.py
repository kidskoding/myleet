from solution import is_valid


def test_is_valid_nested_insert():
    assert is_valid("aabcbc") is True


def test_is_valid_longer_example():
    assert is_valid("abcabcababcc") is True


def test_is_valid_reversed_tail():
    assert is_valid("abccba") is False


def test_is_valid_single_abc():
    assert is_valid("abc") is True


def test_is_valid_single_letter():
    assert is_valid("a") is False


def test_is_valid_wrong_order():
    assert is_valid("cababc") is False
