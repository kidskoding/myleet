from solution import count_quadruplets


def test_count_quadruplets_example_one():
    assert count_quadruplets([1, 3, 2, 4, 5]) == 2


def test_count_quadruplets_example_two():
    assert count_quadruplets([1, 2, 3, 4]) == 0


def test_count_quadruplets_reverseish():
    assert count_quadruplets([1, 4, 3, 2, 5]) == 3


def test_count_quadruplets_minimal():
    assert count_quadruplets([4, 3, 2, 1]) == 0
