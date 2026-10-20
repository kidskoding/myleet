from solution import last_remaining


def test_last_remaining_example():
    assert last_remaining(9) == 6


def test_last_remaining_single():
    assert last_remaining(1) == 1


def test_last_remaining_two():
    assert last_remaining(2) == 2


def test_last_remaining_ten():
    assert last_remaining(10) == 8


def test_last_remaining_power_of_two():
    assert last_remaining(16) == 6


def test_last_remaining_large():
    assert last_remaining(1000000000) == 534765398
