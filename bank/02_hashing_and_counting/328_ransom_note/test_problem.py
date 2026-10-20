from solution import can_construct


def test_can_construct_missing_letter():
    assert can_construct("a", "b") is False


def test_can_construct_not_enough_copies():
    assert can_construct("aa", "ab") is False


def test_can_construct_enough_copies():
    assert can_construct("aa", "aab") is True


def test_can_construct_empty_note():
    assert can_construct("", "abc") is True


def test_can_construct_order_does_not_matter():
    assert can_construct("abc", "cba") is True


def test_can_construct_empty_magazine():
    assert can_construct("a", "") is False
