from solution import is_majority_element


def test_is_majority_element_true():
    assert is_majority_element([2, 4, 5, 5, 5, 5, 5, 6, 6], 5) is True


def test_is_majority_element_false():
    assert is_majority_element([10, 100, 101, 101], 101) is False


def test_is_majority_element_single():
    assert is_majority_element([1], 1) is True


def test_is_majority_element_missing():
    assert is_majority_element([1, 2, 3], 4) is False


def test_is_majority_element_exact_half():
    assert is_majority_element([1, 1, 2, 2], 1) is False
