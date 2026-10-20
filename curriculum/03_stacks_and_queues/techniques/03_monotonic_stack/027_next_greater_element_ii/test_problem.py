from solution import next_greater_elements


def test_next_greater_elements_circular_case():
    assert next_greater_elements([1, 2, 1]) == [2, -1, 2]


def test_next_greater_elements_single_element():
    assert next_greater_elements([5]) == [-1]


def test_next_greater_elements_empty():
    assert next_greater_elements([]) == []
