from solution import create_target_array


def test_create_target_array_example_one():
    assert create_target_array([0, 1, 2, 3, 4], [0, 1, 2, 2, 1]) == [0, 4, 1, 3, 2]


def test_create_target_array_insert_at_front_last():
    assert create_target_array([1, 2, 3, 4, 0], [0, 1, 2, 3, 0]) == [0, 1, 2, 3, 4]


def test_create_target_array_single():
    assert create_target_array([1], [0]) == [1]


def test_create_target_array_always_front():
    assert create_target_array([1, 2, 3], [0, 0, 0]) == [3, 2, 1]
