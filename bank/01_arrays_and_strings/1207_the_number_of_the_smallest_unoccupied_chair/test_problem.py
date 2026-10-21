from solution import smallest_chair


def test_smallest_chair_example_one():
    assert smallest_chair([[1, 4], [2, 3], [4, 6]], 1) == 1


def test_smallest_chair_example_two():
    assert smallest_chair([[3, 10], [1, 5], [2, 6]], 0) == 2


def test_smallest_chair_reuse():
    assert smallest_chair([[1, 2], [2, 3]], 1) == 0


def test_smallest_chair_target_first():
    assert smallest_chair([[4, 5], [1, 3], [2, 4]], 0) == 0
