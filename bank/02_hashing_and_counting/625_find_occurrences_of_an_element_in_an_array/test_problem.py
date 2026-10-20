from solution import occurrences_of_element


def test_occurrences_of_element_example():
    assert occurrences_of_element([1, 3, 1, 7], [1, 3, 2, 4], 1) == [0, -1, 2, -1]


def test_occurrences_of_element_absent():
    assert occurrences_of_element([1, 2, 3], [10], 5) == [-1]


def test_occurrences_of_element_all_match():
    assert occurrences_of_element([5, 5, 5], [1, 2, 3, 4], 5) == [0, 1, 2, -1]


def test_occurrences_of_element_repeated_query():
    assert occurrences_of_element([2, 9, 2], [2, 2, 1], 2) == [2, 2, 0]
