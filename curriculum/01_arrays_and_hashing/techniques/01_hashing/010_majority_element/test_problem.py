from solution import majority_element


def test_majority_element_normal():
    assert majority_element([3, 2, 3]) == 3


def test_majority_element_longer():
    assert majority_element([2, 2, 1, 1, 1, 2, 2]) == 2


def test_majority_element_single():
    assert majority_element([1]) == 1
