from solution import max_number


def test_max_number_seven():
    assert max_number(7) == 3


def test_max_number_nine():
    assert max_number(9) == 7


def test_max_number_seventeen():
    assert max_number(17) == 15


def test_max_number_one():
    assert max_number(1) == 0


def test_max_number_power_of_two():
    assert max_number(8) == 7
