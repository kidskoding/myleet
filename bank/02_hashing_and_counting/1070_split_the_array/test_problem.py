from solution import is_possible_to_split


def test_is_possible_to_split_true():
    assert is_possible_to_split([1, 1, 2, 2, 3, 4]) is True


def test_is_possible_to_split_all_same():
    assert is_possible_to_split([1, 1, 1, 1]) is False


def test_is_possible_to_split_two_distinct():
    assert is_possible_to_split([1, 2]) is True


def test_is_possible_to_split_pair():
    assert is_possible_to_split([1, 1]) is True


def test_is_possible_to_split_three_copies():
    assert is_possible_to_split([1, 1, 1, 2]) is False
