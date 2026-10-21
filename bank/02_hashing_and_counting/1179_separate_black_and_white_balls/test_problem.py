from solution import minimum_steps


def test_minimum_steps_example_one():
    assert minimum_steps("101") == 1


def test_minimum_steps_example_two():
    assert minimum_steps("100") == 2


def test_minimum_steps_example_three():
    assert minimum_steps("0111") == 0


def test_minimum_steps_all_ones():
    assert minimum_steps("1111") == 0


def test_minimum_steps_all_zeros():
    assert minimum_steps("000") == 0
