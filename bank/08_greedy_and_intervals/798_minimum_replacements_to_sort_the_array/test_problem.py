from solution import minimum_replacement


def test_minimum_replacement_middle_too_big():
    assert minimum_replacement([3, 9, 3]) == 2


def test_minimum_replacement_sorted():
    assert minimum_replacement([1, 2, 3, 4, 5]) == 0


def test_minimum_replacement_single():
    assert minimum_replacement([7]) == 0


def test_minimum_replacement_ends_with_one():
    assert minimum_replacement([5, 1]) == 4


def test_minimum_replacement_cascading_bounds():
    assert minimum_replacement([12, 9, 7, 6, 17, 19, 21]) == 6
