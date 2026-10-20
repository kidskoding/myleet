from solution import min_elements


def test_min_elements_negative_goal():
    assert min_elements([1, -1, 1], 3, -4) == 2


def test_min_elements_one_needed():
    assert min_elements([1, -10, 9, 1], 100, 0) == 1


def test_min_elements_already_at_goal():
    assert min_elements([1, 2], 3, 3) == 0


def test_min_elements_exact_multiple():
    assert min_elements([0], 5, -10) == 2


def test_min_elements_large_gap():
    assert min_elements([0], 1, 10**9) == 10**9
