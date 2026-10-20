from solution import eaten_apples


def test_eaten_apples_example_one():
    assert eaten_apples([1, 2, 3, 5, 2], [3, 2, 1, 4, 2]) == 7


def test_eaten_apples_example_two():
    assert eaten_apples([3, 0, 0, 0, 0, 2], [3, 0, 0, 0, 0, 2]) == 5


def test_eaten_apples_nothing_grows():
    assert eaten_apples([0, 0], [0, 0]) == 0


def test_eaten_apples_single_batch_limited_by_rot():
    assert eaten_apples([10], [3]) == 3


def test_eaten_apples_single_batch_limited_by_count():
    assert eaten_apples([2], [10]) == 2


def test_eaten_apples_prefers_batch_rotting_first():
    assert eaten_apples([2, 1], [10, 1]) == 3
