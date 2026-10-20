from solution import kth_largest_element


def test_kth_largest_element_normal():
    assert kth_largest_element([3, 2, 1, 5, 6, 4], 2) == 5


def test_kth_largest_element_with_duplicates():
    assert kth_largest_element([3, 2, 3, 1, 2, 4, 5, 5, 6], 4) == 4


def test_kth_largest_element_single():
    assert kth_largest_element([1], 1) == 1
