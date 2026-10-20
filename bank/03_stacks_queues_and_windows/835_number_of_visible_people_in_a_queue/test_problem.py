from solution import can_see_persons_count


def test_can_see_persons_count_example_mixed():
    assert can_see_persons_count([10, 6, 8, 5, 11, 9]) == [3, 1, 2, 1, 1, 0]


def test_can_see_persons_count_example_tall_end():
    assert can_see_persons_count([5, 1, 2, 3, 10]) == [4, 1, 1, 1, 0]


def test_can_see_persons_count_single():
    assert can_see_persons_count([7]) == [0]


def test_can_see_persons_count_increasing():
    assert can_see_persons_count([1, 2, 3]) == [1, 1, 0]


def test_can_see_persons_count_decreasing():
    assert can_see_persons_count([3, 2, 1]) == [1, 1, 0]
