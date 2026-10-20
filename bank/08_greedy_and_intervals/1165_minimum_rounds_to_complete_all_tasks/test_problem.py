from solution import minimum_rounds


def test_minimum_rounds_example():
    assert minimum_rounds([2, 2, 3, 3, 2, 4, 4, 4, 4, 4]) == 4


def test_minimum_rounds_lonely_task():
    assert minimum_rounds([2, 3, 3]) == -1


def test_minimum_rounds_single_task():
    assert minimum_rounds([7]) == -1


def test_minimum_rounds_pair():
    assert minimum_rounds([5, 5]) == 1


def test_minimum_rounds_four_as_two_pairs():
    assert minimum_rounds([1, 1, 1, 1]) == 2


def test_minimum_rounds_seven():
    assert minimum_rounds([3] * 7) == 3
