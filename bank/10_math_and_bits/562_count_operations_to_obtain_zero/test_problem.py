from solution import count_operations


def test_count_operations_example_one():
    assert count_operations(2, 3) == 3


def test_count_operations_equal():
    assert count_operations(10, 10) == 1


def test_count_operations_zero_first():
    assert count_operations(0, 5) == 0


def test_count_operations_zero_second():
    assert count_operations(5, 0) == 0


def test_count_operations_mixed_steps():
    assert count_operations(7, 3) == 5


def test_count_operations_long_run():
    assert count_operations(1, 100000) == 100000
