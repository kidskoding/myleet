from solution import next_greater_element


def test_next_greater_element_normal_case():
    assert next_greater_element([4, 1, 2], [1, 3, 4, 2]) == [-1, 3, -1]


def test_next_greater_element_empty_nums1():
    assert next_greater_element([], [1, 2, 3]) == []


def test_next_greater_element_no_greater_found():
    assert next_greater_element([2], [3, 2, 1]) == [-1]
