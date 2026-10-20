from solution import count_elements


def test_count_elements_consecutive():
    assert count_elements([1, 2, 3]) == 2


def test_count_elements_no_successors():
    assert count_elements([1, 1, 3, 3, 5, 5, 7, 7]) == 0


def test_count_elements_duplicates_each_count():
    assert count_elements([1, 1, 2]) == 2


def test_count_elements_single():
    assert count_elements([1]) == 0


def test_count_elements_with_zero_and_repeats():
    assert count_elements([0, 1, 1, 2, 2, 3]) == 5
