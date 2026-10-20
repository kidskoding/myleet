from solution import min_operations


def test_min_operations_thirty_nine():
    assert min_operations(39) == 3


def test_min_operations_fifty_four():
    assert min_operations(54) == 3


def test_min_operations_one():
    assert min_operations(1) == 1


def test_min_operations_power_of_two():
    assert min_operations(64) == 1


def test_min_operations_run_of_ones():
    assert min_operations(7) == 2


def test_min_operations_three():
    assert min_operations(3) == 2
