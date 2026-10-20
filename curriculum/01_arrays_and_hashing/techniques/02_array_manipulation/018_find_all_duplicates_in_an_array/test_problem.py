from solution import find_duplicates


def test_find_duplicates_normal():
    assert find_duplicates([4, 3, 2, 7, 8, 2, 3, 1]) == [2, 3]


def test_find_duplicates_single_element():
    assert find_duplicates([1]) == []


def test_find_duplicates_empty():
    assert find_duplicates([]) == []
