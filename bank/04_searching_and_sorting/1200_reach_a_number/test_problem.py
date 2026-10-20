from solution import reach_number


def test_reach_number_example_two():
    assert reach_number(2) == 3


def test_reach_number_example_three():
    assert reach_number(3) == 2


def test_reach_number_negative():
    assert reach_number(-1) == 1


def test_reach_number_one():
    assert reach_number(1) == 1


def test_reach_number_needs_two_extra_steps():
    assert reach_number(5) == 5


def test_reach_number_large():
    assert reach_number(-1_000_000_000) == 44723
